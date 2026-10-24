// scripts/geo/build-geo.mjs — bakes the dot-matrix map's land masks (geo mode of the photo archive).
// Output: public/geo/world.png (whole earth) + public/geo/r/<id>.png (sharp close-ups, only around photo regions)
//         + country id maps (public/geo/countries.png, public/geo/r/<id>-c.png; loaded only when the country list is used)
//         + content/geo/masks.json (what exists, each mask's lon/lat box, country list + photos per country).
//         Re-run after adding/removing photos (regions + "visited" come from the photo manifest).
// Land masks = 8-bit grey PNG, value = land coverage (anti-aliased edge → smooth dot sizes on coasts). Equirectangular.
// Country maps = RGB PNG, no anti-aliasing, id = R + G·256 (0 = none); grown a few px into the sea so coastal dots
//         always resolve to a country.
// Data: Natural Earth 1:10m (public domain) — land + minor islands, minus lakes (Great Lakes etc.), admin-0 countries —
//       downloaded once from the natural-earth-vector repo and cached in node_modules/.cache/geo.
//       Override (tests): GEO_LAND_GEOJSON=<file>, GEO_COUNTRIES_GEOJSON=<file>.
// Deps (dev): d3-geo, sharp. Run: `pnpm geo`.

import { mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import path from "node:path";
import { geoArea, geoBounds, geoContains, geoEquirectangular, geoPath } from "d3-geo";
import sharp from "sharp";

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const CACHE = "node_modules/.cache/geo";
const MANIFEST = "content/photos/manifest.json";
const OUT_JSON = "content/geo/masks.json";
const OUT_DIR = "public/geo";

/** world mask width (height = /2). 2048 → 0.176°/px */
const WORLD_W = 2048;
/** close-up mask width; height follows the box's aspect */
const REGION_W = 1024;
/** photos within this many km form one region */
const REGION_KM = 150;
/** min region box size, degrees (close-up takes over below ~35° view span, so cover the surroundings) */
const REGION_MIN_DEG = 6;
/** padding around a region's photos, degrees */
const REGION_PAD_DEG = 0.8;
/** px a country map grows into the sea (covers coast mismatch between the land and country layers) */
const COUNTRY_GROW_PX = 4;

/** km between two lat/lon points */
function km(a, b) {
  const R = (d) => (d * Math.PI) / 180;
  const h = Math.sin(R(b.lat - a.lat) / 2) ** 2 + Math.cos(R(a.lat)) * Math.cos(R(b.lat)) * Math.sin(R(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Natural Earth layer (cached download) */
async function ne(name) {
  const file = path.join(CACHE, `${name}.geojson`);
  try {
    await access(file);
  } catch {
    process.stdout.write(`geo: downloading ${name} … `);
    const res = await fetch(NE + `${name}.geojson`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    console.log("ok");
  }
  return JSON.parse(await readFile(file, "utf8"));
}

/** d3-geo wants clockwise rings; files in the wild are often the other way → a polygon would cover the whole
 *  globe minus itself. Fix per polygon: anything bigger than a hemisphere gets its rings reversed. */
function rewind(fc) {
  const polys = fc.features.flatMap((f) =>
    !f.geometry ? [] : f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [],
  );
  return {
    type: "FeatureCollection",
    features: polys.map((rings) => {
      const g = { type: "Polygon", coordinates: rings };
      if (geoArea(g) > 2 * Math.PI) g.coordinates = rings.map((r) => [...r].reverse());
      return { type: "Feature", properties: {}, geometry: g };
    }),
  };
}

/** { land, water }: land = land + minor islands, water = lakes (painted back out) */
async function loadLayers() {
  if (process.env.GEO_LAND_GEOJSON) {
    return { land: rewind(JSON.parse(await readFile(process.env.GEO_LAND_GEOJSON, "utf8"))), water: null };
  }
  const [land, islands, lakes] = await Promise.all([ne("ne_10m_land"), ne("ne_10m_minor_islands"), ne("ne_10m_lakes")]);
  return {
    land: rewind({ type: "FeatureCollection", features: [...land.features, ...islands.features] }),
    water: rewind(lakes),
  };
}

/** d3 path generator for [lon0..lon1] × [lat1..lat0] (lat0 = north) on a w×h canvas */
function pathFor(box, w, h) {
  const kx = w / (box.lon1 - box.lon0); // px per degree (same both axes)
  const projection = geoEquirectangular()
    .scale((kx * 180) / Math.PI)
    .translate([-box.lon0 * kx, box.lat0 * kx])
    .clipExtent([[-2, -2], [w + 2, h + 2]]);
  return geoPath(projection).digits(2);
}

/** rasterise to a w×h grey PNG: land white, lakes black */
async function raster(layers, box, w, h, file) {
  const path = pathFor(box, w, h);
  const land = path(layers.land) ?? "";
  const water = layers.water ? (path(layers.water) ?? "") : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="100%" height="100%" fill="#000"/><path d="${land}" fill="#fff"/>` +
    (water ? `<path d="${water}" fill="#000"/>` : "") +
    `</svg>`;
  const buf = await sharp(Buffer.from(svg), { limitInputPixels: false })
    .removeAlpha()
    .toColourspace("b-w")
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, buf);
  return buf.length;
}

/** countries: sorted by name, id = index + 1 */
async function loadCountries() {
  const fc = process.env.GEO_COUNTRIES_GEOJSON
    ? JSON.parse(await readFile(process.env.GEO_COUNTRIES_GEOJSON, "utf8"))
    : await ne("ne_10m_admin_0_countries");
  const list = fc.features
    .filter((f) => f.geometry)
    .map((f) => {
      const p = f.properties ?? {};
      return { name: String(p.NAME ?? p.ADMIN ?? p.name ?? "?"), iso: String(p.ADM0_A3 ?? p.ISO_A3 ?? p.iso ?? ""), shape: rewind({ type: "FeatureCollection", features: [f] }) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  list.forEach((c, i) => {
    c.id = i + 1;
    c.bounds = geoBounds(c.shape);
  });
  if (list.length > 65535) throw new Error("geo: too many countries for a 16-bit id");
  return list;
}

/** country id map: every country filled with its id colour, no anti-aliasing, then grown into the sea */
async function rasterCountries(countries, box, w, h, file) {
  const path = pathFor(box, w, h);
  let body = "";
  for (const c of countries) {
    const d = path(c.shape);
    if (d) body += `<path d="${d}" fill="rgb(${c.id & 255},${c.id >> 8},0)"/>`;
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="#000"/>${body}</svg>`;
  const { data } = await sharp(Buffer.from(svg), { limitInputPixels: false }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // ids as numbers, then grow: each pass, an empty px takes a non-empty 4-neighbour's id
  let ids = new Uint16Array(w * h);
  for (let i = 0; i < w * h; i++) ids[i] = data[i * 3] + data[i * 3 + 1] * 256;
  for (let pass = 0; pass < COUNTRY_GROW_PX; pass++) {
    const next = ids.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (ids[i]) continue;
        next[i] = (x > 0 && ids[i - 1]) || (x < w - 1 && ids[i + 1]) || (y > 0 && ids[i - w]) || (y < h - 1 && ids[i + w]) || 0;
      }
    ids = next;
  }
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = ids[i] & 255;
    rgb[i * 3 + 1] = ids[i] >> 8;
  }
  const buf = await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
  await writeFile(file, buf);
  return { bytes: buf.length, ids, w, h, box };
}

/** which country a photo is in: exact polygon test, else the (grown) id map — catches coastal shots */
function countryOf(pt, countries, map) {
  const p = [pt.lon, pt.lat];
  for (const c of countries) {
    const [[x0, y0], [x1, y1]] = c.bounds;
    const inBox = (x0 <= x1 ? pt.lon >= x0 && pt.lon <= x1 : pt.lon >= x0 || pt.lon <= x1) && pt.lat >= y0 && pt.lat <= y1;
    if (inBox && geoContains(c.shape, p)) return c.id;
  }
  const k = map.w / (map.box.lon1 - map.box.lon0);
  const x = Math.min(map.w - 1, Math.max(0, Math.floor((pt.lon - map.box.lon0) * k)));
  const y = Math.min(map.h - 1, Math.max(0, Math.floor((map.box.lat0 - pt.lat) * k)));
  return map.ids[y * map.w + x] || 0;
}

/** group geotagged photos into regions (single-link within REGION_KM) */
function regions(photos) {
  const pts = photos.filter((p) => p.geo).map((p) => ({ lat: p.geo.lat, lon: p.geo.lon }));
  const groups = [];
  for (const p of pts) {
    const near = groups.filter((g) => g.some((q) => km(p, q) <= REGION_KM));
    if (!near.length) groups.push([p]);
    else {
      const merged = near.flat().concat(p);
      for (const g of near) groups.splice(groups.indexOf(g), 1);
      groups.push(merged);
    }
  }
  return groups.map((g, i) => {
    let lon0 = Math.min(...g.map((p) => p.lon)) - REGION_PAD_DEG;
    let lon1 = Math.max(...g.map((p) => p.lon)) + REGION_PAD_DEG;
    let lat1 = Math.min(...g.map((p) => p.lat)) - REGION_PAD_DEG;
    let lat0 = Math.max(...g.map((p) => p.lat)) + REGION_PAD_DEG;
    const grow = (a, b) => {
      const c = (a + b) / 2;
      const s = Math.max(b - a, REGION_MIN_DEG) / 2;
      return [c - s, c + s];
    };
    [lon0, lon1] = grow(lon0, lon1);
    [lat1, lat0] = grow(lat1, lat0);
    const r = (v) => Math.round(v * 1000) / 1000;
    return { id: `r${i}`, lon0: r(lon0), lon1: r(lon1), lat0: r(lat0), lat1: r(lat1), photos: g.length };
  });
}

const t0 = Date.now();
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const layers = await loadLayers();
const countries = await loadCountries();

await rm(path.join(OUT_DIR, "r"), { recursive: true, force: true });
await mkdir(path.join(OUT_DIR, "r"), { recursive: true });
await mkdir(path.dirname(OUT_JSON), { recursive: true });

const worldBox = { lon0: -180, lon1: 180, lat0: 90, lat1: -90 };
const worldBytes = await raster(layers, worldBox, WORLD_W, WORLD_W / 2, path.join(OUT_DIR, "world.png"));
console.log(`geo: world ${WORLD_W}×${WORLD_W / 2} · ${Math.round(worldBytes / 1024)} KB`);

const cmap = await rasterCountries(countries, worldBox, WORLD_W, WORLD_W / 2, path.join(OUT_DIR, "countries.png"));
console.log(`geo: countries ${countries.length} · ${Math.round(cmap.bytes / 1024)} KB`);

const out = [];
for (const r of regions(manifest.photos ?? [])) {
  const w = REGION_W;
  const h = Math.round((w * (r.lat0 - r.lat1)) / (r.lon1 - r.lon0));
  const src = `/geo/r/${r.id}.png`;
  const csrc = `/geo/r/${r.id}-c.png`;
  const bytes = await raster(layers, r, w, h, path.join(OUT_DIR, "r", `${r.id}.png`));
  const cbytes = (await rasterCountries(countries, r, w, h, path.join(OUT_DIR, "r", `${r.id}-c.png`))).bytes;
  out.push({ ...r, src, w, h, bytes, csrc, cbytes });
  console.log(`geo: ${r.id} ${r.photos} photos · ${(r.lon1 - r.lon0).toFixed(1)}°×${(r.lat0 - r.lat1).toFixed(1)}° · ${Math.round((bytes + cbytes) / 1024)} KB`);
}

// photos per country ("visited")
const frames = new Map();
for (const p of manifest.photos ?? []) {
  if (p.hidden || !p.geo) continue;
  const id = countryOf(p.geo, countries, cmap);
  if (id) frames.set(id, (frames.get(id) ?? 0) + 1);
}

const json = {
  world: { src: "/geo/world.png", ...worldBox, w: WORLD_W, h: WORLD_W / 2, bytes: worldBytes },
  regions: out,
  countries: {
    src: "/geo/countries.png",
    w: WORLD_W,
    h: WORLD_W / 2,
    bytes: cmap.bytes,
    // [id, name, iso, frames]
    list: countries.map((c) => [c.id, c.name, c.iso, frames.get(c.id) ?? 0]),
  },
};
await writeFile(OUT_JSON, JSON.stringify(json, null, 2).replace(/\[\n\s+(\d+),\n\s+("[^"]*"),\n\s+("[^"]*"),\n\s+(\d+)\n\s+\]/g, "[$1, $2, $3, $4]") + "\n");
console.log(
  `geo: ${out.length} regions · ${frames.size} countries visited → ${OUT_JSON} (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
);

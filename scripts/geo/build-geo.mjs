// scripts/geo/build-geo.mjs — bakes the dot-matrix map's land masks (geo mode of the photo archive).
// Output: public/geo/world.png (whole earth) + public/geo/r/<id>.png (sharp close-ups, only around photo regions)
//         + content/geo/masks.json (what exists + each mask's lon/lat box). Re-run after adding photos in new places.
// Masks = 8-bit grey PNG, value = land coverage (anti-aliased edge → smooth dot sizes on coasts). Equirectangular.
// Data: Natural Earth 1:10m (public domain) — land + minor islands, minus lakes (Great Lakes etc.) — downloaded once
//       from the natural-earth-vector repo and cached in node_modules/.cache/geo. Override: GEO_LAND_GEOJSON=<file>.
// Deps (dev): d3-geo, sharp. Run: `pnpm geo`.

import { mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import path from "node:path";
import { geoArea, geoEquirectangular, geoPath } from "d3-geo";
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

/** rasterise inside [lon0..lon1] × [lat1..lat0] (lat0 = north) to a w×h grey PNG: land white, lakes black */
async function raster(layers, box, w, h, file) {
  const kx = w / (box.lon1 - box.lon0); // px per degree (same both axes)
  const projection = geoEquirectangular()
    .scale((kx * 180) / Math.PI)
    .translate([-box.lon0 * kx, box.lat0 * kx])
    .clipExtent([[-2, -2], [w + 2, h + 2]]);
  const path = geoPath(projection).digits(2);
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

await rm(path.join(OUT_DIR, "r"), { recursive: true, force: true });
await mkdir(path.join(OUT_DIR, "r"), { recursive: true });
await mkdir(path.dirname(OUT_JSON), { recursive: true });

const worldBox = { lon0: -180, lon1: 180, lat0: 90, lat1: -90 };
const worldBytes = await raster(layers, worldBox, WORLD_W, WORLD_W / 2, path.join(OUT_DIR, "world.png"));
console.log(`geo: world ${WORLD_W}×${WORLD_W / 2} · ${Math.round(worldBytes / 1024)} KB`);

const out = [];
for (const r of regions(manifest.photos ?? [])) {
  const w = REGION_W;
  const h = Math.round((w * (r.lat0 - r.lat1)) / (r.lon1 - r.lon0));
  const src = `/geo/r/${r.id}.png`;
  const bytes = await raster(layers, r, w, h, path.join(OUT_DIR, "r", `${r.id}.png`));
  out.push({ ...r, src, w, h, bytes });
  console.log(`geo: ${r.id} ${r.photos} photos · ${(r.lon1 - r.lon0).toFixed(1)}°×${(r.lat0 - r.lat1).toFixed(1)}° · ${Math.round(bytes / 1024)} KB`);
}

const json = {
  world: { src: "/geo/world.png", ...worldBox, w: WORLD_W, h: WORLD_W / 2, bytes: worldBytes },
  regions: out,
};
await writeFile(OUT_JSON, JSON.stringify(json, null, 2) + "\n");
console.log(`geo: ${out.length} regions → ${OUT_JSON} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

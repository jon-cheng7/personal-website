// geo/places — photos → map data. Pure, computed once per photo list.
// Places = photos within PLACE_KM of each other (one lit dot each). Clusters = places merged in SCREEN space
// (so the world view shows one dot per area and zooming splits them). Journey = places in time order + km.

import type { Photo } from "@/content/photos";
import { placeShort } from "../format";
import type { View } from "./renderer";

const PLACE_KM = 12;

export type Place = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  photos: Photo[];
  /** earliest takenAt */
  first: string | null;
  last: string | null;
};

export type Cluster = {
  key: string;
  places: Place[];
  lat: number;
  lon: number;
  count: number;
  label: string;
};

export type Stop = { place: Place; at: string; km: number };

/** great-circle km */
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(R(b.lat - a.lat) / 2) ** 2 + Math.cos(R(a.lat)) * Math.cos(R(b.lat)) * Math.sin(R(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** most common non-empty label among photos */
function labelOf(photos: Photo[]) {
  const n = new Map<string, number>();
  for (const p of photos) if (p.place) n.set(placeShort(p), (n.get(placeShort(p)) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown place";
}

export function buildPlaces(photos: Photo[]): Place[] {
  const groups: Photo[][] = [];
  const centre = (g: Photo[]) => ({
    lat: g.reduce((s, p) => s + p.geo!.lat, 0) / g.length,
    lon: g.reduce((s, p) => s + p.geo!.lon, 0) / g.length,
  });
  for (const p of photos) {
    if (!p.geo) continue;
    const g = groups.find((g) => km(centre(g), p.geo!) <= PLACE_KM);
    if (g) g.push(p);
    else groups.push([p]);
  }
  return groups.map((g, i) => {
    const c = centre(g);
    const dates = g.map((p) => p.takenAt).filter((d): d is string => !!d).sort();
    return { id: `p${i}`, ...c, label: labelOf(g), photos: g, first: dates[0] ?? null, last: dates[dates.length - 1] ?? null };
  });
}

/** view → screen px (css) for a lon/lat; canvas css size w×h */
export function project(v: View, lon: number, lat: number, w: number, h: number) {
  const k = w / v.w;
  return { x: w / 2 + (lon - v.x) * k, y: h / 2 + (-lat - v.y) * k };
}

/** screen-space greedy merge: biggest place first absorbs neighbours within `px` */
export function cluster(places: Place[], v: View, w: number, h: number, px = 30): Cluster[] {
  const sorted = [...places].sort((a, b) => b.photos.length - a.photos.length);
  const pos = new Map(sorted.map((p) => [p.id, project(v, p.lon, p.lat, w, h)]));
  const used = new Set<string>();
  const out: Cluster[] = [];
  for (const p of sorted) {
    if (used.has(p.id)) continue;
    const a = pos.get(p.id)!;
    const members = sorted.filter((q) => !used.has(q.id) && Math.hypot(pos.get(q.id)!.x - a.x, pos.get(q.id)!.y - a.y) <= px);
    members.forEach((q) => used.add(q.id));
    const count = members.reduce((s, q) => s + q.photos.length, 0);
    out.push({
      key: members.map((q) => q.id).sort().join("+"),
      places: members,
      lat: members.reduce((s, q) => s + q.lat * q.photos.length, 0) / count,
      lon: members.reduce((s, q) => s + q.lon * q.photos.length, 0) / count,
      count,
      label: members.length > 1 ? `${p.label} +${members.length - 1}` : p.label,
    });
  }
  return out;
}

/** places in the order first visited (consecutive repeats collapsed), with cumulative km */
export function journey(places: Place[]): Stop[] {
  const visits = places
    .flatMap((pl) => pl.photos.filter((p) => p.takenAt).map((p) => ({ pl, at: p.takenAt! })))
    .sort((a, b) => a.at.localeCompare(b.at));
  const stops: Stop[] = [];
  for (const v of visits) {
    const last = stops[stops.length - 1];
    if (last?.place === v.pl) continue;
    stops.push({ place: v.pl, at: v.at, km: last ? last.km + km(last.place, v.pl) : 0 });
  }
  return stops;
}

/** lon/lat bounds of places (+ padding), as a view for a w×h canvas */
export function fitView(pts: { lat: number; lon: number }[], w: number, h: number, minSpan = 1.6, fill = 0.7): View {
  const lons = pts.map((p) => p.lon);
  const lats = pts.map((p) => p.lat);
  const cx = (Math.min(...lons) + Math.max(...lons)) / 2;
  const cy = -(Math.min(...lats) + Math.max(...lats)) / 2;
  const sx = Math.max(Math.max(...lons) - Math.min(...lons), minSpan);
  const sy = Math.max(Math.max(...lats) - Math.min(...lats), minSpan * (h / w));
  return { x: cx, y: cy, w: Math.min(360, Math.max(sx / fill, ((sy / fill) * w) / h)) };
}

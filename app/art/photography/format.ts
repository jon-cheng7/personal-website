// Photo archive formatting, filtering, sorting, stats.
// Fits: every archive view + the /art landing drawers. Pure functions, no React.

import type { Photo } from "@/content/photos";

export type View = "index" | "geo" | "gallery";
export const VIEWS: View[] = ["index", "geo", "gallery"];
export const parseView = (v: string | null | undefined): View => (VIEWS.includes(v as View) ? (v as View) : "index");

export type SortKey = "date" | "place" | "focal" | "aperture" | "shutter" | "iso";
export type Sort = { key: SortKey; dir: 1 | -1 };
export const DEFAULT_SORT: Sort = { key: "date", dir: -1 };

const DASH = "—";

/** 7 → "007" */
export const pad = (n: number, w = 3) => String(n).padStart(w, "0");

export const fmtDate = (t: string | null) => (t ? t.slice(0, 10).replace(/-/g, ".") : DASH);
export const fmtTime = (t: string | null) => (t ? t.slice(11, 19) : DASH);
/** "-04:00" → "UTC−04:00" */
export const fmtOffset = (t: string | null) => (t && t.length > 19 ? `UTC${t.slice(19).replace("-", "−")}` : "");

export const fmtFocal = (f: number | null) => (f == null ? DASH : `${Math.round(f)}mm`);
export const fmtAperture = (a: number | null) => (a == null ? DASH : `f/${+a.toFixed(1)}`);
/** 0.0025 → "1/400" · 1.3 → 1.3″ */
export const fmtShutter = (s: number | null) =>
  s == null ? DASH : s >= 0.3 ? `${+s.toFixed(1)}″` : `1/${Math.round(1 / s)}`;
export const fmtIso = (i: number | null) => (i == null ? DASH : `ISO ${i}`);

/** fixed width for odometers: "52.973°N" / "009.430°W" */
export const fmtLat = (v: number) => `${Math.abs(v).toFixed(3).padStart(6, "0")}°${v >= 0 ? "N" : "S"}`;
export const fmtLon = (v: number) => `${Math.abs(v).toFixed(3).padStart(7, "0")}°${v >= 0 ? "E" : "W"}`;

const COUNTRY_SHORT: Record<string, string> = {
  "People's Republic of China": "China",
  "United States of America": "USA",
  "United States": "USA",
  "United Kingdom": "UK",
};
export const country = (p: Photo) => (p.place?.country ? (COUNTRY_SHORT[p.place.country] ?? p.place.country) : null);

/** "Athens, Greece" style, shortened country */
export const placeShort = (p: Photo) => {
  if (!p.place) return "Unknown location";
  return [p.place.city ?? p.place.region, country(p)].filter(Boolean).join(", ");
};
/** most specific → least, for the monitor */
export const placeLong = (p: Photo) =>
  p.place ? [p.place.sublocation, p.place.city, p.place.region, country(p)].filter(Boolean).join(" / ") : "Unknown location";

/** upper-cased file name, "DSC04631.JPG" */
export const fileLabel = (p: Photo) => p.file.toUpperCase();

/** filter: every whitespace token must appear somewhere in the photo's text */
export function matches(p: Photo, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    p.id, p.file, fmtDate(p.takenAt), p.takenAt, placeLong(p), p.lens, p.camera,
    fmtFocal(p.exposure.focalLength), fmtAperture(p.exposure.aperture), fmtShutter(p.exposure.shutter), fmtIso(p.exposure.iso),
    p.title, p.caption, ...p.keywords,
  ].filter(Boolean).join(" ").toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

const sortValue: Record<SortKey, (p: Photo) => string | number | null> = {
  date: (p) => p.takenAt,
  place: (p) => (p.place ? placeShort(p).toLowerCase() : null),
  focal: (p) => p.exposure.focalLength,
  aperture: (p) => p.exposure.aperture,
  shutter: (p) => p.exposure.shutter,
  iso: (p) => p.exposure.iso,
};

/** stable sort; missing values always last; ties → newest first */
export function sortPhotos(list: Photo[], { key, dir }: Sort) {
  const get = sortValue[key];
  return [...list].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return c * dir || (b.takenAt ?? "").localeCompare(a.takenAt ?? "");
  });
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "JUN 2026 — AUG 2026" collapsed to "JUN–AUG 2026" when same year */
function span(dates: string[]) {
  if (!dates.length) return DASH;
  const sorted = [...dates].sort();
  const [a, b] = [sorted[0], sorted[sorted.length - 1]];
  const m = (d: string) => MONTHS[+d.slice(5, 7) - 1];
  const y = (d: string) => d.slice(0, 4);
  if (y(a) === y(b)) return m(a) === m(b) ? `${m(a)} ${y(a)}` : `${m(a)}–${m(b)} ${y(a)}`;
  return `${m(a)} ${y(a)} – ${m(b)} ${y(b)}`;
}

/** headline numbers for drawers / HUD */
export function archiveStats(list: Photo[]) {
  const places = new Set(list.map((p) => p.place && placeShort(p)).filter(Boolean));
  const countries = new Set(list.map(country).filter(Boolean));
  const lenses = new Set(list.map((p) => p.lens).filter(Boolean));
  return {
    frames: list.length,
    places: places.size,
    countries: countries.size,
    lenses: lenses.size,
    span: span(list.map((p) => p.takenAt).filter((d): d is string => !!d)),
  };
}

/** [country, frames] by count desc — geo standby readout */
export function framesByCountry(list: Photo[]) {
  const m = new Map<string, number>();
  for (const p of list) {
    const c = country(p) ?? "Unknown";
    m.set(c, (m.get(c) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

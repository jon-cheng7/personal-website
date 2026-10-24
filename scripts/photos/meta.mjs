// scripts/photos/meta — embedded metadata → manifest fields.
// EXIF (date, camera, exposure, GPS) + IPTC/XMP (place names, title, alt, rating, keywords; null until filled in Lightroom).

import exifr from "exifr";

const R = (d) => (d * Math.PI) / 180;

/** km between points (haversine) */
function distKm(a, b) {
  const h = Math.sin(R(b.lat - a.lat) / 2) ** 2 + Math.cos(R(a.lat)) * Math.cos(R(b.lat)) * Math.sin(R(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** exifr Date (built in local tz) → camera wall time "YYYY-MM-DDTHH:mm:ss[+offset]" */
function wallTime(d, offset) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  const p = (n) => String(n).padStart(2, "0");
  const s = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return offset ? s + offset : s;
}

/** XMP lang-alt / plain → string */
const text = (v) => (v == null ? null : typeof v === "object" ? (v.value ?? null) : String(v));

/** rounded coords, or null (missing / private zone) */
function geo(m, { coordDecimals, privateZones }) {
  if (typeof m.latitude !== "number" || typeof m.longitude !== "number") return null;
  const pt = { lat: m.latitude, lon: m.longitude };
  if (privateZones.some((z) => distKm(pt, z) <= z.radiusKm)) return null;
  const f = 10 ** coordDecimals;
  return { lat: Math.round(pt.lat * f) / f, lon: Math.round(pt.lon * f) / f };
}

/** master file → metadata fields */
export async function readMeta(abs, config) {
  const m = (await exifr.parse(abs, { tiff: true, exif: true, gps: true, iptc: true, xmp: true }).catch(() => null)) ?? {};

  const place = {
    sublocation: text(m.Sublocation ?? m.Location),
    city: text(m.City),
    region: text(m.State ?? m["Province-State"]),
    country: text(m.Country ?? m["Country-PrimaryLocationName"]),
  };
  const label = [place.city, place.country].filter(Boolean).join(", ");

  return {
    takenAt: wallTime(m.DateTimeOriginal ?? m.CreateDate, m.OffsetTimeOriginal),
    geo: geo(m, config),
    place: label ? { ...place, label } : null,
    camera: [m.Make, m.Model].filter(Boolean).join(" ") || null,
    lens: m.LensModel ?? null,
    exposure: {
      focalLength: m.FocalLength ?? null,
      aperture: m.FNumber ?? null,
      shutter: m.ExposureTime ?? null,
      iso: m.ISO ?? null,
    },
    title: text(m.title ?? m.ObjectName),
    caption: text(m.description ?? m.Caption ?? m.ImageDescription),
    alt: text(m.AltTextAccessibility),
    rating: typeof m.Rating === "number" && m.Rating > 0 ? m.Rating : null,
    keywords: [m.subject ?? m.Keywords ?? []].flat().map(text).filter(Boolean),
  };
}

// Photo gallery data — the site's only door to photos.
// Fits: generated content/photos/manifest.json (`pnpm photos`, don't hand-edit) + content/photos/overrides.json (hand edits, no re-sync).
// Image origin: NEXT_PUBLIC_PHOTOS_URL (R2 domain in prod; default = local dev copies in public/photos-cdn).

import manifest from "./photos/manifest.json";
import overridesJson from "./photos/overrides.json";

export type Photo = {
  id: string;
  version: string;
  file: string;
  width: number;
  height: number;
  widths: number[];
  formats: string[];
  color: string;
  placeholder: string;
  takenAt: string | null; // camera wall time
  geo: { lat: number; lon: number } | null;
  place: { sublocation: string | null; city: string | null; region: string | null; country: string | null; label: string } | null;
  camera: string | null;
  lens: string | null;
  exposure: { focalLength: number | null; aperture: number | null; shutter: number | null; iso: number | null };
  title: string | null;
  caption: string | null;
  alt: string | null;
  rating: number | null;
  keywords: string[];
  // overrides-only
  featured?: boolean;
  hidden?: boolean;
};

/** hand edits keyed by id. Wins over embedded metadata */
export type PhotoOverride = Partial<Pick<Photo, "title" | "caption" | "alt" | "rating" | "keywords" | "featured" | "hidden">>;

const BASE = (process.env.NEXT_PUBLIC_PHOTOS_URL ?? "/photos-cdn").replace(/\/$/, "");
const data = manifest as unknown as { keyPrefix?: string; photos?: Photo[] };
const PREFIX = data.keyPrefix ?? "photos";
const overrides = overridesJson as Record<string, PhotoOverride>;

/** every visible photo, newest first */
export const photos: Photo[] = (data.photos ?? [])
  .map((p) => ({ ...p, ...overrides[p.id] }))
  .filter((p) => !p.hidden);

export const getPhoto = (id: string) => photos.find((p) => p.id === id);

/** with usable coords — map mode */
export const geotagged = () => photos.filter((p) => p.geo);

/** variant URL. width defaults to closest ≥ 1600 */
export function photoUrl(p: Photo, format = "webp", width?: number) {
  const w = width ?? p.widths.find((x) => x >= 1600) ?? p.widths[p.widths.length - 1];
  return `${BASE}/${PREFIX}/${p.id}/${p.version}/${w}.${format}`;
}

/** srcset string for one format */
export const srcSet = (p: Photo, format: string) => p.widths.map((w) => `${photoUrl(p, format, w)} ${w}w`).join(", ");

/** alt text, fallback until written in Lightroom / overrides */
export const altFor = (p: Photo) =>
  p.alt ?? `Photograph${p.place ? ` taken in ${p.place.label}` : ""}${p.takenAt ? `, ${p.takenAt.slice(0, 4)}` : ""}`;

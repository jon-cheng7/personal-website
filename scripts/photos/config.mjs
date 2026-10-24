// scripts/photos/config — photo pipeline settings (masters folder → variants → store → manifest).
// Encode settings (widths/formats/sharpen) feed each photo's version hash: change one → all re-encode on next sync.
// Paths/secrets come from .env.local (see README).

export const config = {
  /** Lightroom export folder (source of truth). Absolute path, from env */
  mastersDir: process.env.PHOTOS_MASTERS_DIR,
  /** "local" → public/photos-cdn (dev) · "r2" → Cloudflare R2 bucket */
  target: process.env.PHOTOS_TARGET ?? "local",
  localDir: "public/photos-cdn",
  manifestFile: "content/photos/manifest.json",
  keyPrefix: "photos",

  exts: [".jpg", ".jpeg", ".tif", ".tiff", ".png", ".webp"],

  // --- encode (versioned) ---
  /** srcset widths, px. Never upscaled past the master */
  widths: [480, 960, 1600, 2400, 3200, 3840],
  formats: {
    avif: { quality: 62, effort: 3, chromaSubsampling: "4:4:4" }, // effort 3: ~7× faster than 5, ~4% bigger,
    webp: { quality: 84, effort: 4, smartSubsample: true },
  },
  /** post-resize sharpen, per variant. Raise sigma if smaller sizes read soft */
  sharpen: { sigma: 0.5, m1: 0.6, m2: 1.5 },
  placeholderWidth: 24,

  // --- run ---
  /** photos encoded in parallel (each already multi-threaded) */
  concurrency: 2,
  cacheControl: "public, max-age=31536000, immutable",

  // --- privacy ---
  /** manifest coords rounded to N decimals (3 ≈ 110 m). Variants never carry GPS */
  coordDecimals: 3,
  /** inside any zone → geo dropped. { lat, lon, radiusKm } */
  privateZones: [
    // { lat: 43.8219, lon: -80.3032, radiusKm: 1 }, // home
  ],
};

/** fields that change pixels → part of version hash */
export const encodeSettings = ({ widths, formats, sharpen, placeholderWidth }) => ({ widths, formats, sharpen, placeholderWidth });

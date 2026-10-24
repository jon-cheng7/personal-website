// scripts/photos/variants — master → responsive AVIF/WebP set + placeholder + dominant color.
// Decodes the 24 MP master once → largest width as raw pixels → every smaller size from that (fast, lanczos).
// Output carries no metadata (GPS stripped); converted to sRGB with embedded profile.

import sharp from "sharp";

const MIME = { avif: "image/avif", webp: "image/webp" };

/** widths to emit for a master of width w (no upscaling; tiny masters → own width; fullRes → + w itself) */
export function widthsFor(w, widths, fullRes = false) {
  const fit = widths.filter((x) => x <= w);
  if (!fit.length) return [w];
  if (fullRes && w > fit[fit.length - 1]) fit.push(w);
  return fit;
}

/** encode all variants. → { width, height, widths, files[{ name, buffer, contentType }], placeholder, color } */
export async function encode(abs, { widths, fullRes, formats, sharpen, placeholderWidth }) {
  // master → oriented sRGB, size it once
  const meta = await sharp(abs).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;
  const outWidths = widthsFor(width, widths, fullRes);
  const top = outWidths.at(-1);

  const { data, info } = await sharp(abs)
    .rotate()
    .toColourspace("srgb")
    .resize({ width: top, kernel: "lanczos3", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: info.channels } };
  const from = () => sharp(data, raw);

  const files = [];
  for (const w of outWidths) {
    for (const [fmt, opts] of Object.entries(formats)) {
      let img = from();
      if (w !== info.width) img = img.resize({ width: w, kernel: "lanczos3" });
      const buffer = await img.sharpen(sharpen).withIccProfile("srgb")[fmt](opts).toBuffer();
      files.push({ name: `${w}.${fmt}`, buffer, contentType: MIME[fmt] });
    }
  }

  const ph = await from().resize({ width: placeholderWidth }).webp({ quality: 40 }).toBuffer();
  const { dominant: d } = await from().stats();
  const hex = (n) => n.toString(16).padStart(2, "0");

  return {
    width,
    height,
    widths: outWidths,
    files,
    placeholder: `data:image/webp;base64,${ph.toString("base64")}`,
    color: `#${hex(d.r)}${hex(d.g)}${hex(d.b)}`,
  };
}

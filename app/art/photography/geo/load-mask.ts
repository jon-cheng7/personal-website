// geo/load-mask — fetch a mask PNG with byte progress, decode off the main thread (createImageBitmap).
// Fits: GeoView boot (world) + lazy region close-ups. `total` = expected bytes from masks.json
// (Content-Length is unreliable behind compression). Cached per URL for the session.

const cache = new Map<string, Promise<ImageBitmap>>();

export function loadMask(src: string, total: number, onProgress?: (p: number) => void): Promise<ImageBitmap> {
  const hit = cache.get(src);
  if (hit) {
    onProgress?.(1);
    return hit;
  }
  const job = (async () => {
    const res = await fetch(src);
    if (!res.ok || !res.body) throw new Error(`mask ${src}: ${res.status}`);
    const size = Number(res.headers.get("content-length")) || total || 1;
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      onProgress?.(Math.min(0.99, got / size));
    }
    const bmp = await createImageBitmap(new Blob(parts as BlobPart[], { type: "image/png" }), {
      colorSpaceConversion: "none",
      premultiplyAlpha: "none",
    });
    onProgress?.(1);
    return bmp;
  })();
  cache.set(src, job);
  job.catch(() => cache.delete(src));
  return job;
}

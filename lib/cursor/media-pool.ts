// Capped LRU pool of kept-alive <img>/<video> for media cursor previews.
// Fits: GlobalCursor media content.

export type PooledMediaKind = "image" | "video";

interface PoolEntry {
  el: HTMLImageElement | HTMLVideoElement;
  kind: PooledMediaKind;
  lastUsed: number;
}

/** Max pooled elements. */
const POOL_CAP = 6;

const pool = new Map<string, PoolEntry>();

function evictLeastRecentlyUsed(): void {
  if (pool.size <= POOL_CAP) return;
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  pool.forEach((entry, key) => {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestKey = key;
    }
  });
  if (oldestKey === null) return;
  const entry = pool.get(oldestKey);
  if (!entry) return;
  if (entry.kind === "video") {
    const video = entry.el as HTMLVideoElement;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  entry.el.remove();
  pool.delete(oldestKey);
}

/** Get or create by src; evicts LRU past cap. */
export function getPooledMedia(
  src: string,
  kind: PooledMediaKind,
): HTMLImageElement | HTMLVideoElement {
  const existing = pool.get(src);
  if (existing) {
    existing.lastUsed = performance.now();
    return existing.el;
  }

  const el = kind === "video" ? document.createElement("video") : document.createElement("img");
  if (kind === "video") {
    const video = el as HTMLVideoElement;
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = "metadata";
    video.src = src;
  } else {
    (el as HTMLImageElement).src = src;
    (el as HTMLImageElement).alt = "";
  }
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.objectFit = "cover";
  el.style.display = "block";

  pool.set(src, { el, kind, lastUsed: performance.now() });
  evictLeastRecentlyUsed();
  return el;
}

/** Active preview: load + play. */
export function playPooledVideo(src: string): void {
  const entry = pool.get(src);
  if (!entry || entry.kind !== "video") return;
  const video = entry.el as HTMLVideoElement;
  video.preload = "auto";
  void video.play().catch(() => {
  });
}

/** Inactive: pause, keep. */
export function pausePooledVideo(src: string): void {
  const entry = pool.get(src);
  if (entry && entry.kind === "video") {
    (entry.el as HTMLVideoElement).pause();
  }
}

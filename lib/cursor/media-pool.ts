/**
 * A small, capped pool of kept-alive `<img>`/`<video>` elements, addressed
 * by `src` — see the project doc's "Media handling strategy." Exists so
 * repeatedly hovering the same (or a handful of different) media-preview
 * targets never re-mounts/re-decodes an element from scratch; a genuinely
 * new source creates one more pooled element, evicting the least-recently-
 * used past the cap.
 *
 * This module only tracks *existence* and recency — it deliberately
 * doesn't attach elements to the DOM itself. The caller (global-cursor.tsx)
 * is responsible for appending/removing the returned element from its own
 * content layer, since that's a rendering concern this module shouldn't
 * need to know about.
 */

export type PooledMediaKind = "image" | "video";

interface PoolEntry {
  el: HTMLImageElement | HTMLVideoElement;
  kind: PooledMediaKind;
  lastUsed: number;
}

// A guess pending real project content to test against — see the
// architecture doc's own "bottlenecks" section.
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

/** Returns a kept-alive element for `src`, creating and pooling one on
 * first use. Always returns the same element for the same `src` on
 * subsequent calls (recency-bumped), so toggling visibility is all a
 * caller needs to do for an already-seen source. */
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
    // Only "metadata" until this becomes the active mode (see
    // pausePooledVideo/playPooledVideo below) — a pooled-but-inactive
    // video shouldn't be decoding frames in the background.
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

/** Call when a video-media mode becomes the active cursor content — bumps
 * it to full preload and starts playback. No-op for an image `src` or one
 * not currently pooled. */
export function playPooledVideo(src: string): void {
  const entry = pool.get(src);
  if (!entry || entry.kind !== "video") return;
  const video = entry.el as HTMLVideoElement;
  video.preload = "auto";
  void video.play().catch(() => {
    // Autoplay can be rejected (e.g. no user gesture yet on some
    // browsers) — the cursor's media mode degrades to a static poster
    // frame or a blank preview rather than throwing, since a rejected
    // play() is a normal, expected outcome here, not a real error.
  });
}

/** Call when a video-media mode stops being the active cursor content —
 * pauses it (stops decoding) without evicting it from the pool, so it
 * stays warm for the next hover. */
export function pausePooledVideo(src: string): void {
  const entry = pool.get(src);
  if (entry && entry.kind === "video") {
    (entry.el as HTMLVideoElement).pause();
  }
}

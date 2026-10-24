import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP fallback — next/image will still serve the best
    // format a given browser supports.
    formats: ["image/avif", "image/webp"],
  },
  // Map masks (pnpm geo) keep fixed filenames, so they can't be cached forever — cache for an hour, then
  // serve the cached copy while revalidating in the background (a re-run of pnpm geo shows up within the hour).
  async headers() {
    return [
      {
        source: "/geo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP fallback — next/image will still serve the best
    // format a given browser supports.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;

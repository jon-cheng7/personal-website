// /art/photography — the photo archive (index / geo / gallery + META).
// Fits: static page; PhotoArchive (client) owns everything. ?view / ?photo read client-side so the page stays static:
// prerender = default view (fallback), real URL params applied on hydration.

import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotoArchive } from "./photo-archive";
import { PhotoArchiveFromUrl } from "./photo-archive-from-url";

export const metadata: Metadata = {
  title: "Photography — Jon Cheng",
  description: "Photo archive: index, map and gallery views with camera metadata.",
};

export default function PhotographyPage() {
  return (
    <Suspense fallback={<PhotoArchive />}>
      <PhotoArchiveFromUrl />
    </Suspense>
  );
}

"use client";

// Reads ?view / ?photo once and hands them to PhotoArchive.
// Fits: page.tsx inside <Suspense> (useSearchParams keeps the rest of the page static).

import { useSearchParams } from "next/navigation";
import { PhotoArchive } from "./photo-archive";

export function PhotoArchiveFromUrl() {
  const params = useSearchParams();
  return <PhotoArchive initialView={params.get("view")} initialPhoto={params.get("photo")} />;
}

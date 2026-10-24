"use client";

// GalleryView — barebones square grid (custom gallery comes later). META on → mini viewfinder per tile.
// Tiles "scan out" under the HUD (archive.css; JS fallback via useScrollOut).
// Fits: PhotoArchive view "gallery". Click → viewer.

import { useRef } from "react";
import { Photo } from "@/components/ui/photo";
import type { Photo as PhotoData } from "@/content/photos";
import { placeShort } from "./format";
import { useScrollOut } from "./use-scroll-out";
import { ViewfinderHud } from "./viewfinder-hud";

type Props = {
  photos: PhotoData[];
  meta: boolean;
  onOpen: (id: string) => void;
};

/** grid column widths → which image size the browser fetches */
const SIZES = "(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw";

export function GalleryView({ photos, meta, onOpen }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  useScrollOut(ref, ".gal > li", ".hud", photos);
  return (
    <ul ref={ref} className="gal">
      {photos.map((p, i) => (
        <li key={p.id}>
          <button type="button" className="gal__tile" data-vt-id={p.id} aria-label={`Open ${placeShort(p)}`} onClick={() => onOpen(p.id)}>
            <Photo photo={p} sizes={SIZES} aspect="1" priority={i < 4} />
            <ViewfinderHud photo={p} on={meta} variant="mini" />
          </button>
        </li>
      ))}
    </ul>
  );
}

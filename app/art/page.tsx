// /art — photography index, first pass: every photo, newest first, square grid.
// Fits: PageShell content page; data from content/photos (`pnpm photos`). Real gallery modes come later.

import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { Photo } from "@/components/ui/photo";
import { photos } from "@/content/photos";
import "./art.css";

export const metadata: Metadata = {
  title: "Art — Jon Cheng",
};

/** grid column widths → which image size the browser fetches */
const GRID_SIZES = "(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw";

export default function ArtPage() {
  return (
    <PageShell>
      <h1>Art</h1>
      {photos.length === 0 ? (
        <p>
          No photos yet — run <code>pnpm photos</code>.
        </p>
      ) : (
        <ul className="art-grid">
          {photos.map((p, i) => (
            <li key={p.id}>
              <Photo photo={p} sizes={GRID_SIZES} aspect="1" priority={i < 4} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

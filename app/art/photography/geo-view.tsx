"use client";

// GeoView — placeholder until the dot-matrix map lands: "calibrating" panel + frames-per-country bars.
// Fits: PhotoArchive view "geo". Data is real (manifest geo/place), so this stays honest while the map is built.

import type { CSSProperties } from "react";
import type { Photo } from "@/content/photos";
import { framesByCountry, pad } from "./format";

export function GeoView({ photos }: { photos: Photo[] }) {
  const rows = framesByCountry(photos);
  const max = rows[0]?.[1] ?? 1;
  const fixed = photos.filter((p) => p.geo).length;

  return (
    <div className="geo">
      <p className="geo__status">
        <span className="geo__led" aria-hidden /> GEO // CALIBRATING — MAP MODULE OFFLINE
      </p>
      <p className="geo__sub">
        {pad(fixed)} OF {pad(photos.length)} FRAMES HAVE A GPS FIX · {pad(rows.length, 2)} COUNTRIES
      </p>
      <ul className="geo__bars">
        {rows.map(([name, n], i) => (
          <li key={name} style={{ "--w": n / max, "--i": i } as CSSProperties}>
            <span className="geo__name">{name.toUpperCase()}</span>
            <span className="geo__bar" aria-hidden />
            <span className="geo__n">{pad(n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

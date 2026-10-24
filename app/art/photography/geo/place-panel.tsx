"use client";

// geo/place-panel — "contact strip" for a picked map cluster: frames appear as 1-bit lime dithers,
// then develop into the real photo one by one. Click a frame → viewer; "view in index" → filtered archive.
// Dither source = the manifest's tiny base64 placeholder (same-origin → no CORS/canvas taint, zero network).

import { useEffect, useRef, type CSSProperties } from "react";
import { photoUrl, type Photo } from "@/content/photos";
import { fmtDate, pad } from "../format";
import type { Cluster } from "./places";

/** Bayer 4×4 thresholds */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const DITHER_PX = 40;

/** placeholder → 1-bit lime pixels on a DITHER_PX canvas */
function dither(canvas: HTMLCanvasElement, src: string, rgb: [number, number, number]) {
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const n = DITHER_PX;
    canvas.width = canvas.height = n;
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n);
    const data = ctx.getImageData(0, 0, n, n);
    const d = data.data;
    for (let i = 0; i < n * n; i++) {
      const l = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      const on = l > BAYER[((i / n) & 3) * 4 + ((i % n) & 3)];
      d[i * 4] = rgb[0];
      d[i * 4 + 1] = rgb[1];
      d[i * 4 + 2] = rgb[2];
      d[i * 4 + 3] = on ? 255 : 0;
    }
    ctx.putImageData(data, 0, 0);
  };
  img.src = src;
}

function Frame({ photo, i, onOpen }: { photo: Photo; i: number; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (ref.current) dither(ref.current, photo.placeholder, [197, 251, 69]);
  }, [photo.placeholder]);

  // develop once the real image is decoded (and its stagger slot has come)
  const onLoad = () => imgRef.current?.parentElement?.setAttribute("data-dev", "");

  return (
    <li style={{ "--i": i } as CSSProperties}>
      <button type="button" className="gp__frame" onClick={() => onOpen(photo.id)} aria-label={`Open frame ${pad(i + 1)}`}>
        <canvas ref={ref} className="gp__dither" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-built thumbnail */}
        <img ref={imgRef} className="gp__img" src={photoUrl(photo, "webp", photo.widths[0])} alt="" loading="lazy" decoding="async" draggable={false} onLoad={onLoad} />
        <span className="gp__no">{pad(i + 1)}</span>
      </button>
    </li>
  );
}

type Props = {
  cluster: Cluster;
  onOpen: (id: string) => void;
  onFilter: (query: string) => void;
  onClose: () => void;
};

export function PlacePanel({ cluster, onOpen, onFilter, onClose }: Props) {
  const photos = cluster.places.flatMap((p) => p.photos).sort((a, b) => (a.takenAt ?? "").localeCompare(b.takenAt ?? ""));
  const first = photos.find((p) => p.takenAt)?.takenAt ?? null;
  const last = [...photos].reverse().find((p) => p.takenAt)?.takenAt ?? null;
  const name = cluster.places[0].label;

  return (
    <aside className="gp" aria-label={`${cluster.label} — ${cluster.count} frames`}>
      <header className="gp__head">
        <div>
          <p className="gp__title">{cluster.label.toUpperCase()}</p>
          <p className="gp__sub">
            {pad(cluster.count)} FRAMES · {fmtDate(first)}
            {last && last.slice(0, 10) !== first?.slice(0, 10) ? ` → ${fmtDate(last)}` : ""}
          </p>
        </div>
        <button type="button" className="gp__x" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <ul className="gp__grid">
        {photos.map((p, i) => (
          <Frame key={p.id} photo={p} i={i} onOpen={onOpen} />
        ))}
      </ul>
      <button type="button" className="gp__index" onClick={() => onFilter(name.split(",")[0])}>
        VIEW IN INDEX →
      </button>
    </aside>
  );
}

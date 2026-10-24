"use client";

// ViewfinderHud — META overlay: corner brackets draw in, scanline sweeps, readouts decode as it passes.
// Fits: over any photo box (index monitor, viewer = "full"; gallery tiles = "mini"). Parent box must be position: relative.
// `on` = META state. New photo while on → re-sweep + re-decode; off → readouts frozen, no work.

import type { CSSProperties } from "react";
import { Odometer } from "@/components/ui/odometer";
import { ScrambleText } from "@/components/ui/scramble-text";
import type { Photo } from "@/content/photos";
import {
  fileLabel, fmtAperture, fmtDate, fmtFocal, fmtIso, fmtLat, fmtLon, fmtOffset, fmtShutter, fmtTime, pad, placeShort,
} from "./format";
import "./viewfinder.css";

type Props = {
  photo: Photo;
  on: boolean;
  variant?: "full" | "mini";
  /** 1-based frame number + total, full variant only */
  frame?: number;
  total?: number;
};

/** chip reveal delay (ms) → behind the scanline */
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** corner bracket; pathLength=1 → dash animation independent of size */
const Corner = ({ pos }: { pos: string }) => (
  <svg className={`vf__corner vf__corner--${pos}`} viewBox="0 0 16 16" aria-hidden>
    <path d="M1 15 V1 H15" pathLength={1} />
  </svg>
);

export function ViewfinderHud({ photo: p, on, variant = "full", frame, total }: Props) {
  const run = on ? p.id : null;
  const exposure = [fmtFocal(p.exposure.focalLength), fmtAperture(p.exposure.aperture), fmtShutter(p.exposure.shutter), fmtIso(p.exposure.iso)];

  return (
    <div className={`vf vf--${variant}`} data-on={on || undefined} aria-hidden={!on}>
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="br" />
      <Corner pos="bl" />
      {/* re-keyed → CSS sweep restarts per photo */}
      <span key={run ?? "off"} className="vf__scan" />

      {variant === "full" ? (
        <>
          <span className="vf__cross" />
          <span className="vf__ticks" />

          <div className="vf__tl vf__chip" style={d(60)}>
            <span className="vf__rec">● REC</span>{" "}
            <ScrambleText text={frame && total ? `FRAME ${pad(frame)}/${pad(total)}` : "FRAME"} play={run} />
            <br />
            <ScrambleText className="vf__dim" text={fileLabel(p)} play={run} delay={80} />
          </div>

          <div className="vf__tr vf__chip" style={d(90)}>
            <Odometer value={fmtDate(p.takenAt)} play={run} />
            <br />
            <Odometer value={fmtTime(p.takenAt)} play={run} /> <span className="vf__dim">{fmtOffset(p.takenAt)}</span>
          </div>

          <div className="vf__bl vf__chip" style={d(420)}>
            <ScrambleText text={placeShort(p).toUpperCase()} play={run} delay={380} />
            <br />
            {p.geo ? (
              <span className="vf__dim">
                <Odometer value={fmtLat(p.geo.lat)} play={run} /> <Odometer value={fmtLon(p.geo.lon)} play={run} />
              </span>
            ) : (
              <span className="vf__dim">NO FIX</span>
            )}
          </div>

          <div className="vf__br vf__chip vf__exp" style={d(460)}>
            {exposure.map((t, i) => (
              <ScrambleText key={i} text={t} play={run} delay={420 + i * 60} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="vf__bl vf__chip" style={d(300)}>
            <ScrambleText text={placeShort(p).toUpperCase()} play={run} delay={260} duration={380} />
          </div>
          <div className="vf__br vf__chip vf__exp" style={d(340)}>
            <ScrambleText text={exposure.slice(0, 3).join(" ")} play={run} delay={300} duration={380} />
          </div>
        </>
      )}
    </div>
  );
}

"use client";

// ViewfinderHud — META overlay. On: brackets draw, scanline sweeps down, readouts decode as it passes.
// Off: the exact reverse — readouts scramble out, digits roll to 0, scanline sweeps back up, brackets retract.
// Fits: over any photo box (index monitor, viewer = "full"; gallery tiles = "mini"). Parent box must be position: relative.
// Full layout: two flex rows (top / bottom) that wrap on narrow (portrait) frames, so chips can never overlap.

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

/** how long the close sequence keeps [data-closing] (scan up + retract), ms */
const CLOSE_MS = 700;

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
  const hide = !on;
  const exposure = [fmtFocal(p.exposure.focalLength), fmtAperture(p.exposure.aperture), fmtShutter(p.exposure.shutter), fmtIso(p.exposure.iso)];

  // on → off: flag the close so CSS can play the reverse sweep; cleared after it finishes
  const [closing, setClosing] = useState(false);
  const wasOn = useRef(on);
  useEffect(() => {
    if (wasOn.current && !on) {
      setClosing(true);
      const t = window.setTimeout(() => setClosing(false), CLOSE_MS);
      wasOn.current = on;
      return () => window.clearTimeout(t);
    }
    wasOn.current = on;
    setClosing(false);
  }, [on]);

  return (
    <div className={`vf vf--${variant}`} data-on={on || undefined} data-closing={closing || undefined} aria-hidden={!on}>
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="br" />
      <Corner pos="bl" />
      {/* re-keyed → CSS sweep restarts per photo / per close */}
      <span key={run ?? (closing ? "closing" : "off")} className="vf__scan" />

      {variant === "full" ? (
        <>
          <span className="vf__cross" />
          <span className="vf__ticks" />

          <div className="vf__row vf__row--top">
            <div className="vf__chip" style={d(60)}>
              <ScrambleText text={frame && total ? `FRAME ${pad(frame)}/${pad(total)}` : "FRAME"} play={run} hide={hide} />
              <br />
              <ScrambleText className="vf__dim" text={fileLabel(p)} play={run} hide={hide} delay={80} />
            </div>
            <div className="vf__chip vf__chip--end" style={d(90)}>
              <Odometer value={fmtDate(p.takenAt)} play={run} out={hide} />
              <br />
              <Odometer value={fmtTime(p.takenAt)} play={run} out={hide} />{" "}
              <ScrambleText className="vf__dim" text={fmtOffset(p.takenAt)} play={run} hide={hide} delay={120} />
            </div>
          </div>

          <div className="vf__row vf__row--bottom">
            <div className="vf__chip" style={d(420)}>
              <ScrambleText text={placeShort(p).toUpperCase()} play={run} hide={hide} delay={380} />
              <br />
              {p.geo ? (
                <span className="vf__dim">
                  <Odometer value={fmtLat(p.geo.lat)} play={run} out={hide} />{" "}
                  <Odometer value={fmtLon(p.geo.lon)} play={run} out={hide} />
                </span>
              ) : (
                <ScrambleText className="vf__dim" text="NO FIX" play={run} hide={hide} />
              )}
            </div>
            <div className="vf__chip vf__chip--end vf__exp" style={d(460)}>
              {exposure.map((t, i) => (
                <ScrambleText key={i} text={t} play={run} hide={hide} delay={420 + i * 60} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="vf__chip vf__bl" style={d(300)}>
            <ScrambleText text={placeShort(p).toUpperCase()} play={run} hide={hide} delay={260} duration={380} />
          </div>
          <div className="vf__chip vf__br vf__exp" style={d(340)}>
            <ScrambleText text={exposure.slice(0, 3).join(" ")} play={run} hide={hide} delay={300} duration={380} />
          </div>
        </>
      )}
    </div>
  );
}

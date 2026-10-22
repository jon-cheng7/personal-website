"use client";

// Dev overlay (`?choreo` in URL): time, cue timeline (click to jump), actor list + copy keyframe.
// Fits: rendered by Scene when enabled; reads its snapshot ref.

import { useEffect, useRef, useState, type RefObject } from "react";
import { getLenisInstance } from "@/lib/lenis-store";

/** Engine state per frame (written by Scene). */
export type DebugSnapshot = {
  t: number;
  length: number;
  cues: Record<string, number>;
  camera: { x: number; y: number };
  vp: { vw: number; vh: number };
  sceneTop: number;
  actors: Record<string, { x: number; y: number; space: "screen" | "world"; t: number }>;
};

/** Label px estimate (10px mono ≈ 6.1px/char). */
const labelWidth = (name: string) => name.length * 6.1 + 10;
const LANE_PX = 14;

/** Close cues → stacked lanes (first lane whose last label ends before this one starts). */
function layoutCues(cues: Record<string, number>, length: number, width: number) {
  const lanes: number[] = [];
  const out: { name: string; t: number; lane: number }[] = [];
  for (const [name, t] of Object.entries(cues).sort((a, b) => a[1] - b[1])) {
    const center = (t / Math.max(length, 0.0001)) * width;
    const half = labelWidth(name) / 2;
    let lane = lanes.findIndex((end) => end + 6 < center - half);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = center + half;
    out.push({ name, t, lane });
  }
  return { cues: out, lanes: Math.max(lanes.length, 1) };
}

const vw = (px: number, vp: DebugSnapshot["vp"]) => `${((px / vp.vw) * 100).toFixed(1)}vw`;
const vh = (px: number, vp: DebugSnapshot["vp"]) => `${((px / vp.vh) * 100).toFixed(1)}vh`;

/** Polls snapshot at 10fps; copy key → { at, x: "…vw", y: "…vh" }. */
export function ChoreoDebug({ snapshot }: { snapshot: RefObject<DebugSnapshot | null> }) {
  const [snap, setSnap] = useState<DebugSnapshot | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const timeline = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const ready = snap !== null;

  useEffect(() => {
    const el = timeline.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  useEffect(() => {
    const id = window.setInterval(() => setSnap(snapshot.current ? { ...snapshot.current } : null), 100);
    return () => window.clearInterval(id);
  }, [snapshot]);

  if (!snap) return null;

  const jump = (t: number) => {
    const y = snap.sceneTop + t * snap.vp.vh;
    const lenis = getLenisInstance();
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const copy = (id: string) => {
    const a = snap.actors[id];
    const text = `{ at: ${snap.t.toFixed(2)}, x: "${vw(a.x, snap.vp)}", y: "${vh(a.y, snap.vp)}" }`;
    navigator.clipboard?.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1200);
  };

  const pct = (t: number) => `${(t / Math.max(snap.length, 0.0001)) * 100}%`;
  const layout = layoutCues(snap.cues, snap.length, width);

  return (
    <div className="choreo-debug" data-native-cursor>
      <div className="choreo-debug__head">
        <strong>choreo</strong>
        <span className="choreo-debug__t">t = {snap.t.toFixed(2)}</span>
        <span className="choreo-debug__muted">
          camera {vw(snap.camera.x, snap.vp)}, {vh(snap.camera.y, snap.vp)}
        </span>
        <button type="button" onClick={() => setOpen((o) => !o)}>
          {open ? "hide" : "show"}
        </button>
      </div>

      <div
        ref={timeline}
        className="choreo-debug__timeline"
        style={{ height: 22 + layout.lanes * LANE_PX }}
        onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        jump(((e.clientX - r.left) / r.width) * snap.length);
      }}>
        <div className="choreo-debug__now" style={{ left: pct(snap.t) }} />
        {layout.cues.map(({ name, t, lane }) => (
          <button
            key={name}
            type="button"
            className="choreo-debug__cue"
            style={{ left: pct(t), ["--lane" as string]: lane }}
            title={`${name} = ${+t.toFixed(3)}`}
            onClick={(e) => {
              e.stopPropagation();
              jump(t);
            }}
          >
            <span>{name}</span>
          </button>
        ))}
      </div>

      {open && (
        <table className="choreo-debug__actors">
          <tbody>
            {Object.entries(snap.actors).map(([id, a]) => (
              <tr key={id}>
                <td>{id}</td>
                <td className="choreo-debug__muted">{a.space}</td>
                <td>
                  {vw(a.x, snap.vp)}, {vh(a.y, snap.vp)}
                </td>
                <td>
                  <button type="button" onClick={() => copy(id)}>
                    {copied === id ? "copied ✓" : "copy key"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

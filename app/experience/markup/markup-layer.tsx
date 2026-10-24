"use client";

// Drawing layer over the resume sheet: SVG in sheet units (width 1000), live stroke drawn imperatively
// (no React render per move), committed marks as memoised paths/bands, erased marks dissolve out.
// Input: stylus pressure when present (else speed-simulated). Once a stylus is seen, fingers scroll instead of draw.
// Two fingers always scroll. Strokes stay on the paper: leaving the sheet ends the stroke at the edge.
// Fits: rendered inside ResumeSheet (overlay slot) by page-view.tsx. Prints with the sheet (page layout only).

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { CursorTarget } from "@/components/cursor/cursor-target";
import { setCursorMode } from "@/lib/cursor/store";
import { addPoint, distToPolyline, outlinePath, speedPressure, stylusPressure, type Pt } from "./ink";
import { newId, type Mark, type Markup } from "./markup-state";
import { snapToText } from "./snap";
import { ERASER_R, INKS, cursorFor, isSized, shapeOf, type ColorId, type InkTool, type ToolId } from "./tools";

type Props = {
  markup: Markup;
  tool: ToolId | null;
  color: ColorId;
  /** Width scale for pen / pencil (tools.ts SIZES). */
  size: number;
  /** Sheet is reflowed (narrow screen): marks don't match the printed page, so they don't print. */
  flow: boolean;
  /** Coordinates chip (X / Y in points, P = pressure), written imperatively. */
  readout: RefObject<HTMLElement | null>;
};

type Live = {
  pointerId: number;
  tool: InkTool;
  color: ColorId;
  scale: number;
  pts: Pt[];
  p: number;
  t: number;
  x: number;
  y: number;
};

export function MarkupLayer({ markup, tool, color, size, flow, readout }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const liveRef = useRef<SVGPathElement>(null);
  const liveGrad = useRef<SVGLinearGradientElement>(null);
  const live = useRef<Live | null>(null);
  const erase = useRef<{ pointerId: number; hit: boolean } | null>(null);
  const touches = useRef(new Map<number, number>()); // touch pointerId → last clientY
  const sawPen = useRef(false);
  const hovering = useRef(false);
  const [height, setHeight] = useState(1294); // viewBox height (letter page ≈ 1294 at width 1000)

  const scale = isSized(tool) ? size : 1;
  const cursor = useMemo(() => (tool ? cursorFor(tool, color, scale) : "default"), [tool, color, scale]);
  const markupRef = useRef(markup);
  markupRef.current = markup;

  // viewBox tracks the sheet's aspect (it reflows on narrow screens)
  useLayoutEffect(() => {
    const sheet = sheetOf(svgRef.current);
    if (!sheet) return;
    const ro = new ResizeObserver(() => {
      if (sheet.clientWidth) setHeight(Math.round((sheet.clientHeight / sheet.clientWidth) * 1000));
    });
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  // tool / colour changed while hovering → swap the site cursor now (not on the next pointerover)
  useEffect(() => {
    if (hovering.current) setCursorMode(cursor, tool ? svgRef.current : null);
  }, [cursor, tool]);

  /** Event → sheet units. */
  const toUnits = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    const k = 1000 / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };

  const showReadout = (x: number, y: number, p: number | null) => {
    const el = readout.current;
    if (!el) return;
    const pt = (u: number) => String(Math.max(0, Math.round(u * 0.612))).padStart(3, "0"); // letter = 612 pt wide
    el.textContent = `X ${pt(x)} · Y ${pt(y)}${p === null ? "" : ` · P ${p.toFixed(2)}`}`;
    el.dataset.on = "";
  };
  const hideReadout = () => readout.current && delete readout.current.dataset.on;

  const drawLive = () => {
    const l = live.current;
    const path = liveRef.current;
    if (!l || !path) return;
    path.setAttribute("d", outlinePath(l.pts, shapeOf(l.tool, l.scale), false));
    const g = liveGrad.current;
    const a = l.pts[0];
    const b = l.pts[l.pts.length - 1];
    if (g && a && b) {
      g.setAttribute("x1", a[0].toFixed(1));
      g.setAttribute("y1", a[1].toFixed(1));
      g.setAttribute("x2", (b[0] + 0.01).toFixed(2));
      g.setAttribute("y2", b[1].toFixed(1));
    }
  };

  const endLive = (keep: boolean) => {
    const l = live.current;
    live.current = null;
    liveRef.current?.setAttribute("d", "");
    if (!l || !keep || l.pts.length === 0) return;
    const mark: Mark = { id: newId(), tool: l.tool, color: l.color, pts: l.pts };
    if (l.scale !== 1) mark.size = l.scale;
    if (l.tool === "marker") {
      const svg = svgRef.current!;
      svg.style.pointerEvents = "none"; // let caret hit tests see the text under the layer
      const band = snapToText(sheetOf(svg)!, l.pts);
      svg.style.pointerEvents = "";
      if (band) {
        delete mark.pts;
        mark.band = band;
      }
    }
    markupRef.current.commit([...markupRef.current.marks, mark]);
  };

  /** Remove marks under (x, y). First hit of a gesture = one undo step; later hits extend it. */
  const eraseAt = (x: number, y: number) => {
    const g = erase.current;
    if (!g) return;
    const { marks } = markupRef.current;
    const next = marks.filter((m) => !hits(m, x, y));
    if (next.length === marks.length) return;
    if (g.hit) markupRef.current.replace(next);
    else markupRef.current.commit(next);
    g.hit = true;
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!tool) return;
    if (e.pointerType === "pen") sawPen.current = true;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, e.clientY);
      if (sawPen.current || touches.current.size > 1) {
        if (live.current) endLive(false); // second finger → it was a scroll, not a stroke
        erase.current = null;
        return;
      }
    }
    e.preventDefault();
    svgRef.current!.setPointerCapture(e.pointerId);
    const { x, y } = toUnits(e);
    if (tool === "eraser") {
      erase.current = { pointerId: e.pointerId, hit: false };
      eraseAt(x, y);
      return;
    }
    const p = e.pointerType === "pen" && e.pressure > 0 ? stylusPressure(e.pressure) : 0.55;
    live.current = { pointerId: e.pointerId, tool, color, scale, pts: [], p, t: e.timeStamp, x, y };
    addPoint(live.current.pts, x, y, p);
    drawLive();
    showReadout(x, y, p);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!tool) return;
    // finger scrolling (stylus seen, or two fingers down)
    if (e.pointerType === "touch" && touches.current.has(e.pointerId) && !live.current && !erase.current) {
      const last = touches.current.get(e.pointerId)!;
      touches.current.set(e.pointerId, e.clientY);
      window.scrollBy(0, (last - e.clientY) / touches.current.size);
      return;
    }
    const { x, y } = toUnits(e);
    const l = live.current;
    if (l && e.pointerId === l.pointerId) {
      const evs = e.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const ev of evs.length ? evs : [e.nativeEvent]) {
        const u = toUnits(ev);
        if (!onPaper(u.x, u.y, height)) {
          // left the paper: finish the stroke exactly at the edge; the rest of this drag draws nothing
          const [ex, ey] = edgePoint(l.x, l.y, u.x, u.y, height);
          l.pts.push([ex, ey, l.p]);
          drawLive();
          endLive(true);
          showReadout(x, y, null);
          return;
        }
        l.p =
          ev.pointerType === "pen" && ev.pressure > 0
            ? stylusPressure(ev.pressure)
            : speedPressure(l.p, Math.hypot(u.x - l.x, u.y - l.y), ev.timeStamp - l.t);
        l.x = u.x;
        l.y = u.y;
        l.t = ev.timeStamp;
        addPoint(l.pts, u.x, u.y, l.p);
      }
      drawLive();
      showReadout(x, y, l.p);
      return;
    }
    if (erase.current && e.pointerId === erase.current.pointerId) eraseAt(x, y);
    showReadout(x, y, null);
  };

  const onPointerEnd = (e: ReactPointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId);
    if (live.current?.pointerId === e.pointerId) endLive(e.type === "pointerup");
    if (erase.current?.pointerId === e.pointerId) erase.current = null;
  };

  const onEnter = () => {
    hovering.current = true;
  };
  const onLeave = () => {
    hovering.current = false;
    hideReadout();
  };

  // a tool switched off mid-stroke → drop the stroke
  useEffect(() => {
    if (!tool && live.current) endLive(false);
    if (!tool) hideReadout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const liveTool = tool && tool !== "eraser" ? tool : "pen";
  const ink = INKS[color];

  return (
    <>
      <span className="mk-grain" aria-hidden="true" />
      <CursorTarget cursor={cursor}>
        <svg
          ref={svgRef}
          className="mk-layer"
          data-tool={tool ?? undefined}
          data-flow={flow || undefined}
          viewBox={`0 0 1000 ${height}`}
          preserveAspectRatio="xMinYMin meet"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
        >
          <defs>
            {/* pencil: graphite speckle + slightly rough edge */}
            <filter id="mk-pencil" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" result="d" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="a" />
              <feComposite in="d" in2="a" operator="in" />
            </filter>
            {/* erased marks fade out through heavy grain */}
            <filter id="mk-dissolve" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 1.6" result="a" />
              <feComposite in="SourceGraphic" in2="a" operator="in" />
            </filter>
            <linearGradient ref={liveGrad} id="mk-live" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={ink.base} />
              <stop offset="1" stopColor={ink.tail} />
            </linearGradient>
          </defs>

          {markup.marks.map((m) => (
            <MarkView key={`m-${m.id}`} mark={m} />
          ))}
          {markup.ghosts.map((m) => (
            <MarkView key={`g-${m.id}`} mark={m} leaving onGone={markup.dropGhost} />
          ))}
          <path ref={liveRef} className={`mk-mark mk-mark--${liveTool}`} fill="url(#mk-live)" />
        </svg>
      </CursorTarget>
    </>
  );
}

/** One committed (or dissolving) mark. */
const MarkView = memo(function MarkView({
  mark,
  leaving,
  onGone,
}: {
  mark: Mark;
  leaving?: boolean;
  onGone?: (id: string) => void;
}) {
  const ink = INKS[mark.color] ?? INKS.lime;
  const gid = `mk-${leaving ? "g" : "m"}-${mark.id}`;
  const d = useMemo(() => (mark.pts ? outlinePath(mark.pts, shapeOf(mark.tool, mark.size), true) : ""), [mark]);
  const a = mark.pts?.[0] ?? [mark.band?.x ?? 0, 0];
  const b = mark.pts?.[mark.pts.length - 1] ?? [(mark.band?.x ?? 0) + (mark.band?.w ?? 1), 0];
  const done = useCallback(() => onGone?.(mark.id), [mark.id, onGone]);

  // fallback if the animation never runs (hidden tab, etc.)
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(done, 900);
    return () => clearTimeout(t);
  }, [leaving, done]);

  const cls = `mk-mark mk-mark--${mark.tool}${mark.band ? " mk-band" : ""}${leaving ? " mk-leaving" : ""}`;
  return (
    <g className={cls} onAnimationEnd={leaving ? done : undefined}>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={a[0]} y1={a[1]} x2={b[0] + 0.01} y2={b[1]}>
          <stop offset="0" stopColor={ink.base} />
          <stop offset="1" stopColor={ink.tail} />
        </linearGradient>
      </defs>
      {mark.band ? (
        <rect x={mark.band.x} y={mark.band.y} width={mark.band.w} height={mark.band.h} rx={2} fill={`url(#${gid})`} />
      ) : (
        <path d={d} fill={`url(#${gid})`} />
      )}
    </g>
  );
});

/** The paper the layer sits on (the layer's direct parent is the cursor wrapper, display: contents). */
const sheetOf = (el: Element | null) => el?.closest<HTMLElement>(".resume-sheet") ?? null;

/** Eraser hit test (units). */
function hits(m: Mark, x: number, y: number) {
  if (m.band) {
    const b = m.band;
    return x > b.x - ERASER_R && x < b.x + b.w + ERASER_R && y > b.y - ERASER_R && y < b.y + b.h + ERASER_R;
  }
  return !!m.pts && distToPolyline(m.pts, x, y) < ERASER_R + shapeOf(m.tool, m.size).size / 2;
}

/** Inside the paper (units; width 1000, height h). */
const onPaper = (x: number, y: number, h: number) => x >= 0 && x <= 1000 && y >= 0 && y <= h;

/** Where the segment from an on-paper point (ax, ay) to an off-paper point (bx, by) crosses the paper edge. */
function edgePoint(ax: number, ay: number, bx: number, by: number, h: number): [number, number] {
  let t = 1;
  const dx = bx - ax;
  const dy = by - ay;
  if (bx < 0) t = Math.min(t, -ax / dx);
  if (bx > 1000) t = Math.min(t, (1000 - ax) / dx);
  if (by < 0) t = Math.min(t, -ay / dy);
  if (by > h) t = Math.min(t, (h - ay) / dy);
  t = Math.max(0, t);
  return [ax + dx * t, ay + dy * t];
}

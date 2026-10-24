"use client";

// Interactive resume: every scene on one big canvas. Toolbar = overview + sections (+ per-scene dots) + sort.
// Fits: resume-experience.tsx (interactive mode; owns read-state + sort so they survive view switches).
// Layout → canvas/board.ts (board region + random starts | sorted rows). Motion → canvas/float.ts. Flights → canvas/camera.ts.
// Scattered: unfocused cards roam the whole board freely, steering clear of the focused one (pinned, still).
// Sorted: cards settle into rows and drift gently. Start spots are random on every visit.
// Input: wheel/touch/keys only move WITHIN the current scene (lights lines one by one) and BETWEEN scenes
// (past the end → next scene in reading order; before the start → previous). Page itself doesn't scroll.
// The last line of a scene is a stop (marks it read): momentum can't carry past it; moving on needs a fresh scroll.
// Any command mid-flight starts a new flight from the current camera (interruptible). Read scenes stay lit + ✓.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getLenisInstance } from "@/lib/lenis-store";
import { easeInOut, easeOut, fit, flight, type View } from "./canvas/camera";
import { FLOAT, roam, tether, waves, type Body } from "./canvas/float";
import { CARD, bounds, randomPlace, region, sortedLayout } from "./canvas/board";
import { ItemScene, SkillsScene, itemSteps } from "./resume-scenes";
import type { SceneSection } from "./scene-model";
import "./resume-bar.css";
import "./resume-canvas.css";

/** Scroll px per lit line; extra steps of scroll past either end before changing scene. */
const STEP_PX = 240;
const OVER = 0.6;
/** After a scene change, wheel input (trackpad inertia) is ignored until it pauses this long. */
const QUIET_MS = 160;
/** Reaching a scene's last line is a stop: input is held at least this long, then until a fresh scroll. */
const END_HOLD_MS = 350;
/** Framing: share of the screen a focused card / the whole canvas fills. */
const FOCUS_FILL = 0.9;
const OVERVIEW_FILL = 0.92;
/** Screen px kept clear: site nav (top) and toolbar (bottom). Framing centres in what's left. */
const INSET = { top: 76, bottom: 104 };
/** Seconds a sort/scatter rearrangement stays in "glide" mode. */
const BOOST_S = 2.4;

type Scene = {
  id: string;
  section: string;
  sectionId: string;
  steps: number;
  render: (reveal?: number) => ReactNode;
};

type Props = {
  sections: SceneSection[];
  /** Read scene ids (owned by the parent so it persists across view switches). */
  visited: ReadonlySet<string>;
  onRead: (id: string) => void;
  sorted: boolean;
  onSortedChange: (sorted: boolean) => void;
  onPageView: () => void;
};

export function ResumeCanvas({ sections, visited, onRead, sorted, onSortedChange, onPageView }: Props) {
  const scenes = useMemo(() => flatten(sections), [sections]);
  const groups = useMemo(() => groupBySection(scenes), [scenes]);
  const board = useMemo(() => region(scenes.length), [scenes.length]);
  const sortedL = useMemo(() => sortedLayout(scenes.map((s) => s.sectionId)), [scenes]);
  const box = useMemo(
    () =>
      sorted
        ? bounds(sortedL.pos, FLOAT.ampSorted, 900)
        : { x: (board.x0 + board.x1) / 2, y: (board.y0 + board.y1) / 2, w: board.x1 - board.x0, h: board.y1 - board.y0 },
    [board, sorted, sortedL],
  );
  const wv = useMemo(() => waves(scenes.map((s) => s.id)), [scenes]);

  const [current, setCurrent] = useState<number | null>(null);
  const [reveal, setReveal] = useState(0);

  const worldRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLElement | null)[]>([]);
  const bodies = useRef<Body[]>([]);
  const sortedRef = useRef(sorted);
  const shownSet = useRef(-1);
  /** Rearrange boost (sort/scatter): set to 1, decays over BOOST_S. */
  const boost = useRef(0);
  const cam = useRef<View>({ x: box.x, y: box.y, w: box.w });
  const fl = useRef<{ at: (t: number) => View; ms: number; start: number; ease: (t: number) => number } | null>(null);
  const cur = useRef<number | null>(null);
  const visitedRef = useRef(visited);
  const target = useRef(0);
  const shown = useRef(0);
  const gate = useRef({ until: 0, last: 0, armed: false });
  /** Touch twin of the end-of-scene stop: forward drags ignored until the finger lifts. */
  const touchStop = useRef(false);
  const overviewAcc = useRef(0);
  const raf = useRef(0);
  const lastT = useRef(0);
  const reduce = useRef(false);

  visitedRef.current = visited;
  sortedRef.current = sorted;
  if (bodies.current.length !== scenes.length) {
    const start = sorted ? sortedL.pos : randomPlace(scenes.length, board);
    bodies.current = start.map((h) => ({ x: h.x, y: h.y, vx: 0, vy: 0 }));
  }

  const viewFor = useCallback(
    (i: number | null): View => {
      const vw = innerWidth;
      const vh = Math.max(200, innerHeight - INSET.top - INSET.bottom);
      const v =
        i === null
          ? fit(box.x, box.y, box.w, box.h, vw, vh, OVERVIEW_FILL)
          : fit(bodies.current[i].x, bodies.current[i].y, CARD.w, CARD.h, vw, vh, FOCUS_FILL);
      // shift so the target sits in the middle of the clear area, not the screen
      const z = vw / v.w;
      return { ...v, y: v.y - (INSET.top - INSET.bottom) / 2 / z };
    },
    [box],
  );

  const apply = useCallback(() => {
    const el = worldRef.current;
    if (!el) return;
    const z = innerWidth / cam.current.w;
    const tx = innerWidth / 2 - cam.current.x * z;
    const ty = innerHeight / 2 - cam.current.y * z;
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${z.toFixed(5)})`;
  }, []);

  /** Card positions → DOM. */
  const place = useCallback(() => {
    bodies.current.forEach((b, i) => {
      const el = cardEls.current[i];
      if (el) el.style.transform = `translate3d(${(b.x - CARD.w / 2).toFixed(1)}px, ${(b.y - CARD.h / 2).toFixed(1)}px, 0)`;
    });
  }, []);

  // one rAF loop, always on while mounted: floating cards + camera flight + easing the lit progress
  const loop = useCallback(
    (now: number) => {
      const dt = Math.min(0.05, (now - (lastT.current || now)) / 1000);
      lastT.current = now;

      const t = now / 1000;
      if (reduce.current) {
        // no motion: sorted snaps to rows, scattered stays where it started
        if (sortedRef.current)
          bodies.current.forEach((b, i) => i !== cur.current && Object.assign(b, sortedL.pos[i], { vx: 0, vy: 0 }));
      } else if (sortedRef.current) {
        boost.current = Math.max(0, boost.current - dt / BOOST_S);
        const b = boost.current;
        tether(bodies.current, sortedL.pos, wv, t, dt, cur.current, b * b * (3 - 2 * b));
      } else {
        roam(bodies.current, wv, board, t, dt, cur.current);
      }
      place();

      const f = fl.current;
      if (f) {
        const t = Math.min(1, (now - f.start) / f.ms);
        cam.current = f.at(f.ease(t));
        apply();
        if (t >= 1) {
          fl.current = null;
          if (worldRef.current) worldRef.current.style.willChange = ""; // let text re-rasterise crisp
        }
      }

      const i = cur.current;
      if (i !== null) {
        const n = scenes[i].steps;
        const goal = Math.min(n, Math.max(0, target.current));
        const d = goal - shown.current;
        if (Math.abs(d) > 0.002) shown.current += d * (reduce.current ? 1 : 1 - Math.exp(-dt * 12));
        else shown.current = goal;
        if (shown.current !== shownSet.current) {
          shownSet.current = shown.current;
          setReveal(shown.current);
        }
        if (shown.current >= n - 0.02 && !visitedRef.current.has(scenes[i].id)) onRead(scenes[i].id);
      }

      raf.current = requestAnimationFrame(loop);
    },
    [apply, board, onRead, place, scenes, sortedL, wv],
  );


  /** Fly to a scene (or null = overview). Interrupts any flight in progress. */
  const go = useCallback(
    (i: number | null) => {
      const now = performance.now();
      const interrupting = !!fl.current;
      const to = viewFor(i);
      const path = flight(cam.current, to);
      if (reduce.current) {
        fl.current = null;
        cam.current = to;
        apply();
      } else {
        fl.current = { ...path, start: now, ease: interrupting ? easeOut : easeInOut };
        if (worldRef.current) worldRef.current.style.willChange = "transform";
      }
      if (i !== null) {
        // pin the target where it is: the camera flies to a card that holds still
        bodies.current[i].vx = 0;
        bodies.current[i].vy = 0;
      }
      cur.current = i;
      setCurrent(i);
      if (i !== null) {
        const done = visitedRef.current.has(scenes[i].id);
        target.current = shown.current = done ? scenes[i].steps : 0;
        setReveal(target.current);
      }
      overviewAcc.current = 0;
      gate.current = { until: now + (reduce.current ? 0 : path.ms * 0.75), last: now, armed: true };
    },
    [apply, scenes, viewFor],
  );

  const firstUnread = useCallback(() => {
    const i = scenes.findIndex((s) => !visitedRef.current.has(s.id));
    return i < 0 ? 0 : i;
  }, [scenes]);

  /** Move `delta` steps through the current scene; past either end → neighbouring scene. */
  const stepBy = useCallback(
    (delta: number) => {
      const i = cur.current;
      if (i === null) {
        if (delta > 0) go(firstUnread());
        return;
      }
      const n = scenes[i].steps;
      // end of scene = a stop: one long / fast scroll lands on the last line (scene read), never through it.
      // Moving on takes a fresh scroll after the wheel / trackpad goes quiet (or a new touch).
      if (delta > 0 && n > 0 && target.current < n - 1e-6 && target.current + delta >= n) {
        target.current = n;
        if (!visitedRef.current.has(scenes[i].id)) onRead(scenes[i].id);
        const now = performance.now();
        gate.current = { until: now + END_HOLD_MS, last: now, armed: true };
        touchStop.current = true;
        return;
      }
      target.current = Math.max(-OVER - 0.01, Math.min(n + OVER + 0.01, target.current + delta));
      if (target.current > n + OVER - 1e-6 || (n === 0 && delta > 0)) go(i + 1 < scenes.length ? i + 1 : null);
      else if (target.current < -OVER + 1e-6) go(i > 0 ? i - 1 : null);
    },
    [firstUnread, go, onRead, scenes],
  );

  /** Discrete step (keys): next/previous line, or neighbouring scene at the ends. */
  const stepKey = useCallback(
    (dir: 1 | -1) => {
      const i = cur.current;
      if (i === null) return dir > 0 && go(firstUnread());
      const n = scenes[i].steps;
      const t = Math.min(n, Math.max(0, target.current));
      if (dir > 0) {
        if (t >= n - 1e-6) return go(i + 1 < scenes.length ? i + 1 : null);
        target.current = Math.floor(t + 1e-6) + 1;
      } else {
        if (t <= 1e-6) return go(i > 0 ? i - 1 : null);
        target.current = Math.ceil(t - 1e-6) - 1;
      }
    },
    [firstUnread, go, scenes],
  );

  // mount: overview, stop page smooth-scroll, top of page, start the loop
  useLayoutEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    place();
    cam.current = viewFor(null);
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const lenis = getLenisInstance();
    lenis?.stop();
    window.scrollTo(0, 0);
    raf.current = requestAnimationFrame(loop);
    return () => {
      lenis?.start();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      lastT.current = 0;
    };
  }, [loop]);

  // sort toggled → cards glide to the new homes (sim), camera re-frames the whole board
  const firstSort = useRef(true);
  useEffect(() => {
    if (firstSort.current) {
      firstSort.current = false;
      return;
    }
    boost.current = 1;
    go(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted]);

  // input: wheel / touch on the canvas, keys on the window, resize
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const gated = (now: number) => {
      const g = gate.current;
      if (!g.armed) return false;
      const quiet = now - g.last > QUIET_MS;
      g.last = now;
      if (now < g.until || !quiet) return true;
      g.armed = false;
      return false;
    };
    const px = (e: WheelEvent) => e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (gated(performance.now())) return;
      const d = px(e);
      if (cur.current === null) {
        overviewAcc.current = Math.max(0, overviewAcc.current + d);
        if (overviewAcc.current > 120) go(firstUnread());
        return;
      }
      stepBy(d / STEP_PX);
    };
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0].clientY;
      touchStop.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest(".rc-bar")) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      const d = (ty - y) * 1.4;
      ty = y;
      if (touchStop.current && d > 0) return; // held at a scene's end until the next touch
      if (cur.current === null) {
        overviewAcc.current = Math.max(0, overviewAcc.current + d);
        if (overviewAcc.current > 120) go(firstUnread());
      } else stepBy(d / STEP_PX);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key;
      if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) stepKey(1);
      else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) stepKey(-1);
      else if (k === "ArrowRight") go(cur.current === null ? firstUnread() : Math.min(scenes.length - 1, cur.current + 1));
      else if (k === "ArrowLeft") go(cur.current === null ? 0 : Math.max(0, cur.current - 1));
      else if (k === "Escape" || k.toLowerCase() === "o") go(null);
      else return;
      e.preventDefault();
    };
    const onResize = () => {
      fl.current = null;
      cam.current = viewFor(cur.current);
      apply();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [apply, firstUnread, go, scenes.length, stepBy, stepKey, viewFor]);

  const label =
    current === null
      ? `Overview — ${visited.size} of ${scenes.length} read`
      : `${scenes[current].section}, ${current + 1} of ${scenes.length}`;

  return (
    <div
      ref={rootRef}
      className={`rc ${current === null ? "rc--overview" : "rc--focus"}${sorted ? " rc--sorted" : ""}`}
      data-chrome-tone="light-on-dark"
    >
      <div ref={worldRef} className="rc-world">
        {sortedL.labels.map((l) => (
          <p
            key={l.id}
            className="rc-label"
            aria-hidden="true"
            style={{ transform: `translate3d(${l.x}px, ${l.y}px, 0) translate(-100%, -50%)` }}
          >
            {groups.find((g) => g.id === l.id)?.title}
          </p>
        ))}
        {scenes.map((s, i) => {
          const isCur = i === current;
          const done = visited.has(s.id);
          const r = isCur ? reveal : done ? s.steps : 0;
          return (
            <article
              key={s.id}
              ref={(el) => {
                cardEls.current[i] = el;
              }}
              className="rc-card"
              data-current={isCur || undefined}
              data-done={done || undefined}
              style={{ width: CARD.w, height: CARD.h }}
              onClick={() => !isCur && go(i)}
              aria-current={isCur || undefined}
            >
              {s.render(r)}
              <span className="rc-card__done" aria-hidden="true">
                ✓ Read
              </span>
              <span
                className="rc-card__progress"
                aria-hidden="true"
                style={{ transform: `scaleX(${s.steps ? Math.min(1, r / s.steps).toFixed(4) : 1})` }}
              />
            </article>
          );
        })}
      </div>

      <p className="rc-hint" aria-hidden={current !== null}>
        Scroll to start reading, or pick a section below.
      </p>

      <nav className="rc-bar" aria-label="Resume sections">
        <button type="button" className="rc-bar__btn" aria-pressed={current === null} onClick={() => go(null)}>
          Overview
        </button>
        <span className="rc-bar__sep" aria-hidden="true" />
        {groups.map((g) => {
          const active = current !== null && scenes[current].sectionId === g.id;
          const allDone = g.scenes.every((i) => visited.has(scenes[i].id));
          return (
            <div key={g.id} className="rc-bar__group" data-active={active || undefined} data-done={allDone || undefined}>
              <button type="button" className="rc-bar__btn" onClick={() => go(g.scenes[0])}>
                {g.title}
                {allDone && <span className="rc-bar__check">✓</span>}
              </button>
              {g.scenes.length > 1 && (
                <span className="rc-bar__dots">
                  {g.scenes.map((i, k) => (
                    <button
                      key={i}
                      type="button"
                      className="rc-bar__dot"
                      data-current={i === current || undefined}
                      data-done={visited.has(scenes[i].id) || undefined}
                      aria-label={`${g.title} ${k + 1}`}
                      onClick={() => go(i)}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
        <span className="rc-bar__sep" aria-hidden="true" />
        <button type="button" className="rc-bar__btn" aria-pressed={sorted} onClick={() => onSortedChange(!sorted)}>
          {sorted ? "Scatter" : "Sort"}
        </button>
        <button type="button" className="rc-bar__btn" onClick={onPageView}>
          Read as page <kbd>R</kbd>
        </button>
        <button type="button" className="rc-bar__btn rc-bar__btn--accent" onClick={() => window.print()}>
          Save PDF
        </button>
      </nav>

      <p className="sr-only" aria-live="polite">
        {label}
      </p>
    </div>
  );
}

/** Sections → flat scene list in reading order. */
function flatten(sections: SceneSection[]): Scene[] {
  const out: Scene[] = [];
  for (const s of sections) {
    if (s.kind === "skills") {
      out.push({
        id: s.id,
        section: s.title,
        sectionId: s.id,
        steps: s.rows.length,
        render: (r) => <SkillsScene section={s} reveal={r} />,
      });
    } else {
      s.items.forEach((it, i) =>
        out.push({
          id: it.key,
          section: s.title,
          sectionId: s.id,
          steps: itemSteps(it),
          render: (r) => <ItemScene item={it} index={i} total={s.items.length} section={s.title} reveal={r} />,
        }),
      );
    }
  }
  return out;
}

function groupBySection(scenes: Scene[]) {
  const groups: { id: string; title: string; scenes: number[] }[] = [];
  scenes.forEach((s, i) => {
    const g = groups.at(-1);
    if (g && g.id === s.sectionId) g.scenes.push(i);
    else groups.push({ id: s.sectionId, title: s.section, scenes: [i] });
  });
  return groups;
}

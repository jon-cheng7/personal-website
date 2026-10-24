"use client";

// <Scene>, <Actor>, useChannel — runs the choreography on the page.
// Fits: Scene = tall scroll area + sticky viewport; scroll → time. Actors placed only by config keys.
// One gsap.ticker loop; idle when nothing moves; writes only changed styles.

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { gsap } from "@/lib/gsap";
import {
  ANCHORS,
  BUILT_IN_LOOKS,
  Smoother,
  channelAt,
  project,
  resolveScene,
  stateAt,
  variantOf,
  type ResolvedScene,
  type State,
} from "./engine";
import type { ActorConfig, AnchorRect, Choreo, ChoreoVariant, Look } from "./types";
import { resolveCues, toCss, toTime } from "./units";
import { ChoreoDebug, type DebugSnapshot } from "./debug";
import "./choreo.css";

type Listeners = Map<string, Set<(v: number) => void>>;
type Registered = { el: HTMLElement; listeners: Listeners };

type SceneApi = {
  variant: ChoreoVariant;
  register: (id: string, entry: Registered) => () => void;
};

const SceneContext = createContext<SceneApi | null>(null);
const ActorContext = createContext<{
  subscribe: (channel: string, cb: (v: number) => void) => () => void;
} | null>(null);

const DEFAULT_MOBILE_BREAKPOINT = 900;

type SceneProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  choreo: Choreo;
  children: ReactNode;
};

/** Props: choreo (config), children, any <section> attrs. Adds `?choreo` overlay. */
export function Scene({ choreo, children, className, style, ...rest }: SceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const registry = useRef(new Map<string, Registered>());
  const forceRef = useRef(true);
  const debugRef = useRef<DebugSnapshot | null>(null);

  const [mobile, setMobile] = useState(false);
  const [debug, setDebug] = useState(false);
  const breakpoint = choreo.mobile?.breakpoint ?? DEFAULT_MOBILE_BREAKPOINT;

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    setDebug(new URLSearchParams(window.location.search).has("choreo"));
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);

  const variant = useMemo(() => variantOf(choreo, mobile), [choreo, mobile]);
  const lengthScreens = useMemo(
    () => toTime(variant.length, resolveCues(variant.cues)),
    [variant],
  );

  const api = useMemo<SceneApi>(
    () => ({
      variant,
      register: (id, entry) => {
        registry.current.set(id, entry);
        forceRef.current = true;
        return () => {
          if (registry.current.get(id) === entry) registry.current.delete(id);
        };
      },
    }),
    [variant],
  );

  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let resolved: ResolvedScene | null = null;
    let vp = { vw: 1, vh: 1, rem: 16 };
    let sceneTop = 0;
    const smoothers = new Map<string, Smoother>();
    let camSmoother: Smoother | null = null;

    const refresh = () => {
      vp = {
        vw: window.innerWidth,
        vh: window.innerHeight,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
      };
      const ease = (n: string) => gsap.parseEase(n) as (p: number) => number;
      try {
        // pass 1: actors only (camera focus needs actor positions) → measure anchors → pass 2
        const pre = resolveScene(variant, vp, ease);
        const anchors = measureAnchors(sceneEl, pre);
        resolved = Object.keys(anchors).length ? resolveScene(variant, vp, ease, anchors) : pre;
      } catch (err) {
        console.error(err);
        resolved = null;
        return;
      }
      sceneTop = sceneEl.getBoundingClientRect().top + window.scrollY;
      camSmoother ??= new Smoother(reduceMotion ? { start: 0, stop: 0 } : resolved.camera.smoothing);
      for (const [id, a] of Object.entries(resolved.actors)) {
        if (!smoothers.has(id)) {
          smoothers.set(id, new Smoother(reduceMotion ? { start: 0, stop: 0 } : a.smoothing));
        }
      }
      forceRef.current = true;
    };

    const written = new Map<HTMLElement, Written>();
    const channelValues = new Map<string, number>();
    let lastRaw = NaN;

    const tick = (_time?: number, deltaMs?: number) => {
      if (!resolved) return;
      const dt = Math.min((deltaMs ?? 0) / 1000, 0.1);
      const raw = Math.min(
        Math.max((window.scrollY - sceneTop) / vp.vh, 0),
        resolved.length,
      );
      let settling = camSmoother?.settling ?? false;
      for (const s of smoothers.values()) settling ||= s.settling;
      if (raw === lastRaw && !settling && !forceRef.current) return;
      lastRaw = raw;
      forceRef.current = false;

      const camT = camSmoother ? camSmoother.step(raw, dt) : raw;
      const cam = stateAt(resolved.camera.keys, camT, true);
      const debugActors: DebugSnapshot["actors"] = {};

      for (const [id, { el, listeners }] of registry.current) {
        const actor = resolved.actors[id];
        if (!actor) continue;
        const t = actor.space === "world" ? camT : (smoothers.get(id)?.step(raw, dt) ?? raw);
        let s = stateAt(actor.keys, t);
        let x = s.x;
        let y = s.y;
        if (actor.space === "world") {
          ({ x, y } = project(s.x, s.y, cam, vp));
          if (cam.scale !== 1) s = { ...s, scale: s.scale * cam.scale };
        }
        write(el, s, x, y, reduceMotion, written);

        for (const [name, cbs] of listeners) {
          const keys = actor.channels[name];
          if (!keys) continue;
          const v = channelAt(keys, t);
          const key = `${id}:${name}`;
          if (channelValues.get(key) === v) continue;
          channelValues.set(key, v);
          for (const cb of cbs) cb(v);
        }
        if (debug) debugActors[id] = { x: s.x, y: s.y, space: actor.space, t };
      }

      if (debug) {
        debugRef.current = {
          t: raw,
          length: resolved.length,
          cues: resolved.cues,
          camera: { x: cam.x, y: cam.y, zoom: cam.scale },
          vp,
          sceneTop,
          actors: debugActors,
        };
      }
    };

    refresh();
    const onResize = () => {
      refresh();
      tick();
    };
    window.addEventListener("resize", onResize);
    document.fonts?.ready?.then(onResize);
    // actor content changing size (late images, data) → re-measure anchors
    let roFrame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roFrame);
      roFrame = requestAnimationFrame(onResize);
    });
    sceneEl.querySelectorAll("[data-actor]").forEach((el) => ro.observe(el));
    gsap.ticker.add(tick);
    tick();

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      cancelAnimationFrame(roFrame);
      window.removeEventListener("resize", onResize);
      for (const { el } of registry.current.values()) {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.filter = "";
        el.style.visibility = "";
        el.style.willChange = "";
        el.style.transformOrigin = "";
      }
    };
  }, [variant, debug]);

  return (
    <SceneContext.Provider value={api}>
      <section
        ref={sceneRef}
        className={className ? `choreo-scene ${className}` : "choreo-scene"}
        style={{ height: `calc(${lengthScreens * 100}vh + 100vh)`, ...style }}
        data-chrome-tone="light-on-dark"
        data-choreo-debug={debug ? "" : undefined}
        {...rest}
      >
        <div className="choreo-scene__viewport">{children}</div>
      </section>
      {debug && <ChoreoDebug snapshot={debugRef} />}
    </SceneContext.Provider>
  );
}

/** Apply state to an actor element; skips unchanged values. */
function write(
  el: HTMLElement,
  s: State,
  x: number,
  y: number,
  reduceMotion: boolean,
  written: Map<HTMLElement, Written>,
) {
  let transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  if (s.ax || s.ay) transform += ` translate(${(-s.ax * 100).toFixed(2)}%, ${(-s.ay * 100).toFixed(2)}%)`;
  if (s.rotate) transform += ` rotate(${s.rotate.toFixed(2)}deg)`;
  if (s.scale !== 1) transform += ` scale(${s.scale.toFixed(4)})`;
  const opacity = s.opacity >= 0.999 ? "" : Math.max(0, s.opacity).toFixed(3);
  const blur = reduceMotion ? 0 : s.blur;
  const filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";

  // scale/rotate about the anchor point (so it stays put at x, y)
  const origin = `${(s.ax * 100).toFixed(1)}% ${(s.ay * 100).toFixed(1)}%`;

  const prev = written.get(el);
  if (prev?.transform !== transform) el.style.transform = transform;
  if (prev?.origin !== origin) el.style.transformOrigin = origin;
  if (prev?.opacity !== opacity) {
    el.style.opacity = opacity;
    el.style.visibility = opacity === "0.000" ? "hidden" : "";
  }
  if (prev?.filter !== filter) {
    el.style.filter = filter;
    el.style.willChange = filter ? "transform, opacity, filter" : "";
  }
  written.set(el, { transform, opacity, filter, origin });
}

type Written = { transform: string; opacity: string; filter: string; origin: string };

/** World rects of [data-anchor] elements inside world actors, from layout (offsets) + the actor's first key. */
function measureAnchors(root: HTMLElement, pre: ResolvedScene): Record<string, AnchorRect> {
  const out: Record<string, AnchorRect> = {};
  root.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
    const actorEl = el.closest<HTMLElement>("[data-actor]");
    const actor = actorEl ? pre.actors[actorEl.dataset.actor!] : undefined;
    const first = actor?.keys[0]?.state;
    if (!actorEl || !actor || actor.space !== "world" || !first) return;
    let ox = 0;
    let oy = 0;
    let n: HTMLElement | null = el;
    while (n && n !== actorEl) {
      ox += n.offsetLeft;
      oy += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    if (n !== actorEl) return;
    const sc = first.scale;
    out[el.dataset.anchor!] = {
      x: first.x + (ox - first.ax * actorEl.offsetWidth) * sc,
      y: first.y + (oy - first.ay * actorEl.offsetHeight) * sc,
      w: el.offsetWidth * sc,
      h: el.offsetHeight * sc,
    };
  });
  return out;
}

type ActorProps = Omit<HTMLAttributes<HTMLDivElement>, "id"> & {
  id: string;
  children?: ReactNode;
};

/** Element placed/moved by choreo.actors[id]. Pass className/style for looks only. */
export function Actor({ id, children, className, style, ...rest }: ActorProps) {
  const scene = useContext(SceneContext);
  const ref = useRef<HTMLDivElement>(null);
  const listeners = useRef<Listeners>(new Map());
  const config = scene?.variant.actors[id];

  useLayoutEffect(() => {
    if (!scene || !ref.current) return;
    if (!config && process.env.NODE_ENV !== "production") {
      console.warn(`[choreo] <Actor id="${id}"> has no entry in the choreography's actors`);
    }
    return scene.register(id, { el: ref.current, listeners: listeners.current });
  }, [scene, id, config]);

  const actorApi = useMemo(
    () => ({
      subscribe: (channel: string, cb: (v: number) => void) => {
        let set = listeners.current.get(channel);
        if (!set) listeners.current.set(channel, (set = new Set()));
        set.add(cb);
        return () => set!.delete(cb);
      },
    }),
    [],
  );

  const initial = scene && config ? initialStyle(config, scene.variant) : undefined;

  return (
    <ActorContext.Provider value={actorApi}>
      <div
        ref={ref}
        className={className ? `choreo-actor ${className}` : "choreo-actor"}
        data-actor={id}
        style={{ ...initial, ...style }}
        {...rest}
      >
        {children}
      </div>
    </ActorContext.Provider>
  );
}

/** Inside an Actor: cb(value) whenever channel `name` changes. Returns true if inside an Actor. */
export function useChannel(name: string, cb: (value: number) => void) {
  const actor = useContext(ActorContext);
  const cbRef = useRef(cb);
  useLayoutEffect(() => {
    cbRef.current = cb;
  });
  useLayoutEffect(() => {
    if (!actor) return;
    return actor.subscribe(name, (v) => cbRef.current(v));
  }, [actor, name]);
  return actor !== null;
}

/** First keyframe as CSS for server render (no jump before JS). */
function initialStyle(a: ActorConfig, v: ChoreoVariant): CSSProperties {
  const first = a.keys[0];
  const looks = { ...BUILT_IN_LOOKS, ...v.looks };
  const look: Look =
    first?.look === undefined ? {} : typeof first.look === "string" ? looks[first.look] ?? {} : first.look;
  const opacity = first?.opacity ?? look.opacity ?? 1;
  const [ax, ay] = ANCHORS[first?.anchor ?? "top-left"];
  let x = toCss(first?.x ?? 0);
  let y = toCss(first?.y ?? 0);
  let hidden = opacity <= 0;
  if ((a.space ?? "screen") === "world") {
    const cam = v.camera?.keys[0];
    if (cam?.focus || (cam?.zoom !== undefined && cam.zoom !== 1)) hidden = true; // needs measuring
    if (cam?.x !== undefined) x = `calc(${x} - ${toCss(cam.x)})`;
    if (cam?.y !== undefined) y = `calc(${y} - ${toCss(cam.y)})`;
  }
  return {
    transform: `translate3d(${x}, ${y}, 0) translate(${-ax * 100}%, ${-ay * 100}%)`,
    transformOrigin: `${ax * 100}% ${ay * 100}%`,
    opacity: opacity < 1 ? opacity : undefined,
    visibility: hidden ? "hidden" : undefined,
    width: a.w !== undefined ? toCss(a.w) : undefined,
    height: a.h !== undefined ? toCss(a.h) : undefined,
    zIndex: a.z,
  };
}

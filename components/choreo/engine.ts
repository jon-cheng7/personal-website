// Choreography math. Pure: no DOM/React.
// Fits: scene.tsx resolves config on resize, asks stateAt() each frame.

import type {
  ActorConfig,
  Anchor,
  AnchorRect,
  CameraKey,
  ChannelKey,
  Choreo,
  ChoreoVariant,
  Keyframe,
  Look,
  Smoothing,
} from "./types";
import { resolveCues, toPx, toTime, type Viewport } from "./units";

export type Ease = (p: number) => number;
export type EaseParser = (name: string) => Ease;

/** Anchor name → [x, y] fraction. */
export const ANCHORS: Record<Anchor, [number, number]> = {
  "top-left": [0, 0],
  top: [0.5, 0],
  "top-right": [1, 0],
  left: [0, 0.5],
  center: [0.5, 0.5],
  right: [1, 0.5],
  "bottom-left": [0, 1],
  bottom: [0.5, 1],
  "bottom-right": [1, 1],
};

/** Looks usable everywhere. frost = portrait exit (opacity 0, blur 30). */
export const BUILT_IN_LOOKS: Record<string, Look> = {
  normal: { opacity: 1, blur: 0, scale: 1, rotate: 0 },
  frost: { opacity: 0, blur: 30 },
  hidden: { opacity: 0, blur: 0 },
};

/** Resolved visual state: px, fractions, deg. */
export type State = {
  x: number;
  y: number;
  ax: number;
  ay: number;
  scale: number;
  rotate: number;
  opacity: number;
  blur: number;
};

const NUMERIC: (keyof State)[] = ["x", "y", "ax", "ay", "scale", "rotate", "opacity", "blur"];

type ResolvedKey = { t: number; hold: number; ease: Ease; state: State };
type ResolvedChannelKey = { t: number; value: number; ease: Ease };

export type ResolvedActor = {
  id: string;
  space: "screen" | "world";
  keys: ResolvedKey[];
  channels: Record<string, ResolvedChannelKey[]>;
  smoothing: { start: number; stop: number };
};

export type ResolvedScene = {
  length: number;
  cues: Record<string, number>;
  camera: { keys: ResolvedKey[]; smoothing: { start: number; stop: number } };
  actors: Record<string, ResolvedActor>;
};

const DEFAULT_ACTOR_SMOOTHING: Smoothing = { start: 0.6, stop: 2.5 };
const DEFAULT_CAMERA_SMOOTHING: Smoothing = { start: 0.4, stop: 1 };

const normSmoothing = (s: Smoothing | undefined, fallback: Smoothing) => {
  const v = s ?? fallback;
  return typeof v === "number" ? { start: v, stop: v } : v;
};

/** Desktop config with mobile overrides applied. */
export function variantOf(choreo: Choreo, mobile: boolean): ChoreoVariant {
  if (!mobile || !choreo.mobile) return choreo;
  const m = choreo.mobile;
  return {
    length: m.length ?? choreo.length,
    cues: { ...choreo.cues, ...m.cues },
    looks: { ...choreo.looks, ...m.looks },
    camera: m.camera ?? choreo.camera,
    smoothing: m.smoothing ?? choreo.smoothing,
    actors: { ...choreo.actors, ...m.actors },
  };
}

/** Config → numbers for this viewport. Throws readable errors.
 * anchors: measured [data-anchor] rects for camera `focus` (null = not measured yet → focus keys skipped). */
export function resolveScene(
  v: ChoreoVariant,
  vp: Viewport,
  parseEase: EaseParser,
  anchors: Record<string, AnchorRect> | null = null,
): ResolvedScene {
  const cues = resolveCues(v.cues);
  const looks = { ...BUILT_IN_LOOKS, ...v.looks };
  const time = (t: Keyframe["at"]) => toTime(t, cues);

  const resolveKeys = (keys: (Keyframe | CameraKey)[], label: string, isCamera = false): ResolvedKey[] => {
    let prev: State = { x: 0, y: 0, ax: 0, ay: 0, scale: 1, rotate: 0, opacity: 1, blur: 0 };
    const out: ResolvedKey[] = [];
    for (const k of keys) {
      const kf = k as Keyframe;
      const state: State = { ...prev };
      if (kf.look !== undefined) {
        const look = typeof kf.look === "string" ? looks[kf.look] : kf.look;
        if (!look) throw new Error(`[choreo] ${label}: unknown look "${kf.look}"`);
        Object.assign(state, stripUndefined(look));
      }
      if (kf.x !== undefined) state.x = toPx(kf.x, vp);
      if (kf.y !== undefined) state.y = toPx(kf.y, vp);
      if (isCamera) applyCamera(k as CameraKey, state, vp, anchors);
      if (kf.anchor !== undefined) [state.ax, state.ay] = ANCHORS[kf.anchor];
      for (const p of ["opacity", "blur", "scale", "rotate"] as const) {
        if (kf[p] !== undefined) state[p] = kf[p] as number;
      }
      const t = time(k.at);
      const hold = k.hold !== undefined ? Math.max(t, time(k.hold)) : t;
      out.push({ t, hold, ease: parseEase(k.ease ?? "none"), state });
      prev = state;
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  };

  const resolveChannel = (keys: ChannelKey[]): ResolvedChannelKey[] =>
    keys
      .map((k) => ({ t: time(k.at), value: k.value, ease: parseEase(k.ease ?? "none") }))
      .sort((a, b) => a.t - b.t);

  const actorSmoothing = normSmoothing(v.smoothing, DEFAULT_ACTOR_SMOOTHING);
  const actors: Record<string, ResolvedActor> = {};
  for (const [id, a] of Object.entries(v.actors) as [string, ActorConfig][]) {
    const channels: Record<string, ResolvedChannelKey[]> = {};
    for (const [name, keys] of Object.entries(a.channels ?? {})) {
      channels[name] = resolveChannel(keys);
    }
    actors[id] = {
      id,
      space: a.space ?? "screen",
      keys: resolveKeys(a.keys, id),
      channels,
      smoothing: a.smoothing !== undefined ? normSmoothing(a.smoothing, 0) : actorSmoothing,
    };
  }

  return {
    length: time(v.length),
    cues,
    camera: {
      keys: resolveKeys(v.camera?.keys ?? [{ at: 0, x: 0, y: 0 }], "camera", true),
      smoothing: normSmoothing(v.camera?.smoothing, DEFAULT_CAMERA_SMOOTHING),
    },
    actors,
  };
}

/** Camera extras → state: focus centres x/y on an anchor; zoom (number | "fit") → state.scale. */
function applyCamera(k: CameraKey, state: State, vp: Viewport, anchors: Record<string, AnchorRect> | null) {
  const rect = k.focus && anchors ? anchors[k.focus] : undefined;
  if (k.focus && anchors && !rect) console.error(`[choreo] camera focus: no [data-anchor="${k.focus}"] in a world actor`);
  if (k.zoom === "fit") {
    if (rect) {
      const fill = k.fill ?? 0.9;
      state.scale = Math.min((vp.vw * fill) / rect.w, (vp.vh * fill) / rect.h);
    }
  } else if (k.zoom !== undefined) {
    state.scale = k.zoom;
  }
  if (rect) {
    state.x = rect.x + rect.w / 2 - vp.vw / 2;
    state.y = rect.y + rect.h / 2 - vp.vh / 2;
  }
}

/** World point → screen point through the camera (zoom about screen centre). */
export function project(wx: number, wy: number, cam: State, vp: { vw: number; vh: number }) {
  const z = cam.scale;
  return {
    x: (wx - cam.x - vp.vw / 2) * z + vp.vw / 2,
    y: (wy - cam.y - vp.vh / 2) * z + vp.vh / 2,
  };
}

/** State at t: before first = first; in hold = key; between = eased lerp; after last = last.
 * logScale: scale interpolates geometrically (camera zoom feels uniform). */
export function stateAt(keys: ResolvedKey[], t: number, logScale = false): State {
  if (keys.length === 0) return { x: 0, y: 0, ax: 0, ay: 0, scale: 1, rotate: 0, opacity: 1, blur: 0 };
  if (t <= keys[0].t) return keys[0].state;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k.hold) return k.state;
    const next = keys[i + 1];
    if (!next) return k.state;
    if (t < next.t) {
      const span = next.t - k.hold;
      const p = span > 0 ? next.ease((t - k.hold) / span) : 1;
      const out = {} as State;
      for (const prop of NUMERIC) out[prop] = k.state[prop] + (next.state[prop] - k.state[prop]) * p;
      const a = k.state.scale;
      const b = next.state.scale;
      if (logScale && a > 0 && b > 0 && a !== b) out.scale = a * Math.pow(b / a, p);
      return out;
    }
  }
  return keys[keys.length - 1].state;
}

/** Channel value at t (eased lerp, clamped). */
export function channelAt(keys: ResolvedChannelKey[], t: number): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0].t) return keys[0].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t) {
      const span = b.t - a.t;
      const p = span > 0 ? b.ease((t - a.t) / span) : 1;
      return a.value + (b.value - a.value) * p;
    }
  }
  return keys[keys.length - 1].value;
}

/** Asymmetric scroll smoothing: σ = t − lag; lag builds slowly (snappy start), releases with glide (coast). */
export class Smoother {
  private lag = 0;
  private prevT = NaN;
  private readonly glide: number;
  private readonly tUp: number;
  private readonly on: boolean;

  constructor(s: { start: number; stop: number }) {
    this.on = s.stop > 0;
    this.glide = s.stop / 4;
    this.tUp = this.on ? this.glide * (s.stop / Math.max(s.start, 0.05)) : 0;
  }

  /** Raw t + frame dt (s) → smoothed σ. */
  step(t: number, dt: number): number {
    if (!this.on) return t;
    const dT = Number.isNaN(this.prevT) ? 0 : t - this.prevT;
    this.prevT = t;
    if (Math.abs(dT) > 2) {
      this.lag = 0;
    } else if (dt > 0) {
      const target = (dT / dt) * this.glide;
      const tau = Math.abs(target) > Math.abs(this.lag) ? this.tUp : this.glide;
      this.lag += (target - this.lag) * (1 - Math.exp(-dt / tau));
      if (Math.abs(this.lag) < 1e-5 && dT === 0) this.lag = 0;
    }
    return t - this.lag;
  }

  get settling() {
    return this.lag !== 0;
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

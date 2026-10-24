// Choreography config shape (what home.choreo.ts is written in).
// Fits: read by engine.ts; consumed by <Scene choreo>.

import type { Length, Time } from "./units";

export type { Length, Time };

/** Which point of an element sits on (x, y). */
export type Anchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export type Look = {
  /** 0–1. */
  opacity?: number;
  /** px. */
  blur?: number;
  scale?: number;
  /** deg. */
  rotate?: number;
};

/** State at time `at`. Omitted props carry over from previous key. */
export type Keyframe = Look & {
  /** Screens, cue, or "cue ± n". */
  at: Time;
  /** px | "50vw" | "45vh" | "2rem" | "50vw - 10vh". */
  x?: Length;
  y?: Length;
  anchor?: Anchor;
  /** "normal" | "frost" | "hidden" | Choreo.looks name | inline. Explicit props win. */
  look?: string | Look;
  /** Stay exactly here until this time (lock). */
  hold?: Time;
  /** GSAP ease arriving at this key. Default "none". */
  ease?: string;
};

/** Keyframed number for a component (useChannel). */
export type ChannelKey = { at: Time; value: number; ease?: string };

/** Seconds. start = pickup lag, stop = glide. Number = both. 0 = glued. */
export type Smoothing = number | { start: number; stop: number };

/** One actor's config (by <Actor id>). */
export type ActorConfig = {
  /** "screen" = on-screen pos (default); "world" = canvas pos, camera-panned. */
  space?: "screen" | "world";
  /** Size; omit = content size. */
  w?: Length;
  h?: Length;
  /** Stacking order. */
  z?: number;
  /** Overrides scene default. */
  smoothing?: Smoothing;
  keys: Keyframe[];
  /** e.g. reveal: [{ at, value }]. */
  channels?: Record<string, ChannelKey[]>;
};

/** Camera state at `at`. x/y = world point at screen top-left (at zoom 1). Omitted = carried over. */
export type CameraKey = {
  at: Time;
  x?: Length;
  y?: Length;
  /** Scale about the screen centre (1 = none). "fit" = fit the `focus` element on screen. */
  zoom?: number | "fit";
  /** data-anchor name to centre on (sets x/y from the measured element). */
  focus?: string;
  /** With zoom "fit": share of the screen the focused element fills (default 0.9). */
  fill?: number;
  ease?: string;
  hold?: Time;
};

/** Measured world rect of a [data-anchor] element (px). */
export type AnchorRect = { x: number; y: number; w: number; h: number };

/** Full scene config. */
export type ChoreoVariant = {
  /** Total scroll length (screens). */
  length: Time;
  /** Named moments (screens or "cue ± n"). */
  cues?: Record<string, Time>;
  /** Extra named looks. */
  looks?: Record<string, Look>;
  /** Default: fixed at 0,0. */
  camera?: { keys: CameraKey[]; smoothing?: Smoothing };
  actors: Record<string, ActorConfig>;
  /** Default for actors. */
  smoothing?: Smoothing;
};

/** Desktop config + optional mobile overrides. */
export type Choreo = ChoreoVariant & {
  /** At/below breakpoint (default 900px). Actors replaced per id. */
  mobile?: Partial<ChoreoVariant> & { breakpoint?: number };
};

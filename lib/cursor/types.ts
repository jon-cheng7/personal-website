/**
 * The cursor system's data model — see the project doc
 * ("claude/cursor-system-architecture.md") for the full architecture this
 * implements. Deliberately framework-free (no React, no DOM) so it's easy
 * to reason about and extend in isolation from rendering concerns.
 */

/** How a shape's own painted pixels composite against whatever is behind
 * the cursor. This is deliberately a property of the *shape*, not the mode
 * or some separate styling layer — two shapes can share identical
 * geometry and differ only in blend behavior (a plain lime dot vs. a
 * difference-blended one), and those are treated as distinct, separately
 * nameable shapes (see lib/cursor/shapes.ts's `withBlend` helper) rather
 * than a flag bolted onto `CursorModeConfig`. Optional and normal-by-
 * default — a shape that omits `blend` entirely behaves exactly as if it
 * said `"normal"`.
 *
 * Only ever applied to the shape's own paint layer (the "simple" shell div
 * or the "svg" path — see components/cursor/global-cursor.tsx/.css) and
 * never to `.cursor-content` (text/icon/media/custom React), so hovering a
 * media-preview mode never has its photo/video/text pulled into a
 * difference blend it didn't ask for — `mix-blend-mode` isn't an inherited
 * CSS property to begin with, and the shape/content layers are siblings,
 * not ancestor/descendant, so there's no accidental inheritance path even
 * if a future mode combined the two.
 *
 * Deliberately a small closed union rather than the full CSS
 * `mix-blend-mode` keyword set — this system only actually needs "does it
 * invert against its backdrop or not," and a closed union is what lets
 * `CursorShape`/`morph-strategy.ts`/`global-cursor.tsx` treat it as a
 * genuinely discrete (unanimatable) state rather than an arbitrary string.
 * Widen it here first if a mode ever needs `multiply`/`screen`/etc. */
export type CursorBlendMode = "normal" | "difference";

/** A "simple" shape is plain CSS geometry (width/height/border-radius plus
 * a couple of transform knobs) — cheap to tween, no SVG involved. A "svg"
 * shape is an arbitrary path, for silhouettes/blobs/logos that simple
 * geometry can't express. See lib/cursor/morph-strategy.ts for how
 * transitions between the two kinds are handled. */
export type CursorShape =
  | {
      kind: "simple";
      width: number;
      height: number;
      /** Number (px) or a CSS radius string like "50%" / "8px". */
      radius: number | string;
      rotate?: number;
      skewX?: number;
      /** See `CursorBlendMode` above. Omitted = renders normally. */
      blend?: CursorBlendMode;
    }
  | {
      kind: "svg";
      /** An SVG path `d` string. By convention every "svg" mode in
       * lib/cursor/modes.ts is authored against the same `viewBox`
       * ("0 0 100 100") — see lib/cursor/morph-strategy.ts for why: it
       * gives MorphSVGPlugin one consistent coordinate space to morph
       * within regardless of which two shapes are involved, so nothing
       * has to animate the `viewBox` attribute itself. */
      path: string;
      viewBox: string;
      /** Rendered on-screen pixel size — independent of the path's own
       * coordinate space, exactly like `width`/`height` on a "simple"
       * shape. This is what actually gets tweened when the shell resizes;
       * the path/viewBox only ever describes silhouette, never scale. */
      width: number;
      height: number;
      /** See `CursorBlendMode` above. Omitted = renders normally. */
      blend?: CursorBlendMode;
    };

/** What renders *inside* the shell, animated on its own timeline —
 * independent from the shell's own resize/morph (see global-cursor.tsx). */
export type CursorContent =
  | { kind: "none" }
  | {
      kind: "text";
      text: string;
      animation?: "marquee" | "fade" | "none";
    }
  | { kind: "icon"; name: string }
  | {
      kind: "media";
      mediaKind: "image" | "video";
      src: string;
      poster?: string;
    }
  | { kind: "custom"; render: () => import("react").ReactNode };

export interface CursorTracking {
  /** Position-easing duration in seconds. Lower = snappier, tighter to the
   * real pointer; higher = more lag/"physics". */
  duration?: number;
  ease?: string;
  /** Squash/stretch the shell along the current movement vector — a
   * circular shell stretching horizontally during rapid horizontal
   * movement, per the spec's own example. Off by default: most modes
   * (text labels, media previews) read as broken if they stretch. */
  stretchWithVelocity?: boolean;
  /** Clamp on how far `stretchWithVelocity` can distort the shell, so a
   * fast flick can't produce an absurd aspect ratio. Ignored unless
   * `stretchWithVelocity` is on. */
  maxStretch?: number;
}

export interface CursorAnchor {
  /** 0–1 normalized against the shell's own box by default (0.5, 0.5 is
   * centered on the pointer, the default when `anchor` is omitted
   * entirely). Use `unit: "px"` for a fixed offset instead — e.g. a large
   * media preview that should sit above-and-right of the pointer rather
   * than centered on top of the hovered element. */
  x: number;
  y: number;
  unit?: "normalized" | "px";
}

export interface CursorModeConfig {
  shape: CursorShape;
  content: CursorContent;
  /** Fill/foreground color for a "simple" shape or the default text/icon
   * color — a "svg" shape's path is filled/stroked with this too. */
  color?: string;
  stroke?: { width: number; color: string };
  tracking?: CursorTracking;
  /** Defaults to centered on the pointer (0.5, 0.5 normalized) when omitted. */
  anchor?: CursorAnchor;
  /** Overrides the default ~250ms shell transition for this specific mode. */
  transitionMs?: number;
  /** Warm this mode's media into the pool ahead of time (see
   * lib/cursor/media-pool.ts) — a knob for a future project grid to flip
   * on for likely-hovered cards. Unused by anything yet. */
  preload?: boolean;
  /** A small continuous animation applied to the shape's own paint layer
   * (shell + svg + content together, as one unit) for as long as this mode
   * stays active — entirely independent of both the one-shot shell
   * transition above (which only ever plays once, on the change into or
   * out of this mode) and `tracking`'s pointer-following motion / the
   * velocity-driven squash-stretch (see global-cursor.tsx's dedicated
   * effect: those tween different properties on the same element, so
   * nothing here conflicts with them). Currently only a vertical "bob"
   * exists; omitted — the default for every existing mode — means the
   * shape stays perfectly still. Skipped under `prefers-reduced-motion`,
   * same rule this codebase applies everywhere else motion is ambient
   * rather than a direct response to input (see components/hero.tsx's rim
   * rotation for the same pattern). */
  idleMotion?: {
    type: "bob";
    /** Peak vertical travel, in px, in each direction from center.
     * Defaults to 4. */
    amplitude?: number;
    /** Seconds for one full down-and-up cycle. Defaults to 1.4. */
    durationS?: number;
  };
  /** Draws a velocity-sensitive elastic trail behind the shell for as long
   * as this mode stays active — see global-cursor.tsx's own dedicated
   * effect/tick logic. Two points chase each other in a short chain (the
   * shell's own tracked position, then a "mid" point that eases toward
   * it, then a "tail" point that eases toward "mid"), rendered as two
   * differently-colored straight segments: shell→mid and mid→tail. This
   * lives in raw viewport coordinates in a fixed overlay of its own —
   * NOT nested inside the shell's own already-translated DOM — since the
   * trail's points don't share the shell's transform origin.
   *
   * Deliberately plain per-frame easing (`pos += (target - pos) * ease`)
   * rather than a GSAP tween: both "velocity sensitive" and "catches up
   * and disappears at rest" fall out of that one update rule for free —
   * move the head fast and each follower necessarily lands further behind
   * frame to frame (a bigger visible gap reads as a longer trail); stop,
   * and the same rule closes that gap every frame until the segments are
   * a fraction of a pixel long, which just reads as no trail — no
   * separate "hide when slow" branch needed. It's also one more tween-
   * object-per-frame pattern deliberately avoided, per the lesson from
   * components/horizontal-scroll.tsx's own GSAP-accumulation fix — this
   * runs every tick, so it has to be as cheap as the fade math there.
   *
   * Omitted (every mode except `trail` in lib/cursor/modes.ts) = no
   * trail at all — not even the two line elements' geometry gets touched. */
  trail?: {
    /** How far the "mid" point eases toward the shell's tracked position
     * each frame, 0–1 — larger closes the gap faster (a tighter, shorter-
     * looking trail at a given speed). Defaults to 0.25. */
    midEase?: number;
    /** Same, for how far "tail" eases toward "mid" each frame. Smaller
     * than `midEase` reads as a longer, more elastic second segment.
     * Defaults to 0.15. */
    tailEase?: number;
    /** Color of the shell→mid segment. */
    midColor?: string;
    /** Color of the mid→tail segment. */
    tailColor?: string;
    /** Stroke width, in px. Defaults to 2. */
    width?: number;
  };
}

/** A `CursorTarget`/`data-cursor` can reference a named mode by string, or
 * supply a full one-off config inline — see components/cursor/cursor-
 * target.tsx. */
export type CursorModeRef = string | CursorModeConfig;

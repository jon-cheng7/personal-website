// Cursor config types: shapes, content, tracking, modes.
// Fits: lib/cursor/modes.ts + CursorTarget configs.

export type CursorBlendMode = "normal" | "difference";

/** simple = CSS box; svg = path (MorphSVG between). */
export type CursorShape =
  | {
      kind: "simple";
      width: number;
      height: number;
      radius: number | string;
      rotate?: number;
      skewX?: number;
      blend?: CursorBlendMode;
    }
  | {
      kind: "svg";
      path: string;
      viewBox: string;
      width: number;
      height: number;
      blend?: CursorBlendMode;
    };

/** Inside the shape: none | text | icon | media | custom. */
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

/** Follow lag (duration/ease) + velocity stretch. */
export interface CursorTracking {
  duration?: number;
  ease?: string;
  stretchWithVelocity?: boolean;
  maxStretch?: number;
}

/** Which point of the shape sits on the pointer. */
export interface CursorAnchor {
  x: number;
  y: number;
  unit?: "normalized" | "px";
}

/** A full cursor mode. */
export interface CursorModeConfig {
  shape: CursorShape;
  content: CursorContent;
  color?: string;
  stroke?: { width: number; color: string };
  tracking?: CursorTracking;
  anchor?: CursorAnchor;
  transitionMs?: number;
  preload?: boolean;
  /** Bob while pointer still. */
  idleMotion?: {
    type: "bob";
    amplitude?: number;
    durationS?: number;
  };
  /** Two-segment elastic trail. */
  trail?: {
    midEase?: number;
    tailEase?: number;
    midColor?: string;
    tailColor?: string;
    width?: number;
  };
}

/** Mode name or inline config. */
export type CursorModeRef = string | CursorModeConfig;

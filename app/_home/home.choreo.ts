// HOME CONTROL FILE — where every home element is + how it moves over scroll.
// Fits: passed to <Scene> in app/page.tsx; keys = <Actor id>s.
// Time = screens of scroll (1 = one viewport height). `?choreo` = overlay w/ copy-key.
// Key: { at, x, y, anchor, look, opacity, blur, scale, rotate, hold, ease } — omitted = carried over.
// space 'screen' = on-screen pos (default) | 'world' = page canvas, panned by camera.

import type { Choreo } from "@/components/choreo/types";

/** Named moments. Move one → everything timed off it moves. Can reference others: "aboutLock + 1.8". */
const cues = {
  portraitLock: 0.6,
  aboutIn: 0.35,
  aboutLock: 1.3,
  aboutDone: 3.1,
  end: 4.5,
};

/** Portrait size fit (hero.tsx). top = px from top at load (also spawn y); overlap = bottom edge into name row; aspect = w/h. */
export const PORTRAIT = {
  top: 96,
  overlap: 1 / 3,
  aspect: 4 / 5,
} as const;

/** Portrait speech-bubble visibility, in screens of scroll. */
export const BUBBLES = {
  greeting: { to: 0.001 },
  about: { from: 0.08, to: 1.8 },
} as const;

export const homeChoreo: Choreo = {
  length: "end",
  cues,

  /** Default actor ease vs scroll (s). start = pickup lag (smaller = snappier); stop = glide after stop; 0 = glued. */
  smoothing: { start: 0.6, stop: 2.5 },

  /** Camera = world point at screen top-left. Direction change = which of x/y moves between keys, e.g. x to 4 then y to 6. */
  camera: {
    keys: [
      { at: 0, x: 0, y: 0 },
      { at: "end", x: "450vh" },
    ],
    smoothing: { start: 0.4, stop: 1 },
  },

  actors: {
    /** "Jon ● cheng" title screen. World → scrolls away with camera. */
    hero: {
      space: "world",
      w: "100vw",
      h: "100vh",
      z: 1,
      keys: [{ at: 0, x: 0, y: 0 }],
    },

    /** sorrento.png. Spawn → glide to lock → hold → drift + frost out. */
    portrait: {
      z: 0,
      keys: [
        { at: 0, x: "50vw", y: PORTRAIT.top, anchor: "top" },
        { at: "portraitLock", x: "25vw", y: "50vh", anchor: "center", hold: "aboutDone" },
        { at: "aboutDone + 0.1", x: "24vw" },
        { at: "aboutDone + 0.8", x: "14vw", look: "frost" },
      ],
    },

    /** About statement. Frost in → lock → words light (reveal channel) → frost out. */
    aboutText: {
      w: "min(84vw, 72rem)",
      z: 2,
      keys: [
        { at: "aboutIn", x: "80vw", y: "50vh", anchor: "left", look: "frost" },
        { at: "aboutIn + 0.75", x: "60vw", look: "normal" },
        { at: "aboutLock", x: "50vw", hold: "aboutDone" },
        { at: "aboutDone + 0.1", x: "47vw" },
        { at: "aboutDone + 0.8", x: "30vw", look: "frost" },
      ],
      channels: {
        reveal: [
          { at: "aboutLock + 0.1", value: 0 },
          { at: "aboutDone - 0.2", value: 1 },
        ],
      },
    },
  },

  /** ≤ breakpoint px: overrides (actors replaced per id). Plain vertical page. */
  mobile: {
    breakpoint: 900,
    length: 2.5,
    camera: {
      keys: [
        { at: 0, x: 0, y: 0 },
        { at: 2.5, y: "250vh" },
      ],
      smoothing: 0,
    },
    smoothing: 0,
    actors: {
      portrait: {
        space: "world",
        z: 0,
        keys: [{ at: 0, x: "50vw", y: PORTRAIT.top, anchor: "top" }],
      },
      aboutText: {
        space: "world",
        w: "88vw",
        z: 2,
        keys: [{ at: 0, x: "6vw", y: "125vh" }],
        channels: {
          reveal: [
            { at: 0.6, value: 0 },
            { at: 1.6, value: 1 },
          ],
        },
      },
    },
  },
};

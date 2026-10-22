// HOME CONTROL FILE — where every home element is + how it moves over scroll.
// Fits: passed to <Scene> in app/page.tsx; keys = <Actor id>s.
// Time = screens of scroll (1 = one viewport height). `?choreo` = overlay w/ copy-key.
// Key: { at, x, y, anchor, look, opacity, blur, scale, rotate, hold, ease } — omitted = carried over.
// space 'screen' = on-screen pos (default) | 'world' = page canvas, panned by camera.

import type { ActorConfig, Choreo } from "@/components/choreo/types";

/** Engineering / Artistry / Exploration cards (sections/pillars). Row centered on screen; i = 0 left → 2 right.
 * w = card width (CSS aspect 3/4); spacing = center-to-center vw; rise = how far below they start;
 * stagger = delay between cards; fade = each card's entry length; flip = each card's flip length;
 * flipStagger = delay between flips; rest = pause after last flip before scrolling down;
 * exitOrder = slots in leave order (1 = middle); exitDelay = first card's ride before it lets go; exitStagger = gap between;
 * fadeOut = frost-out length once a card is moving with the scroll (screens). */
export const CARDS = {
  ids: ["cardEngineering", "cardArtistry", "cardExploration"],
  w: "min(26vw, 50vh)",
  spacing: 30,
  rise: "8vh",
  stagger: 0.12,
  fade: 0.5,
  flip: 0.6,
  flipStagger: 0.15,
  rest: 0.3,
  exitOrder: [1, 0, 2],
  exitDelay: 0.1,
  exitStagger: 0.12,
  fadeOut: 0.5,
} as const;

/** Tech-stack terminal (sections/terminal). "Let’s talk tech" heading frosts in, window rises in front + locks
 * while the session types, heading frosts away past the lock, window lets go.
 * w/h = window size (output scrolls inside). Timing → terminal* cues. Script/pace → sections/terminal/session.ts. */
export const TERMINAL = {
  w: "min(80vw, 62rem)",
  h: "min(72vh, 38rem)",
} as const;

/** Camera's downward speed after the cards: vh per screen of scroll (camera end key uses it). */
const DOWN_SPEED = 100;

/** World x of the vertical column = where the camera stops panning right (at cue `cards`). */
const COLUMN_X = "344vh";

/** Named moments. Move one → everything timed off it moves. Can reference others: "aboutLock + 1.8". */
const cues = {
  portraitLock: 0.6,
  aboutIn: 0.35,
  aboutLock: 1.3,
  aboutDone: 3.1,
  cards: 3.44, //      cards start fading in; camera stops panning right
  cardsLanded: `cards + ${(CARDS.stagger * (CARDS.ids.length - 1) + CARDS.fade).toFixed(2)}`, // last card in → camera starts down
  cardsFlip: 4.19, //  cards start flipping (left → right)
  cardsFlipped: `cardsFlip + ${(CARDS.flipStagger * (CARDS.ids.length - 1) + CARDS.flip + CARDS.rest).toFixed(2)}`, // flips done + rest → camera starts down
  terminal: 6.22, //   "Let’s talk tech" frosts in; window starts rising at +0.3
  terminalLock: "terminal + 1.0", //    window centered + locked; session starts typing; heading starts fading
  terminalTyped: "terminalLock + 1.4", // session typed → live (click/type)
  terminalDone: "terminalTyped + 0.8", // lets go
  contact: "terminalDone + 0.4", //    accent bitmap tide starts flooding up
  contactName: "contact + 0.45", //     "Jon ● cheng" rises back in
  contactInfo: "contact + 0.7", //      email + links fade in
  end: "contact + 1.6",
};

/** One card: frost + rise + scale-in around its center, flip, then staggered exit; all by slot. World actor.
 * Exit: card rides the camera (still on screen), easing into the scroll over 2×delay, then frosts out as it rises. */
function card(i: number): ActorConfig {
  const start = i * CARDS.stagger;
  const delay = CARDS.exitDelay + (CARDS.exitOrder as readonly number[]).indexOf(i) * CARDS.exitStagger;
  const off = (i - 1) * CARDS.spacing;
  return {
    space: "world",
    w: CARDS.w,
    z: 3,
    keys: [
      { at: `cards + ${start}`, x: `${COLUMN_X} + 50vw ${off < 0 ? "-" : "+"} ${Math.abs(off)}vw`, y: `50vh + ${CARDS.rise}`, anchor: "center", look: "frost", scale: 0.94 },
      { at: `cards + ${(start + CARDS.fade).toFixed(2)}`, y: "50vh", look: "normal", ease: "power3.out" },
      { at: "cardsFlipped", y: "50vh" },
      { at: `cardsFlipped + ${(delay * 2).toFixed(2)}`, y: `50vh + ${(delay * DOWN_SPEED).toFixed(1)}vh`, ease: "power1.out" },
      { at: `cardsFlipped + ${(delay * 2 + CARDS.fadeOut).toFixed(2)}`, look: "frost", ease: "power1.in" },
    ],
    // 0 = front, 1 = back.
    channels: {
      flip: [
        { at: `cardsFlip + ${(i * CARDS.flipStagger).toFixed(2)}`, value: 0 },
        { at: `cardsFlip + ${(i * CARDS.flipStagger + CARDS.flip).toFixed(2)}`, value: 1, ease: "power2.inOut" },
      ],
    },
  };
}

/** Portrait size fit (hero.tsx). top = px from top at load (also spawn y); overlap = bottom edge into name row; aspect = w/h. */
export const PORTRAIT = {
  top: 96,
  overlap: 1 / 3,
  aspect: 4 / 5,
} as const;

/** Portrait speech-bubble visibility, in screens of scroll. */
export const BUBBLES = {
  greeting: { to: 0.001 },
  about: { from: 0.08, to: 3.1 },
} as const;

export const homeChoreo: Choreo = {
  length: "end",
  cues,

  /** Default actor ease vs scroll (s). start = pickup lag (smaller = snappier); stop = glide after stop; 0 = glued. */
  smoothing: { start: 0.6, stop: 2.5 },

  /** Camera = world point at screen top-left. Pan right → hold while cards land + flip → scroll down. */
  camera: {
    keys: [
      { at: 0, x: 0, y: 0 },
      { at: "cards", x: COLUMN_X, hold: "cardsFlipped" },
      { at: "cardsFlipped + 1.5", y: `${DOWN_SPEED * 1.5}vh` },
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
      w: "min(44vw, 72rem)",
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

    ...Object.fromEntries(CARDS.ids.map((id, i) => [id, card(i)])),

    /** "Let’s talk tech" — centered behind the window. Frost in → hold → frost away past terminalLock. */
    talkTech: {
      w: "92vw",
      z: 3,
      keys: [
        { at: "terminal", x: "50vw", y: "58vh", anchor: "center", look: "frost", scale: 0.96 },
        { at: "terminal + 0.4", y: "50vh", look: "normal", ease: "power3.out", hold: "terminalLock" },
        { at: "terminalLock + 0.5", look: "frost", scale: 1.04, ease: "power1.in" },
      ],
    },

    /** Tech-stack terminal. Rise in (in front of heading) → lock (types session) → live → frost out up. */
    terminal: {
      w: TERMINAL.w,
      h: TERMINAL.h,
      z: 4,
      keys: [
        { at: "terminal + 0.3", x: "50vw", y: "150vh", anchor: "center", look: "frost" },
        { at: "terminalLock", y: "50vh", look: "normal", ease: "sine.out", hold: "terminalDone" },
        { at: "terminalDone + 0.9", y: "-60vh", look: "frost", ease: "power1.in" },
      ],
      // 0 = nothing typed → 1 = session done (live).
      channels: {
        session: [
          { at: "terminalLock + 0.05", value: 0 },
          { at: "terminalTyped", value: 1 },
        ],
      },
    },

    /** Contact backdrop: accent bitmap (BitmapField). tide 0 → 1 = flood up from the bottom. */
    contactBg: {
      w: "100vw",
      h: "100vh",
      z: 1,
      keys: [{ at: "contact", x: 0, y: 0 }],
      channels: {
        tide: [
          { at: "contact", value: 0 },
          { at: "contact + 1.1", value: 1, ease: "power2.out" },
        ],
      },
    },

    /** "Jon ● cheng" again, on the tide. Bottom-anchored like the hero. */
    contactName: {
      w: "100vw",
      z: 6,
      keys: [
        { at: "contactName", x: 0, y: "114vh", anchor: "bottom-left", look: "frost" },
        { at: "contactName + 0.6", y: "100vh", look: "normal", ease: "power3.out" },
      ],
    },

    /** Email + socials, upper dark area. */
    contactInfo: {
      w: "90vw",
      z: 6,
      keys: [
        { at: "contactInfo", x: "4vw", y: "22vh", look: "frost" },
        { at: "contactInfo + 0.5", y: "18vh", look: "normal", ease: "power3.out" },
      ],
    },
  },

  /** ≤ breakpoint px: overrides (actors replaced per id). Plain vertical page. */
  mobile: {
    breakpoint: 900,
    length: 5.1,
    camera: {
      keys: [
        { at: 0, x: 0, y: 0 },
        { at: 5.1, y: "510vh" },
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
      // Cards stacked below the statement; each fades up as it enters the screen.
      ...Object.fromEntries(
        CARDS.ids.map((id, i): [string, ActorConfig] => [
          id,
          {
            space: "world",
            w: "88vw",
            z: 3,
            keys: [
              { at: 1 + i * 0.6, x: "6vw", y: `${200 + i * 64}vh + 4vh`, look: "frost", scale: 0.96 },
              { at: 1.3 + i * 0.6, y: `${200 + i * 64}vh`, look: "normal", ease: "power2.out" },
            ],
          },
        ]),
      ),
      // Heading, then terminal last; page ends on it. Session types as it scrolls into view.
      talkTech: {
        space: "world",
        w: "92vw",
        z: 3,
        keys: [{ at: 0, x: "4vw", y: "397vh" }],
      },
      terminal: {
        space: "world",
        w: "92vw",
        h: "78vh",
        z: 4,
        keys: [{ at: 0, x: "4vw", y: "425vh" }],
        channels: {
          session: [
            { at: 3.35, value: 0 },
            { at: 4.1, value: 1 },
          ],
        },
      },
      // Contact: full screen at the end of the page.
      contactBg: {
        space: "world",
        w: "100vw",
        h: "100vh",
        z: 1,
        keys: [{ at: 0, x: 0, y: "510vh" }],
        channels: {
          tide: [
            { at: 4.3, value: 0 },
            { at: 5.05, value: 1, ease: "power2.out" },
          ],
        },
      },
      contactInfo: { space: "world", w: "88vw", z: 6, keys: [{ at: 0, x: "6vw", y: "526vh" }] },
      contactName: { space: "world", w: "100vw", z: 6, keys: [{ at: 0, x: 0, y: "610vh", anchor: "bottom-left" }] },
    },
  },
};

import type {
  SpeechBubbleContext,
  SpeechBubbleLine,
  SpeechBubbleScript,
} from "@/components/speech-bubble";

// ---------------------------------------------------------------------------
// Dialogue for the two speech bubbles on the Home hero portrait
// (components/hero.tsx). Pure data + small decision functions — no DOM, no
// GSAP — so lines can be rewritten (or moved to a content/i18n file later)
// without touching the bubble component.
//
// Each `create…Script()` returns a fresh, stateful script; call it once per
// bubble instance (hero.tsx does this at module level so it's stable).
// ---------------------------------------------------------------------------

/** A short "thinking…" beat, sometimes slipped in before a line so the
 * bubble feels like it's composing a thought rather than reading a list.
 * Also gives the elastic resize a fun shrink-then-grow. */
const THINKING: SpeechBubbleLine = { text: "…", holdSeconds: 0.9 };

/** Shuffled, non-repeating picker: walks a shuffled copy of `lines`, and
 * reshuffles when exhausted — never repeating the last line said across the
 * reshuffle seam. */
function picker(lines: readonly string[]) {
  let bag: string[] = [];
  let last: string | null = null;
  return () => {
    if (bag.length === 0) {
      bag = [...lines];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    last = bag.pop() ?? null;
    return last ?? "";
  };
}

function timeOfDayLine(): string {
  const h = new Date().getHours();
  if (h < 5) return "up late, huh?";
  if (h < 12) return "good morning, by the way.";
  if (h < 17) return "good afternoon, by the way.";
  if (h < 22) return "good evening, by the way.";
  return "burning the midnight oil?";
}

type ScriptOptions = {
  /** Chance (0–1) of a "…" beat before an ordinary line. */
  thinkingChance?: number;
};

/** Shared "personality" engine: an opening sequence on first appearance,
 * a different opener when the visitor comes back, occasional thinking
 * beats, idle-aware lines, and winding down after a while instead of
 * looping forever. */
function personality(
  {
    opening,
    chatter,
    returns,
    idle,
    windDown,
    windDownAfter,
    idleAfterSeconds,
    idleCooldownSeconds,
  }: {
    opening: readonly string[];
    chatter: readonly string[];
    returns: readonly string[];
    idle: readonly string[];
    /** Said once per appearance after `windDownAfter` lines; then the
     * bubble goes quiet (only idle lines after that). */
    windDown: string;
    windDownAfter: number;
    idleAfterSeconds: number;
    idleCooldownSeconds: number;
  },
  { thinkingChance = 0.25 }: ScriptOptions = {},
): SpeechBubbleScript {
  const nextChatter = picker(chatter);
  const nextReturn = picker(returns);
  const nextIdle = picker(idle);
  let pending: string | null = null; // line queued behind a "…" beat
  let lastWasThinking = false;
  let lastIdleAt = -Infinity;
  let woundDown = false;

  const maybeThink = (line: string): SpeechBubbleLine | string => {
    if (!lastWasThinking && Math.random() < thinkingChance) {
      pending = line;
      lastWasThinking = true;
      return THINKING;
    }
    lastWasThinking = false;
    return line;
  };

  return (ctx: SpeechBubbleContext) => {
    const now = performance.now() / 1000;

    if (ctx.reason === "show") {
      pending = null;
      lastWasThinking = false;
      woundDown = false;
      return ctx.appearance === 1 ? opening[0] : nextReturn();
    }

    if (pending) {
      const line = pending;
      pending = null;
      lastWasThinking = false;
      return line;
    }

    // Rest of the opening sequence (first appearance only) — never
    // interrupted, not even by an idle nudge.
    if (ctx.appearance === 1 && ctx.lineInAppearance < opening.length) {
      return opening[ctx.lineInAppearance];
    }

    // Visitor has gone still → nudge them (rate-limited).
    if (
      ctx.idleSeconds >= idleAfterSeconds &&
      now - lastIdleAt >= idleCooldownSeconds
    ) {
      lastIdleAt = now;
      lastWasThinking = false;
      return nextIdle();
    }

    if (woundDown) return null; // quiet; only idle nudges from here

    if (ctx.lineInAppearance >= windDownAfter) {
      woundDown = true;
      return { text: windDown, holdSeconds: 3.5 };
    }

    return maybeThink(nextChatter());
  };
}

/** Defers building a script until its first call. Scripts only ever run in
 * the browser (from the bubble's effect), so anything inside the factory can
 * safely read `window`/`Date` — while creating the script itself stays safe
 * during server rendering. */
function lazy(factory: () => SpeechBubbleScript): SpeechBubbleScript {
  let script: SpeechBubbleScript | null = null;
  return (ctx) => (script ??= factory())(ctx);
}

/** Left bubble — the greeting, shown only at scroll position 0. */
export function createGreetingScript(): SpeechBubbleScript {
  return lazy(() => {
    // Only mention the custom cursor to visitors who actually have it
    // (fine pointers — touch devices keep the native cursor).
    const hasCustomCursor = window.matchMedia("(pointer: fine)").matches;
    return personality({
    opening: ["hey, there!", "nice to meet you!"],
    chatter: [
      "I'm Jon, by the way.",
      "welcome to my little corner of the internet.",
      timeOfDayLine(),
      "make yourself at home.",
      "yes, this is my good side.",
      "I promise I blink sometimes.",
      ...(hasCustomCursor ? ["like the cursor? pretty cool, eh?"] : []),
      "try clicking on that green circle",
    ],
    returns: [
      "oh, you're back",
      "missed me?",
      "welcome back!",
      "back already?",
      "I knew you'd come back.",
    ],
    idle: [
      "still there?",
      "psst... try scrolling",
      "take your time. I'm not going anywhere.",
      "I can wait. I'm a deterministic speech bubble, after all.",
    ],
    windDown: "anyway… I'll be right here.",
    windDownAfter: 9,
    idleAfterSeconds: 10,
    idleCooldownSeconds: 14,
    });
  });
}

/** Right bubble — the "about me" teaser, shown inside a scroll range. */
export function createAboutScript(): SpeechBubbleScript {
  return lazy(() => personality(
    {
      opening: ["let me tell you a bit about myself."],
      chatter: [
        "okay, story time.",
        "tl;dr: I'm Jon, if you haven't got that yet.",
        "fair warning: this part is all about me.",
        "spoiler: I'm the main character here.",
        "it's more fun than my LinkedIn, promise.",
        "sooo... where to start?",
      ],
      returns: [
        "where were we?",
        "as I was saying…",
        "ah, round two.",
        "okay, from the top.",
      ],
      idle: ["lost in thought? me too.", "I'll wait for the dramatic pause."],
      windDown: "…okay, I'll let the rest of the page talk.",
      windDownAfter: 7,
      idleAfterSeconds: 8,
      idleCooldownSeconds: 12,
    },
    { thinkingChance: 0.2 },
  ));
}

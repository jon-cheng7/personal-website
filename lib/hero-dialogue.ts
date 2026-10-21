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

/** Where the idle state machine is. See `personality()`.
 *
 *   normal ──(visitor idle ≥ idleAfterSeconds)──▶ one `idle` line ──▶ quiet
 *     ▲                                                                  │
 *     └──────(one `returns` line)◀──(visitor active again)───────────────┘
 */
type IdleMode = "normal" | "quiet";

/** Shared "personality" engine: an opening sequence on first appearance,
 * a different opener when the visitor comes back, occasional thinking
 * beats, winding down after a while instead of looping forever — and a
 * small idle state machine layered on top:
 *
 * - NORMAL: opening → chatter (with thinking beats) → wind-down, as usual.
 * - Visitor idle for `idleAfterSeconds` → say exactly ONE `idle` line, then
 *   go QUIET: return null (say nothing) for as long as they stay idle. No
 *   repeated nudges, no chatter.
 * - Visitor active again → one `returns` line, then back to NORMAL, picking
 *   up exactly where it left off (same shuffled chatter bag, same wind-down
 *   progress — idle/return lines don't count toward wind-down).
 *
 * Idleness comes from `ctx.idleSeconds` (time since the last pointer move,
 * scroll, touch or key press — tracked by the bubble component). */
function personality(
  {
    opening,
    chatter,
    returns,
    idle,
    windDown,
    windDownAfter,
    idleAfterSeconds,
  }: {
    opening: readonly string[];
    chatter: readonly string[];
    /** Used both when the bubble re-appears (scrolling back into its range)
     * and when the visitor comes back from being idle. */
    returns: readonly string[];
    /** One of these is said when the visitor goes idle — then silence. */
    idle: readonly string[];
    /** Said once per appearance after `windDownAfter` normal lines; after
     * that the bubble stays quiet (idle/return lines still happen). */
    windDown: string;
    windDownAfter: number;
    idleAfterSeconds: number;
  },
  { thinkingChance = 0.25 }: ScriptOptions = {},
): SpeechBubbleScript {
  const nextChatter = picker(chatter);
  const nextReturn = picker(returns);
  const nextIdle = picker(idle);
  let pending: string | null = null; // line queued behind a "…" beat
  let lastWasThinking = false;
  let woundDown = false;
  let mode: IdleMode = "normal";
  // Normal-dialogue lines said this appearance (opening, chatter, "…"
  // beats, wind-down). Kept separately from ctx.lineInAppearance so idle and
  // return lines don't push the bubble toward winding down, and so the
  // opening resumes at the right line.
  let normalLines = 0;

  const maybeThink = (line: string): SpeechBubbleLine | string => {
    if (!lastWasThinking && Math.random() < thinkingChance) {
      pending = line;
      lastWasThinking = true;
      return THINKING;
    }
    lastWasThinking = false;
    return line;
  };

  /** Next line of ordinary dialogue (the pre-idle-machine behaviour). */
  const normalLine = (ctx: SpeechBubbleContext): SpeechBubbleLine | string | null => {
    if (pending) {
      const line = pending;
      pending = null;
      lastWasThinking = false;
      normalLines++;
      return line;
    }
    if (ctx.appearance === 1 && normalLines < opening.length) {
      return opening[normalLines++];
    }
    if (woundDown) return null;
    if (normalLines >= windDownAfter) {
      woundDown = true;
      normalLines++;
      return { text: windDown, holdSeconds: 3.5 };
    }
    normalLines++;
    return maybeThink(nextChatter());
  };

  return (ctx: SpeechBubbleContext) => {
    if (ctx.reason === "show") {
      // A fresh appearance always starts in NORMAL (the opener is already a
      // "welcome back" line on later appearances).
      pending = null;
      lastWasThinking = false;
      woundDown = false;
      mode = "normal";
      normalLines = 1;
      return ctx.appearance === 1 ? opening[0] : nextReturn();
    }

    const isIdle = ctx.idleSeconds >= idleAfterSeconds;

    if (mode === "quiet") {
      if (isIdle) return null; // stay silent while they're away
      mode = "normal";
      return nextReturn(); // …then normal dialogue resumes next time
    }

    // NORMAL. A queued line behind a "…" beat and the opening sequence are
    // never interrupted by going idle — the idle line follows them.
    const midThought = pending !== null;
    const inOpening = ctx.appearance === 1 && normalLines < opening.length;
    if (isIdle && !midThought && !inOpening) {
      mode = "quiet";
      lastWasThinking = false;
      return nextIdle(); // exactly one; QUIET from the next call onward
    }

    return normalLine(ctx);
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
    idleAfterSeconds: 20,
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
      idleAfterSeconds: 30,
    },
    { thinkingChance: 0.2 },
  ));
}

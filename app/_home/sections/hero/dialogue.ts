// Speech-bubble scripts for the hero portrait (what the bubbles say + when).
// Fits: createXScript() → SpeechBubble `script` prop in hero.tsx. Edit lines here.

import type {
  SpeechBubbleContext,
  SpeechBubbleLine,
  SpeechBubbleScript,
} from "@/components/ui/speech-bubble";

/** "…" beat shown before some lines. */
const THINKING: SpeechBubbleLine = { text: "…", holdSeconds: 0.9 };

/** Shuffled, non-repeating line picker. */
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

/** Greeting by local time. */
function timeOfDayLine(): string {
  const h = new Date().getHours();
  if (h < 5) return "up late, huh?";
  if (h < 12) return "good morning, by the way.";
  if (h < 17) return "good afternoon, by the way.";
  if (h < 22) return "good evening, by the way.";
  return "burning the midnight oil?";
}

/** thinkingChance: 0–1 chance of a "…" beat. */
type ScriptOptions = {
  thinkingChance?: number;
};

/** Idle state machine: normal → (idle line) → quiet → (return line) → normal. */
type IdleMode = "normal" | "quiet";

/** Script engine: opening → chatter (+thinking) → wind-down; one idle line then silent; return line on activity. */
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
    returns: readonly string[];
    idle: readonly string[];
    windDown: string;
    windDownAfter: number;
    idleAfterSeconds: number;
  },
  { thinkingChance = 0.25 }: ScriptOptions = {},
): SpeechBubbleScript {
  const nextChatter = picker(chatter);
  const nextReturn = picker(returns);
  const nextIdle = picker(idle);
  let pending: string | null = null;
  let lastWasThinking = false;
  let woundDown = false;
  let mode: IdleMode = "normal";
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
      pending = null;
      lastWasThinking = false;
      woundDown = false;
      mode = "normal";
      normalLines = 1;
      return ctx.appearance === 1 ? opening[0] : nextReturn();
    }

    const isIdle = ctx.idleSeconds >= idleAfterSeconds;

    if (mode === "quiet") {
      if (isIdle) return null;
      mode = "normal";
      return nextReturn();
    }

    const midThought = pending !== null;
    const inOpening = ctx.appearance === 1 && normalLines < opening.length;
    if (isIdle && !midThought && !inOpening) {
      mode = "quiet";
      lastWasThinking = false;
      return nextIdle();
    }

    return normalLine(ctx);
  };
}

/** Defer building until first call (browser-only values safe). */
function lazy(factory: () => SpeechBubbleScript): SpeechBubbleScript {
  let script: SpeechBubbleScript | null = null;
  return (ctx) => (script ??= factory())(ctx);
}

/** Left bubble: greeting, at scroll top. */
export function createGreetingScript(): SpeechBubbleScript {
  return lazy(() => {
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

/** Right bubble: about-me teaser. */
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

// The scripted session the terminal types as you scroll, + suggestion chips once it's live.
// Fits: terminal.tsx plays SESSION via the `session` channel (home.choreo.ts). Outputs come from commands.ts.

/** Typed in order; output is whatever the command really prints. */
export const SESSION = ["whoami", "ls", "ls backend"];

/** Clickable chips under the live prompt. */
export const SUGGESTIONS = ["cat rust", "ls cloud", "tree", "help"];

/** Scroll budget (units) per typed char / pause after Enter / output line. Higher = takes more scroll. */
export const PACE = { char: 1, enter: 3, line: 2 };

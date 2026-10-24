"use client";

// Tech-stack terminal. Types SESSION as you scroll (`session` channel), then goes live:
// every word is a button (click = command typed + run), chips for newcomers, real prompt for coders.
// Fits: <Actor id="talkTech"> (intro heading) + <Actor id="terminal">; where/when → home.choreo.ts (terminal cues).
// Shell → commands.ts. Script → session.ts. Cursor: retro arrow / hand (lib/cursor/modes.ts).
// Keys (bonus): / focus · Enter run · Tab complete · ↑↓ history · Ctrl+L clear · Ctrl+C cancel · Esc leave.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Actor, useChannel } from "@/components/choreo";
import { complete, CWD, run, USER, type Line, type Seg } from "./commands";
import { PACE, SESSION, SUGGESTIONS } from "./session";
import "./terminal.css";

type Entry = { id: number; cmd: string; lines: Line[] };

const TYPE_MS = 28;
const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Terminal() {
  return (
    <>
      <Actor id="talkTech" className="talk-tech-actor">
        <h2 className="talk-tech">Let’s talk tech</h2>
      </Actor>
      <Actor id="terminal" className="term-actor">
        <TerminalWindow />
      </Actor>
    </>
  );
}

function TerminalWindow() {
  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // scripted part -------------------------------------------------------------
  const script = useMemo(
    () =>
      SESSION.map((cmd) => {
        const lines = run(cmd, { history: [] }).lines;
        return { cmd, lines, cost: cmd.length * PACE.char + PACE.enter + lines.length * PACE.line };
      }),
    [],
  );
  const total = script.reduce((s, x) => s + x.cost, 0);
  const [units, setUnits] = useState(0);
  const driven = useChannel("session", (v) => {
    const u = Math.round(Math.min(1, Math.max(0, v)) * total);
    setUnits((p) => (p === u ? p : u));
  });
  const shown = driven ? units : total;
  const ready = shown >= total;

  // live part -----------------------------------------------------------------
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cleared, setCleared] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [melt, setMelt] = useState(false);
  const past = useRef<string[]>([]);
  const cursor = useRef(-1);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const push = useCallback((cmd: string, lines: Line[]) => {
    setEntries((e) => [...e.slice(-60), { id: nextId.current++, cmd, lines }]);
  }, []);

  const execute = useCallback(
    (cmd: string) => {
      setDraft("");
      cursor.current = -1;
      if (cmd.trim()) past.current = [...past.current, cmd.trim()].slice(-50);
      const res = run(cmd, { history: past.current });
      if (res.effect === "clear") {
        setEntries([]);
        setCleared(true);
        return;
      }
      if (res.effect === "melt" && !reduce()) {
        setMelt(true);
        later(() => {
          setMelt(false);
          push(cmd, res.lines);
        }, 1100);
        return;
      }
      push(cmd, res.lines);
    },
    [push, later],
  );

  /** Click path: type it into the prompt visibly, then run. */
  const typeRun = useCallback(
    (cmd: string) => {
      if (busy || !ready) return;
      if (reduce()) return execute(cmd);
      setBusy(true);
      for (let i = 1; i <= cmd.length; i++) later(() => setDraft(cmd.slice(0, i)), i * TYPE_MS);
      later(() => {
        execute(cmd);
        setBusy(false);
      }, cmd.length * TYPE_MS + 140);
    },
    [busy, ready, execute, later],
  );

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (busy) return e.preventDefault();
    if (e.key === "Enter") {
      e.preventDefault();
      execute(draft);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const c = complete(draft);
      if (c.value !== undefined) setDraft(c.value);
      else if (c.options) push(draft, [{ grid: c.options.map((o) => ({ text: o })) }]);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = past.current;
      if (!h.length) return;
      const up = e.key === "ArrowUp";
      const i = cursor.current === -1 ? (up ? h.length - 1 : -1) : cursor.current + (up ? -1 : 1);
      cursor.current = i < 0 ? (up ? 0 : -1) : i >= h.length ? -1 : i;
      setDraft(cursor.current === -1 ? "" : h[cursor.current]);
    } else if (e.key === "Escape") {
      input.current?.blur();
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      execute("clear");
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      push(`${draft}^C`, []);
      setDraft("");
    }
  };

  // scroll output to bottom
  useLayoutEffect(() => {
    const el = screen.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, entries, cleared, melt]);

  // scripted again (scrolled back) → un-clear
  useEffect(() => {
    if (!ready) setCleared(false);
  }, [ready]);

  // "/" from anywhere → focus prompt (only while the terminal is on screen)
  useEffect(() => {
    if (!ready) return;
    const onDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const actor = root.current?.closest<HTMLElement>(".choreo-actor");
      if (!actor || !onScreen(actor)) return;
      e.preventDefault();
      input.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [ready]);

  /** Click empty screen → focus prompt (mouse only; taps shouldn't pop the keyboard). */
  const onScreenClick = (e: MouseEvent) => {
    if (!ready || !window.matchMedia("(pointer: fine)").matches) return;
    if ((e.target as HTMLElement).closest("button, a")) return;
    input.current?.focus({ preventScroll: true });
  };

  const seg = (s: Seg, k: number) => <SegView key={k} s={s} live={ready} onRun={typeRun} />;

  // render the scripted session up to `shown`
  const scripted: ReactNode[] = [];
  let left = shown;
  for (let i = 0; i < script.length && left > 0; i++) {
    const step = script[i];
    const typed = Math.min(step.cmd.length, Math.floor(left / PACE.char));
    const typing = typed < step.cmd.length || left < step.cmd.length * PACE.char + PACE.enter;
    scripted.push(
      <div key={`c${i}`} className="term__line">
        <Prompt />
        <span>{step.cmd.slice(0, typed)}</span>
        {typing && <span className="term__caret" aria-hidden="true" />}
      </div>,
    );
    const outLeft = left - step.cmd.length * PACE.char - PACE.enter;
    const nLines = outLeft <= 0 ? 0 : Math.min(step.lines.length, Math.ceil(outLeft / PACE.line));
    step.lines.slice(0, nLines).forEach((l, j) => scripted.push(<LineView key={`o${i}-${j}`} line={l} seg={seg} />));
    left -= step.cost;
  }

  return (
    <div ref={root} className="term" data-cursor="retro" data-melt={melt || undefined} data-ready={ready || undefined}>
      <div className="term__bar">
        <span className="term__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="term__title">{USER} — {CWD}</span>
        <span className="term__hint">{ready ? <>click any word · press <kbd>/</kbd> to type</> : "scroll to run"}</span>
      </div>

      <div
        ref={screen}
        className="term__screen"
        onClick={onScreenClick}
        onMouseDown={(e) => e.button === 1 && e.preventDefault() /* no middle-click autoscroll */}
      >
        {!(ready && cleared) && <div className="term__script">{scripted}</div>}

        {ready && (
          <div role="log" aria-live="polite" aria-label="terminal output">
            {entries.map((en) => (
              <div key={en.id}>
                <div className="term__line">
                  <Prompt />
                  <span>{en.cmd}</span>
                </div>
                {en.lines.map((l, j) => (
                  <LineView key={j} line={l} seg={seg} />
                ))}
              </div>
            ))}
          </div>
        )}

        {ready && (
          <label className="term__line term__live">
            <Prompt />
            <input
              ref={input}
              className="term__input"
              value={draft}
              onChange={(e) => !busy && setDraft(e.target.value)}
              onKeyDown={onKey}
              onFocus={() => screen.current?.setAttribute("data-lenis-prevent", "")}
              onBlur={() => screen.current?.removeAttribute("data-lenis-prevent")}
              aria-label="terminal command"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              enterKeyHint="go"
            />
          </label>
        )}
      </div>

      <div className="term__chips" aria-hidden={!ready}>
        <span className="term__muted">try</span>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="term__chip" data-cursor="retroHand" tabIndex={ready ? 0 : -1} disabled={!ready || busy} onClick={() => typeRun(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Prompt() {
  return (
    <span className="term__prompt" aria-hidden="true">
      <span className="term__user">{USER}</span>:<span className="term__cwd">{CWD}</span>${" "}
    </span>
  );
}

function LineView({ line, seg }: { line: Line; seg: (s: Seg, k: number) => ReactNode }) {
  if ("grid" in line) return <div className="term__grid">{line.grid.map(seg)}</div>;
  if ("pre" in line) return <pre className={`term__pre term__tone--${line.tone ?? "plain"}`}>{line.pre}</pre>;
  return <div className="term__line">{line.segs.map(seg)}</div>;
}

function SegView({ s, live, onRun }: { s: Seg; live: boolean; onRun: (cmd: string) => void }) {
  const cls = `term__seg term__tone--${s.tone ?? "plain"}`;
  if (s.href)
    return (
      <a className={`${cls} term__link`} data-cursor="retroHand" href={s.href} {...(s.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
        {s.text}
      </a>
    );
  if (s.cmd)
    return (
      <button type="button" className={`${cls} term__word`} data-cursor={live ? "retroHand" : "retro"} tabIndex={live ? 0 : -1} disabled={!live} onClick={() => onRun(s.cmd!)} title={live ? s.cmd : undefined}>
        {s.text}
      </button>
    );
  return <span className={cls}>{s.text}</span>;
}

function onScreen(el: HTMLElement) {
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.5) return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}

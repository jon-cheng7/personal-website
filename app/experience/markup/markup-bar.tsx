"use client";

// Page-view toolbar: same pill as the canvas bar (resume-bar.css), so switching views morphs one bar into the other
// (view transition name "resume-bar"). Interactive view · tools · inks · undo/redo/clear · Save PDF.
// Size (pen / pencil only) pops out above the active tool — fixed-positioned outside the bar, since the bar may scroll.
// Fits: page-view.tsx owns tool/colour/markup state and passes it in.

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { Markup } from "./markup-state";
import { COLOR_IDS, INKS, SIZES, SIZE_SPECS, TOOLS, isSized, type ColorId, type SizedTool, type ToolId } from "./tools";
import "../resume-bar.css";

type Props = {
  tool: ToolId | null;
  onTool: (t: ToolId | null) => void;
  color: ColorId;
  onColor: (c: ColorId) => void;
  /** Size index (SIZES) per sized tool. */
  sizes: Record<SizedTool, number>;
  onSize: (tool: SizedTool, index: number) => void;
  markup: Markup;
  onInteractive: () => void;
};

export function MarkupBar({ tool, onTool, color, onColor, sizes, onSize, markup, onInteractive }: Props) {
  const sized = isSized(tool) ? tool : null;
  const barRef = useRef<HTMLElement>(null);
  const toolEls = useRef<Partial<Record<ToolId, HTMLButtonElement | null>>>({});
  const pop = usePopAnchor(sized ? (toolEls.current[sized] ?? null) : null, barRef);

  return (
    <>
      <nav ref={barRef} className="rc-bar rc-bar--page" aria-label="Resume tools">
        <button type="button" className="rc-bar__btn" onClick={onInteractive}>
          Interactive view <kbd>R</kbd>
        </button>
        <span className="rc-bar__sep" aria-hidden="true" />

        {TOOLS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              toolEls.current[t.id] = el;
            }}
            type="button"
            className="rc-bar__btn mk-tool"
            aria-pressed={tool === t.id}
            title={`${t.label} (${t.key.toUpperCase()})`}
            onClick={() => onTool(tool === t.id ? null : t.id)}
          >
            {ICONS[t.id]}
            <span className="mk-tool__label">{t.label}</span>
            <span className="mk-tool__spec">{isSized(t.id) ? SIZE_SPECS[t.id][sizes[t.id]] : t.spec}</span>
          </button>
        ))}
        <span className="rc-bar__sep" aria-hidden="true" />

        <span className="mk-inks" role="group" aria-label="Ink colour">
          {COLOR_IDS.map((c, i) => (
            <button
              key={c}
              type="button"
              className="mk-ink"
              aria-pressed={color === c}
              aria-label={INKS[c].label}
              title={`${INKS[c].label} (${i + 1})`}
              style={{ "--ink": INKS[c].base, "--ink-tail": INKS[c].tail } as CSSProperties}
              onClick={() => {
                onColor(c);
                if (!tool || tool === "eraser") onTool("pen");
              }}
            />
          ))}
        </span>
        <span className="rc-bar__sep" aria-hidden="true" />

        <button type="button" className="rc-bar__btn mk-icon" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled={!markup.canUndo} onClick={markup.undo}>
          {ICONS.undo}
        </button>
        <button type="button" className="rc-bar__btn mk-icon" aria-label="Redo" title="Redo (Shift Ctrl/⌘ Z)" disabled={!markup.canRedo} onClick={markup.redo}>
          {ICONS.redo}
        </button>
        <button type="button" className="rc-bar__btn mk-clear" disabled={markup.marks.length === 0} onClick={markup.clear}>
          Clear
        </button>
        <span className="rc-bar__sep" aria-hidden="true" />

        <button type="button" className="rc-bar__btn rc-bar__btn--accent" onClick={() => window.print()}>
          Save PDF
        </button>
      </nav>

      {sized && pop && (
        <div
          key={sized}
          className="mk-sizepop"
          role="group"
          aria-label={`${sized === "pen" ? "Pen" : "Pencil"} size`}
          style={{ left: pop.x, bottom: pop.bottom }}
        >
          {SIZES.map((_, i) => (
            <button
              key={i}
              type="button"
              className="mk-size"
              aria-pressed={sizes[sized] === i}
              aria-label={SIZE_NAMES[i]}
              title={`${SIZE_NAMES[i]} · ${SIZE_SPECS[sized][i]} ([ / ])`}
              onClick={() => onSize(sized, i)}
            >
              <span style={{ width: 3 + i * 2.5, height: 3 + i * 2.5 }} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const SIZE_NAMES = ["Fine", "Medium", "Bold"];

/** Viewport anchor above a bar button (centre x, distance from the bottom); follows resize + bar scroll. */
function usePopAnchor(el: HTMLElement | null, bar: RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ x: number; bottom: number } | null>(null);
  useLayoutEffect(() => {
    if (!el) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = el.getBoundingClientRect();
      const b = bar.current?.getBoundingClientRect() ?? r;
      const x = Math.min(innerWidth - 70, Math.max(70, r.left + r.width / 2)); // keep the pop on screen
      setPos({ x, bottom: innerHeight - b.top + 8 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    const b = bar.current;
    b?.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      b?.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [el, bar]);
  return pos;
}

const icon = (d: string): ReactNode => (
  <svg className="mk-glyph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS: Record<ToolId | "undo" | "redo", ReactNode> = {
  pen: icon("M2.5 13.5l1-3.6 7.3-7.3a1.4 1.4 0 012 0l.6.6a1.4 1.4 0 010 2l-7.3 7.3zM9.6 3.8l2.6 2.6"),
  pencil: icon("M2.5 13.5l.9-3.2 7.8-7.8 2.3 2.3-7.8 7.8zM3.4 10.3l2.3 2.3M9.9 3.8l2.3 2.3"),
  marker: icon("M2 14.2h12M4.6 11.6l.9-3.3 5.6-5.6 2.4 2.4-5.6 5.6zM4.6 11.6l-1.1 1.1"),
  eraser: icon("M6.2 13.5h7.3M3 9.7l6.2-6.2a1.4 1.4 0 012 0l2.1 2.1a1.4 1.4 0 010 2l-6 6H5.1L3 11.5a1.3 1.3 0 010-1.8zM6.4 6.3l4.1 4.1"),
  undo: icon("M5.5 3.8L2.5 6.8l3 3M2.5 6.8h7a3.6 3.6 0 010 7.2H7"),
  redo: icon("M10.5 3.8l3 3-3 3M13.5 6.8h-7a3.6 3.6 0 000 7.2H9"),
};

"use client";

// Page view of /experience: the paper sheet + markup (draw / highlight on it) + the page toolbar.
// Owns tool, ink, and the markup document (per visitor, per resume version, per layout).
// Keys: P pen · B pencil · H highlight · E erase · Esc put tool down · 1–3 ink · [ ] size · ⌘/Ctrl Z undo · ⇧⌘/Ctrl Z or Ctrl Y redo.
// Print: the sheet prints at its on-screen page layout, scaled to fit one letter page (--print-zoom), so marks line up.
// Fits: resume-experience.tsx (mode "page"/"auto"). Sheet → resume-sheet.tsx. Markup → markup/*.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/page-shell";
import type { Resume } from "@/lib/resume";
import { hash } from "./canvas/board";
import { MarkupBar } from "./markup/markup-bar";
import { MarkupLayer } from "./markup/markup-layer";
import { useMarkup } from "./markup/markup-state";
import { COLOR_IDS, SIZES, TOOLS, isSized, type ColorId, type SizedTool, type ToolId } from "./markup/tools";
import { ResumeSheet } from "./resume-sheet";
import "./markup/markup.css";

/** Letter page height in CSS px, minus a hair so rounding never spills to page 2. */
const PRINT_H = 1050;

export function PageView({ resume, onInteractive }: { resume: Resume; onInteractive: () => void }) {
  const [tool, setTool] = useState<ToolId | null>(null);
  const [color, setColor] = useState<ColorId>("lime");
  const [sizes, setSizes] = useState<Record<SizedTool, number>>({ pen: 0, pencil: 0 });
  const onSize = useCallback((t: SizedTool, i: number) => setSizes((s) => ({ ...s, [t]: i })), []);
  const readout = useRef<HTMLParagraphElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // marks belong to this resume text + this layout (narrow screens reflow the sheet)
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("screen and (max-width: 900px)"); // "screen": printing never counts as narrow
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const version = useMemo(() => hash(JSON.stringify(resume)).toString(36), [resume]);
  const markup = useMarkup(`resume-marks:v1:${version}:${narrow ? "flow" : "page"}`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toLowerCase();
      if (e.metaKey || e.ctrlKey) {
        if (k === "z" && !e.shiftKey) markup.undo();
        else if ((k === "z" && e.shiftKey) || k === "y") markup.redo();
        else return;
        e.preventDefault();
        return;
      }
      if (e.altKey) return;
      const picked = TOOLS.find((x) => x.key === k);
      if (picked) setTool((cur) => (cur === picked.id ? null : picked.id));
      else if (k === "escape") setTool(null);
      else if ((k === "[" || k === "]") && isSized(tool)) {
        const t = tool;
        setSizes((s) => ({ ...s, [t]: Math.max(0, Math.min(SIZES.length - 1, s[t] + (k === "]" ? 1 : -1))) }));
      } else if (/^[1-9]$/.test(k) && COLOR_IDS[+k - 1]) setColor(COLOR_IDS[+k - 1]);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [markup.undo, markup.redo, tool]);

  // print fit: measure the sheet in its page layout, scale it onto one letter page (on mount too: printing from
  // the canvas mounts this view inside beforeprint)
  useLayoutEffect(() => {
    const fit = () => {
      const sheet = root.current?.querySelector<HTMLElement>(".resume-sheet");
      if (!sheet) return;
      sheet.classList.add("resume-sheet--fit");
      const h = sheet.offsetHeight;
      sheet.classList.remove("resume-sheet--fit");
      sheet.style.setProperty("--print-zoom", Math.min(1, PRINT_H / h).toFixed(4));
    };
    fit();
    window.addEventListener("beforeprint", fit);
    return () => window.removeEventListener("beforeprint", fit);
  }, []);

  return (
    <div ref={root} className="resume-x__page">
      <PageShell>
        <ResumeSheet
          resume={resume}
          overlay={
            <MarkupLayer
              markup={markup}
              tool={tool}
              color={color}
              size={SIZES[isSized(tool) ? sizes[tool] : 1]}
              flow={narrow}
              readout={readout}
            />
          }
        />
      </PageShell>
      <p ref={readout} className="mk-readout" aria-hidden="true" />
      <MarkupBar
        tool={tool}
        onTool={setTool}
        color={color}
        onColor={setColor}
        sizes={sizes}
        onSize={onSize}
        markup={markup}
        onInteractive={onInteractive}
      />
    </div>
  );
}

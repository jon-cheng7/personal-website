// Scene content for /experience: one role / project / school (ItemScene), the skills rows (SkillsScene),
// and the sheet heading highlighter (SheetMark, page view).
// Fits: cards on the canvas (resume-canvas.tsx) pass `reveal` = how many lines/bullets/rows are lit
// (fractional = mid-reveal). No reveal → everything lit (static use).

"use client";

import type { CSSProperties } from "react";
import type { SceneItem, SceneSection } from "./scene-model";

/** Lit-ness style for revealable #i. */
function lit(reveal: number | undefined, i: number): CSSProperties | undefined {
  if (reveal === undefined) return undefined;
  const p = Math.min(1, Math.max(0, reveal - i));
  return { opacity: 0.14 + 0.86 * p, transform: p >= 1 ? undefined : `translateY(${((1 - p) * 0.35).toFixed(3)}em)` };
}

/** Heading text on the sheet (anchor kept for future use). */
export function SheetMark({ id, title }: { id: string; title: string }) {
  return (
    <span className="resume-sheet__mark" data-anchor={`sheet:${id}:title`}>
      {title}
    </span>
  );
}

/** Revealables in an item: lines then bullets. */
export const itemSteps = (it: SceneItem) => it.lines.length + it.bullets.length;

/** One role / project / school. Left: where + when. Right: title, lines, bullets. */
export function ItemScene({
  item,
  index,
  total,
  section,
  reveal,
}: {
  item: SceneItem;
  index: number;
  total: number;
  section: string;
  reveal?: number;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  let r = 0;
  return (
    <div className="rs-item">
      <aside className="rs-item__side">
        <p className="rs-item__index">
          {section} · {pad(index + 1)} / {pad(total)}
        </p>
        {item.kicker && <p className="rs-item__kicker">{item.kicker}</p>}
        {item.meta.map((m) => (
          <p key={m} className="rs-item__meta">
            {m}
          </p>
        ))}
      </aside>
      <div className="rs-item__main">
        <h3 className="rs-item__title">{item.title}</h3>
        {item.lines.map((l) => (
          <p key={l} className="rs-item__line" style={lit(reveal, r++)}>
            {l}
          </p>
        ))}
        {item.bullets.length > 0 && (
          <ul className="rs-item__bullets">
            {item.bullets.map((b, i) => (
              <li key={i} style={lit(reveal, r++)}>
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Skills table as labelled rows of chips; each row lights as one step. */
export function SkillsScene({ section, reveal }: { section: Extract<SceneSection, { kind: "skills" }>; reveal?: number }) {
  return (
    <div className="rs-skills">
      <p className="rs-item__index">{section.title}</p>
      {section.rows.map((row, i) => (
        <div key={row.label} className="rs-skills__row" style={lit(reveal, i)}>
          <p className="rs-skills__label">{row.label}</p>
          <ul className="rs-skills__chips">
            {row.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

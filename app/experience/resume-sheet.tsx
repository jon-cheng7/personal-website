// The resume as a sheet of paper — same structure as the PDF, rendered from Resume data.
// Fits: /experience — the readable page (TL;DR / print) and, with `world`, the paper the camera dives into.
// Anchors for the camera: "sheet:page", "sheet:<section>:title". Headings carry the highlighter (SheetMark).
// overlay = layer drawn over the paper in its own box (markup, page view).

import type { ReactNode } from "react";
import type { Entry, Resume } from "@/lib/resume";
import { SheetMark } from "./resume-scenes";
import "./resume-sheet.css";

/** world = big-type copy for the camera (crisp when zoomed); otherwise a normal readable page. */
export function ResumeSheet({ resume, world, overlay }: { resume: Resume; world?: boolean; overlay?: ReactNode }) {
  return (
    <article
      className={world ? "resume-sheet resume-sheet--world" : "resume-sheet"}
      aria-label={`${resume.name} — resume`}
      aria-hidden={world || undefined}
      data-anchor="sheet:page"
    >
      <header className="resume-sheet__head">
        <h1>{resume.name}</h1>
        <p className="resume-sheet__contact">
          {resume.contact.map((c, i) => (
            <span key={i}>
              {c.href ? (
                <a href={c.href} {...(c.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                  {c.text}
                </a>
              ) : (
                c.text
              )}
            </span>
          ))}
        </p>
      </header>

      {resume.sections.map((s) => (
        <section key={s.id} id={world ? undefined : s.id} className="resume-sheet__section">
          <h2>
            <SheetMark id={s.id} title={s.title} />
          </h2>
          {s.blocks.map((b, i) => {
            switch (b.kind) {
              case "group":
                return (
                  <div key={i} className="resume-sheet__group">
                    <Row left={<h3 className="resume-sheet__org">{b.title}</h3>} right={b.right} />
                    {b.entries.map((e, j) => (
                      <EntryView key={j} entry={e} />
                    ))}
                  </div>
                );
              case "entry":
                return <EntryView key={i} entry={b} />;
              case "table":
                return (
                  <dl key={i} className="resume-sheet__table">
                    {b.rows.map((r) => (
                      <div key={r.label}>
                        <dt>{r.label}:</dt>
                        <dd>{r.items.join(", ")}</dd>
                      </div>
                    ))}
                  </dl>
                );
              case "text":
                return <p key={i}>{b.text}</p>;
            }
          })}
        </section>
      ))}
      {overlay}
    </article>
  );
}

function EntryView({ entry }: { entry: Entry }) {
  return (
    <div className="resume-sheet__entry">
      <Row
        left={<h3>{entry.title}</h3>}
        right={entry.right}
        italic={entry.rightItalic}
      />
      {entry.lines.map((l, i) => (
        <Row key={i} left={<span>{l.left}</span>} right={l.right} />
      ))}
      {entry.bullets.length > 0 && (
        <ul>
          {entry.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Left text … right-aligned text (LaTeX \hfill). */
function Row({ left, right, italic }: { left: ReactNode; right?: string; italic?: boolean }) {
  return (
    <div className="resume-sheet__row">
      {left}
      {right && <span className={italic ? "resume-sheet__right resume-sheet__right--i" : "resume-sheet__right"}>{right}</span>}
    </div>
  );
}

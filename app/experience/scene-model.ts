// Resume → what the scroll scenes show: sections in page order, each as items (role/project/school) or a skills grid.
// Fits: resume.choreo.ts (timing) + resume-scenes.tsx (rendering) both read this. Pure; regenerated on every resume update.

import type { Entry, Resume } from "@/lib/resume";

/** One full-screen beat: a role, project or school. */
export type SceneItem = {
  key: string;
  /** Above the title (company for roles). */
  kicker?: string;
  title: string;
  /** Small facts: dates, location, tech. */
  meta: string[];
  /** Plain lines (degree, honours). */
  lines: string[];
  bullets: string[];
};

export type SceneSection =
  | { id: string; title: string; kind: "items"; items: SceneItem[] }
  | { id: string; title: string; kind: "skills"; rows: { label: string; items: string[] }[] };

/** Section ids shown first / last (in these orders); everything else in resume order between. */
const LEAD = ["experience", "projects"];
const TRAIL = ["education"];

export function sceneSections(resume: Resume): SceneSection[] {
  const out = resume.sections.map((s): SceneSection => {
    const table = s.blocks.find((b) => b.kind === "table");
    if (table && table.kind === "table") return { id: s.id, title: s.title, kind: "skills", rows: table.rows };
    const items: SceneItem[] = [];
    s.blocks.forEach((b, i) => {
      if (b.kind === "group") b.entries.forEach((e, j) => items.push(item(e, `${s.id}-${i}-${j}`, b.title, b.right)));
      else if (b.kind === "entry") items.push(item(b, `${s.id}-${i}`));
      else if (b.kind === "text") items.push({ key: `${s.id}-${i}`, title: b.text, meta: [], lines: [], bullets: [] });
    });
    return { id: s.id, title: s.title, kind: "items", items };
  });
  const rank = (id: string) =>
    LEAD.includes(id) ? LEAD.indexOf(id) : TRAIL.includes(id) ? 100 + TRAIL.indexOf(id) : LEAD.length;
  return out
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s.id) - rank(b.s.id) || a.i - b.i)
    .map((x) => x.s)
    .filter((s) => (s.kind === "items" ? s.items.length : s.rows.length));
}

function item(e: Entry, key: string, kicker?: string, groupRight?: string): SceneItem {
  return {
    key,
    kicker,
    title: e.title,
    meta: [e.right, ...e.lines.map((l) => l.right), groupRight].filter((m): m is string => !!m),
    lines: e.lines.map((l) => l.left),
    bullets: e.bullets,
  };
}

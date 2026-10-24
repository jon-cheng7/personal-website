// Resume data shape — what parse.ts produces from resume.tex. Plain text only (LaTeX already stripped).
// Fits: everything resume-related reads this (sheet, scenes, TL;DR, JSON-LD). Never hand-written.

export type Resume = {
  name: string;
  /** Header contact line, in order. href = link (mailto / https). */
  contact: { text: string; href?: string }[];
  sections: Section[];
};

export type Section = {
  /** Slug of the title ("technical-skills"). Stable anchor for dives / links. */
  id: string;
  title: string;
  blocks: Block[];
};

export type Block = Group | Entry | Table | Text;

/** `\textbf{\large X}` heading — e.g. a company holding several roles. */
export type Group = { kind: "group"; title: string; right?: string; entries: Entry[] };

/** `\textbf{X} \hfill right` heading + its lines and bullets — a role, school, project. */
export type Entry = {
  kind: "entry";
  title: string;
  /** Right-aligned text (dates, location, tech list). */
  right?: string;
  /** Right text was \textit (e.g. a project's tech list). */
  rightItalic?: boolean;
  /** Plain lines under the heading ("Bachelor of… \hfill Apr 2026"). */
  lines: { left: string; right?: string }[];
  bullets: string[];
};

/** tabular/tabularx — e.g. skills: "Languages:" → [Python, Java…]. */
export type Table = { kind: "table"; rows: { label: string; items: string[] }[] };

/** Free paragraph with no heading above it. */
export type Text = { kind: "text"; text: string };

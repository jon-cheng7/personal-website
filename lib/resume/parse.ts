// resume.tex → Resume data. Pure (no fetch/DOM). Strict: anything unrecognised throws ResumeParseError
// with a snippet, so a format change fails the build instead of shipping raw LaTeX.
// Fits: lib/resume/index.ts (getResume). Understands plain LaTeX: \section, \textbf{…} \hfill …,
// itemize/enumerate, tabular/tabularx, \href. New construct in resume.tex → teach it here.

import type { Block, Entry, Group, Resume, Section, Table } from "./types";

export class ResumeParseError extends Error {
  name = "ResumeParseError";
}

/** Parse the whole file. */
export function parseResume(tex: string): Resume {
  const src = stripComments(tex);
  const body = between(src, "\\begin{document}", "\\end{document}");
  if (body === null) fail("no \\begin{document} … \\end{document}");

  const parts = body!.split(/\\section\*?\s*\{/);
  const header = parts[0];
  const sections: Section[] = parts.slice(1).map((chunk) => {
    const close = matchBrace(chunk, -1);
    const title = clean(chunk.slice(0, close));
    return { id: slug(title), title, blocks: parseBlocks(chunk.slice(close + 1), title) };
  });
  if (!sections.length) fail("no \\section found");

  const { name, contact } = parseHeader(header);
  return { name, contact, sections };
}

// --- header ------------------------------------------------------------------

function parseHeader(src: string) {
  const s = src.replace(/\\(begin|end)\{center\}/g, "");
  // name = the first bold group: {\LARGE\bfseries Name} or \textbf{Name}
  let name = "";
  let rest = s;
  const bf = s.indexOf("\\bfseries");
  const tb = s.indexOf("\\textbf{");
  if (bf >= 0 && (tb < 0 || bf < tb)) {
    const open = s.lastIndexOf("{", bf);
    const close = matchBrace(s, open);
    name = clean(s.slice(open + 1, close));
    rest = s.slice(close + 1);
  } else if (tb >= 0) {
    const open = tb + "\\textbf".length;
    const close = matchBrace(s, open);
    name = clean(s.slice(open + 1, close));
    rest = s.slice(close + 1);
  }
  if (!name) fail("header: can't find the name (expected {\\LARGE\\bfseries Name} or \\textbf{Name})");

  rest = rest.replace(/^\s*\\\\(\[[^\]]*\])?/, "");
  const contact = rest
    .split("|")
    .map((part) => {
      const link = part.match(/\\href\{([^{}]*)\}\{([^{}]*)\}/);
      if (link) return { text: clean(link[2]), href: link[1] };
      const url = part.match(/\\url\{([^{}]*)\}/);
      if (url) return { text: url[1], href: url[1] };
      return { text: clean(part) };
    })
    .filter((c) => c.text);
  return { name, contact };
}

// --- section bodies ----------------------------------------------------------

const ENV = /\\begin\{(itemize|enumerate|tabularx|tabular)\}/g;

function parseBlocks(src: string, section: string): Block[] {
  const out: Block[] = [];
  // current heading context (object so the closure + loop share it)
  const cur: { group: Group | null; entry: Entry | null } = { group: null, entry: null };

  const push = (b: Block) => {
    if (b.kind === "entry" && cur.group) cur.group.entries.push(b);
    else out.push(b);
  };

  const paragraphs = (text: string) => {
    for (const raw of text.split(/\n\s*\n/)) {
      const p = raw
        .replace(/\\(vspace|hspace)\*?\{[^}]*\}/g, "")
        .replace(/\\(smallskip|medskip|bigskip|noindent|par|newline)\b/g, "")
        .trim();
      if (!p) continue;
      if (/\\begin\{/.test(p)) fail(`${section}: unsupported environment "${p.match(/\\begin\{([^}]*)\}/)![1]}"`, p);

      const [leftRaw, ...rightParts] = p.split("\\hfill");
      const rightRaw = rightParts.join(" ").trim();
      const left = leftRaw.trim();

      if (left.startsWith("\\textbf{") && matchBrace(left, 7) === left.length - 1) {
        const inner = left.slice(8, -1);
        const title = clean(inner);
        const rightItalic = /^\\textit\{/.test(rightRaw);
        const right = rightRaw ? clean(rightRaw) : undefined;
        if (/\\(large|Large)\b/.test(inner)) {
          cur.group = { kind: "group", title, right, entries: [] };
          cur.entry = null;
          out.push(cur.group);
        } else {
          cur.entry = { kind: "entry", title, right, rightItalic: rightItalic || undefined, lines: [], bullets: [] };
          push(cur.entry);
        }
      } else if (cur.entry) {
        cur.entry.lines.push({ left: clean(left), right: rightRaw ? clean(rightRaw) : undefined });
      } else {
        out.push({ kind: "text", text: clean(p.replace(/\\hfill/g, " ")) });
      }
    }
  };

  let i = 0;
  for (const m of src.matchAll(ENV)) {
    if (m.index! < i) continue;
    paragraphs(src.slice(i, m.index));
    const env = m[1];
    const endTag = `\\end{${env}}`;
    const end = src.indexOf(endTag, m.index!);
    if (end < 0) fail(`${section}: unclosed ${env}`);
    let inner = src.slice(m.index! + m[0].length, end);
    if (env === "itemize" || env === "enumerate") {
      inner = inner.replace(/^\s*\[[^\]]*\]/, ""); // optional [options]
      const bullets = inner.split(/\\item\b/).slice(1).map((b) => clean(b)).filter(Boolean);
      if (!bullets.length) fail(`${section}: empty list`);
      if (cur.entry) cur.entry.bullets.push(...bullets);
      else bullets.forEach((text) => out.push({ kind: "text", text }));
    } else {
      // skip column spec args: tabularx {width}{cols}, tabular {cols}
      let args = env === "tabularx" ? 2 : 1;
      inner = inner.trimStart();
      while (args-- > 0 && inner.startsWith("{")) inner = inner.slice(matchBrace(inner, 0) + 1).trimStart();
      out.push(parseTable(inner, section));
    }
    i = end + endTag.length;
  }
  paragraphs(src.slice(i));
  return out;
}

function parseTable(src: string, section: string): Table {
  const rows = src
    .split(/\\\\(?:\[[^\]]*\])?/)
    .map((r) => r.replace(/\\(hline|toprule|midrule|bottomrule)\b/g, "").trim())
    .filter(Boolean)
    .map((r) => {
      const cells = r.split(/(?<!\\)&/);
      if (cells.length < 2) fail(`${section}: table row needs "label & items"`, r);
      const label = clean(cells[0]).replace(/:\s*$/, "");
      const items = splitTop(clean(cells.slice(1).join(" "))).filter(Boolean);
      return { label, items };
    });
  return { kind: "table", rows };
}

// --- text cleanup ------------------------------------------------------------

const WRAPPERS = /\\(textbf|textit|textsl|emph|underline|texttt|textsc|textnormal|mbox|text)\s*(?=\{)/g;
const SWITCHES = /\\(tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge|bfseries|itshape|slshape|scshape|ttfamily|rmfamily|sffamily|mdseries|upshape|centering)\b/g;

/** LaTeX inline → plain text. Unknown \command → ResumeParseError. */
export function clean(s: string): string {
  let t = s
    .replace(/\\href\{[^{}]*\}\{([^{}]*)\}/g, "$1")
    .replace(/\\url\{([^{}]*)\}/g, "$1")
    .replace(/\\(vspace|hspace)\*?\{[^}]*\}/g, " ")
    .replace(WRAPPERS, "")
    .replace(SWITCHES, "")
    .replace(/\\(quad|qquad|hfill)\b|\\ /g, " ")
    .replace(/\\\\(\[[^\]]*\])?/g, " ")
    .replace(/\\,/g, "\u2009")
    .replace(/\\([&%$#_{}])/g, (_, c) => `\u0000${c}`) // protect escapes from brace/command stripping
    .replace(/---/g, "\u2014")
    .replace(/--/g, "\u2013")
    .replace(/``/g, "\u201c")
    .replace(/''/g, "\u201d")
    .replace(/(?<!\\)~/g, "\u00a0");
  const unknown = t.match(/\\([a-zA-Z]+)/);
  if (unknown) fail(`unsupported LaTeX command \\${unknown[1]}`, s);
  t = t.replace(/[{}]/g, "").replace(/\u0000/g, "");
  return t.replace(/\s+/g, " ").trim();
}

// --- helpers -----------------------------------------------------------------

function fail(msg: string, context?: string): never {
  const snip = context ? ` — near: "${context.replace(/\s+/g, " ").trim().slice(0, 80)}"` : "";
  throw new ResumeParseError(`resume.tex: ${msg}${snip}`);
}

function stripComments(s: string) {
  return s.replace(/(^|[^\\])%.*$/gm, "$1");
}

function between(s: string, a: string, b: string) {
  const i = s.indexOf(a);
  const j = s.lastIndexOf(b);
  return i < 0 || j < 0 ? null : s.slice(i + a.length, j);
}

/** Index of the brace closing the one at `open` (-1 = string starts just inside a brace). */
function matchBrace(s: string, open: number): number {
  let depth = open < 0 ? 1 : 0;
  for (let i = Math.max(open, 0); i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  fail("unbalanced braces", s.slice(Math.max(open, 0), Math.max(open, 0) + 80));
}

/** Split on commas not inside parentheses. */
function splitTop(s: string) {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of s) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

function slug(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Terminal shell logic: command registry, output model, tab completion. Pure (no React/DOM).
// Fits: terminal.tsx renders Result lines; session.ts scripts commands through run(). Data → content/stack.ts.
// Add a command = add an entry to COMMANDS.

import { STACK, type StackItem, type StackKind } from "@/content/stack";
import { contactInfo, socialLinks } from "@/content/social";

/** Colour of a segment. */
export type Tone = StackKind | "dir" | "accent" | "muted" | "err" | "cmd";

/** Inline piece of output. cmd = click runs it; href = link. */
export type Seg = { text: string; tone?: Tone; cmd?: string; href?: string };

/** Output line: text row | word grid (ls) | preformatted block (ascii). */
export type Line = { segs: Seg[] } | { grid: Seg[] } | { pre: string; tone?: Tone };

/** effect: clear = wipe screen; melt = rm -rf gag. */
export type Result = { lines: Line[]; effect?: "clear" | "melt" };

export type Ctx = { history: string[] };

type Command = {
  /** Shown by `help`. Omit = secret. */
  desc?: string;
  run: (args: string[], ctx: Ctx, raw: string) => Result;
};

/** Prompt identity (user@host). */
export const USER = "guest@jon";
export const CWD = "~/stack";

const DIRS = Object.keys(STACK);
const ITEMS: (StackItem & { dir: string })[] = DIRS.flatMap((dir) => STACK[dir].map((i) => ({ ...i, dir })));

// --- helpers -----------------------------------------------------------------

const text = (...segs: (Seg | string)[]): Line => ({
  segs: segs.map((s) => (typeof s === "string" ? { text: s } : s)),
});
const out = (...lines: Line[]): Result => ({ lines });
const err = (msg: string): Result => out(text({ text: msg, tone: "err" }));
const help = (label = "help"): Seg => ({ text: label, tone: "cmd", cmd: "help" });

/** "~/stack/backend/", "./backend", "backend" → "backend". */
const norm = (p: string) =>
  p.replace(/^~\/stack\/?|^\.\/|^\/home\/jon\/stack\/?/, "").replace(/\/+$/, "").toLowerCase();

const findItem = (q: string) => {
  const n = norm(q);
  const id = n.includes("/") ? n.split("/").pop()! : n;
  return ITEMS.find((i) => i.id === id || (i.name ?? "").toLowerCase() === id);
};

const itemSeg = (i: StackItem): Seg => ({ text: i.id, tone: i.kind, cmd: `cat ${i.id}` });
const dirSeg = (d: string): Seg => ({ text: `${d}/`, tone: "dir", cmd: `ls ${d}` });

/** Drop -flags (ls -la → ls). */
const plain = (args: string[]) => args.filter((a) => !a.startsWith("-"));

// --- commands ----------------------------------------------------------------

const COMMANDS: Record<string, Command> = {
  help: {
    desc: "list commands",
    run: () =>
      out(
        ...Object.entries(COMMANDS)
          .filter(([, c]) => c.desc)
          .map(([name, c]) => text({ text: name, tone: "cmd", cmd: name }, " ".repeat(Math.max(1, 9 - name.length)), { text: c.desc!, tone: "muted" })),
        text({ text: "…and a few secrets.", tone: "muted" }),
      ),
  },

  ls: {
    desc: "list a folder",
    run: (args) => {
      const [p] = plain(args);
      if (!p || norm(p) === "" || p === ".") return out({ grid: DIRS.map(dirSeg) });
      const d = norm(p);
      if (STACK[d]) return out({ grid: STACK[d].map(itemSeg) });
      if (findItem(d)) return out({ grid: [itemSeg(findItem(d)!)] });
      return err(`ls: ${p}: no such file or directory`);
    },
  },

  cat: {
    desc: "about one tech",
    run: (args) => {
      const [p] = plain(args);
      if (!p) return out(text({ text: "usage: cat <tech>   e.g. ", tone: "muted" }, { text: "cat rust", tone: "cmd", cmd: "cat rust" }));
      if (STACK[norm(p)])
        return out(text({ text: `cat: ${p}: is a directory — try `, tone: "err" }, { text: `ls ${norm(p)}`, tone: "cmd", cmd: `ls ${norm(p)}` }));
      const i = findItem(p);
      if (!i) return err(`cat: ${p}: no such file`);
      return out(
        text({ text: i.name ?? i.id, tone: i.kind }, { text: `  ~/stack/${i.dir}`, tone: "muted" }),
        text(i.blurb ?? "in the toolbox."),
        ...(i.since ? [text({ text: `since ${i.since}`, tone: "muted" })] : []),
      );
    },
  },

  tree: {
    desc: "everything at once",
    run: () => {
      const lines: Line[] = [text({ text: "~/stack", tone: "dir" })];
      DIRS.forEach((d, di) => {
        const lastDir = di === DIRS.length - 1;
        lines.push(text({ text: lastDir ? "└── " : "├── ", tone: "muted" }, dirSeg(d)));
        STACK[d].forEach((i, ii) => {
          const last = ii === STACK[d].length - 1;
          lines.push(text({ text: `${lastDir ? "    " : "│   "}${last ? "└── " : "├── "}`, tone: "muted" }, itemSeg(i)));
        });
      });
      lines.push(text({ text: `${DIRS.length} directories, ${ITEMS.length} files`, tone: "muted" }));
      return { lines };
    },
  },

  grep: {
    desc: "search, e.g. grep sql",
    run: (args) => {
      const q = plain(args).join(" ").toLowerCase();
      if (!q) return out(text({ text: "usage: grep <word>", tone: "muted" }));
      const hits = ITEMS.filter((i) => i.id.includes(q) || (i.name ?? "").toLowerCase().includes(q) || (i.blurb ?? "").toLowerCase().includes(q));
      if (!hits.length) return out(text({ text: `no matches for "${q}"`, tone: "muted" }));
      return out(...hits.map((i) => text({ text: `${i.dir}/`, tone: "muted" }, itemSeg(i))));
    },
  },

  whoami: {
    desc: "who's this",
    run: () => out(text({ text: "cool guy", tone: "accent" })),
  },

  contact: {
    desc: "say hi",
    run: () =>
      out(
        text({ text: "email".padEnd(11), tone: "muted" }, { text: contactInfo.email, tone: "accent", href: `mailto:${contactInfo.email}` }),
        ...socialLinks.map((s) => text({ text: s.label.toLowerCase().padEnd(11), tone: "muted" }, { text: s.href.replace(/^https?:\/\/(www\.)?/, "").split("?")[0], tone: "cmd", href: s.href })),
      ),
  },

  clear: { desc: "clear the screen", run: () => ({ lines: [], effect: "clear" }) },

  // secrets ---------------------------------------------------------------------

  /** Denied until `sudo hire jon` has run once (read from history), then a different tune. */
  sudo: {
    run: (args, ctx, raw) => {
      const hire = /^sudo\s+hire\s+jon\b/i;
      const granted = ctx.history.slice(0, -1).some((h) => hire.test(h));
      const hireSeg: Seg = { text: "sudo hire jon", tone: "cmd", cmd: "sudo hire jon" };
      if (hire.test(raw))
        return out(
          text({ text: granted ? "[sudo] already granted ✓ — here it is again:" : "[sudo] permission granted ✓", tone: "accent" }),
          ...COMMANDS.contact.run([], ctx, "").lines,
        );
      if (args[0] === "rm") return COMMANDS.rm.run(args.slice(1), ctx, raw);
      if (granted)
        return out(
          text({ text: "[sudo] ", tone: "accent" }, "you already have root. the only thing left to do is reach out."),
          text({ text: "usage: ", tone: "muted" }, hireSeg),
        );
      return out(
        text({ text: "[sudo] password for guest: ", tone: "muted" }, "********"),
        text({ text: "guest is not in the sudoers file. this incident will be reported.", tone: "err" }),
        text({ text: "(one request is always approved: ", tone: "muted" }, hireSeg, { text: ")", tone: "muted" }),
      );
    },
  },
  rm: {
    run: (args) =>
      args.some((a) => /^-\w*r\w*f|^-\w*f\w*r/.test(a))
        ? { lines: [text({ text: "just kidding. nothing was harmed.", tone: "accent" })], effect: "melt" }
        : err("rm: refusing. these are load-bearing."),
  },
  cd: { run: () => out(text({ text: "you're exactly where you need to be.", tone: "muted" })) },
  pwd: { run: () => out(text("/home/jon/stack")) },
  echo: { run: (args) => out(text(args.join(" "))) },
  exit: { run: () => out(text({ text: "you can't leave that easily.", tone: "muted" })) },
  vim: { run: () => out(text({ text: "good luck getting out. ", tone: "muted" }, "(it's ", { text: ":q", tone: "accent" }, ")")) },
  nano: { run: () => out(text({ text: "respectable.", tone: "muted" })) },
  emacs: { run: () => out(text({ text: "a fine operating system. lacks a good editor.", tone: "muted" })) },
  man: { run: () => out(text({ text: "no manual entry. try ", tone: "muted" }, help())) },
  date: { run: () => out(text(new Date().toString())) },
  history: {
    run: (_a, ctx) => out(...ctx.history.map((h, i) => text({ text: String(i + 1).padStart(4) + "  ", tone: "muted" }, { text: h, cmd: h }))),
  },
  coffee: {
    run: () =>
      out(
        { pre: "   ( (\n    ) )\n  ........\n  |      |]\n  \\      /\n   `----'", tone: "accent" },
        text({ text: "brewing… this is how code gets written.", tone: "muted" }),
      ),
  },
  neofetch: {
    run: () =>
      out(
        { pre: "      ██\n      ██\n      ██\n ██   ██\n  █████", tone: "accent" },
        text({ text: "jon", tone: "accent" }, { text: "@", tone: "muted" }, { text: "joncheng.ca", tone: "accent" }),
        text({ text: "os       ", tone: "muted" }, "the web"),
        text({ text: "shell    ", tone: "muted" }, "this one"),
        text({ text: "stack    ", tone: "muted" }, `${ITEMS.length} things in ${DIRS.length} folders`),
        text({ text: "theme    ", tone: "muted" }, { text: "lime", tone: "accent" }),
        text({ text: "uptime   ", tone: "muted" }, "since you got here"),
      ),
  },
  hello: { run: () => out(text("hey, there! 👋")) },
  hi: { run: () => out(text("hey, there! 👋")) },
};

// --- public ------------------------------------------------------------------

/** Run one input line. */
export function run(input: string, ctx: Ctx): Result {
  const raw = input.trim();
  if (!raw) return out();
  if (raw.includes("|")) return out(text({ text: "pipes are closed for maintenance. one command at a time.", tone: "muted" }));
  const [name, ...args] = raw.split(/\s+/);
  const cmd = COMMANDS[name.toLowerCase()];
  if (!cmd) return out(text({ text: `command not found: ${name}`, tone: "err" }, { text: " — try ", tone: "muted" }, help()));
  return cmd.run(args, ctx, raw);
}

/** Tab completion. value = new input (single match); options = to print (several). */
export function complete(input: string): { value?: string; options?: string[] } {
  const parts = input.split(/\s+/);
  const pool =
    parts.length <= 1
      ? Object.keys(COMMANDS).filter((n) => COMMANDS[n].desc)
      : ["ls", "cd"].includes(parts[0])
        ? DIRS
        : [...DIRS, ...ITEMS.map((i) => i.id)];
  const word = (parts.at(-1) ?? "").toLowerCase();
  const hits = pool.filter((p) => p.startsWith(word));
  if (hits.length === 1) return { value: [...parts.slice(0, -1), hits[0]].join(" ") + " " };
  if (hits.length > 1) {
    // extend to longest common prefix
    let pre = hits[0];
    for (const h of hits) while (!h.startsWith(pre)) pre = pre.slice(0, -1);
    if (pre.length > word.length) return { value: [...parts.slice(0, -1), pre].join(" ") };
    return { options: hits };
  }
  return {};
}

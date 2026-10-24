// `pnpm resume:check` — tests the GitHub connection outside Next. Prints status + a short summary (no token).
// `pnpm resume:check --save` — also writes the file to .resume/resume.tex (gitignored) for local inspection.
// Fits: setup/debug for lib/resume/source.ts (same env vars, same request).

const { RESUME_GITHUB_REPO: repo, RESUME_GITHUB_TOKEN: token, RESUME_PATH: path = "resume.tex", RESUME_REF: ref } = process.env;

if (!repo || !token) {
  console.error("✗ missing RESUME_GITHUB_REPO / RESUME_GITHUB_TOKEN in .env.local (see .env.example)");
  process.exit(1);
}

const url = `https://api.github.com/repos/${repo}/contents/${path}` + (ref ? `?ref=${encodeURIComponent(ref)}` : "");
let res;
try {
  res = await fetch(url, {
  headers: {
    Accept: "application/vnd.github.raw+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "joncheng.ca",
  },
  });
} catch (e) {
  console.error(`✗ can't reach GitHub: ${e.cause?.code ?? e.message}`);
  process.exit(1);
}

if (!res.ok) {
  const why = { 401: "token invalid/expired", 403: "token lacks Contents: Read (or rate-limited)", 404: "repo/path wrong, or token not granted this repo" }[res.status] ?? "";
  console.error(`✗ GitHub ${res.status} ${why}`);
  process.exit(1);
}

const tex = await res.text();
const sections = [...tex.matchAll(/\\section\*?\{([^}]*)\}/g)].map((m) => m[1]);
const commands = [...new Set([...tex.matchAll(/\\(resume\w+|cventry|cvitem|entry\w*)/g)].map((m) => m[1]))];
console.log(`✓ fetched ${repo}/${path}${ref ? `@${ref}` : ""} — ${tex.length} chars, ${tex.split("\n").length} lines`);
console.log(`  sections: ${sections.join(" · ") || "(none found)"}`);
console.log(`  template macros: ${commands.join(", ") || "(none recognised)"}`);
console.log(`  rate limit left: ${res.headers.get("x-ratelimit-remaining")}`);

if (process.argv.includes("--save")) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(".resume", { recursive: true });
  await writeFile(".resume/resume.tex", tex);
  console.log("  saved → .resume/resume.tex (gitignored)");
}

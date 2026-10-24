// Resume source: raw resume.tex from Jon's private GitHub repo. Server-only (token never reaches the browser).
// Fits: /experience → parser (next) → sheet + scenes. Cache tag "resume": refetch daily, or instantly via
// POST /api/revalidate/resume (called by the resume repo's Action on push). Env vars → .env.example.

import { readFile } from "node:fs/promises";

/** Cache tag for everything derived from the resume. */
export const RESUME_TAG = "resume";

/** Seconds before a background refetch — daily safety net; pushes refresh instantly via the hook. */
const REVALIDATE_S = 86400;

/** Readable failure (shown in build/dev logs). */
export class ResumeSourceError extends Error {
  name = "ResumeSourceError";
}

/** Latest resume.tex. RESUME_LOCAL_PATH set → reads that file instead (preview unpublished edits). Throws ResumeSourceError. */
export async function getResumeTex(): Promise<string> {
  const local = process.env.RESUME_LOCAL_PATH;
  if (local) {
    try {
      return await readFile(local, "utf8");
    } catch {
      throw new ResumeSourceError(`RESUME_LOCAL_PATH: can't read "${local}"`);
    }
  }

  const repo = process.env.RESUME_GITHUB_REPO;
  const token = process.env.RESUME_GITHUB_TOKEN;
  const path = process.env.RESUME_PATH || "resume.tex";
  const ref = process.env.RESUME_REF;
  if (!repo || !token) {
    throw new ResumeSourceError("missing RESUME_GITHUB_REPO / RESUME_GITHUB_TOKEN — copy .env.example to .env.local and fill in");
  }

  const url =
    `https://api.github.com/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}` +
    (ref ? `?ref=${encodeURIComponent(ref)}` : "");
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "joncheng.ca",
      },
      next: { revalidate: REVALIDATE_S, tags: [RESUME_TAG] },
    });
  } catch (e) {
    throw new ResumeSourceError(`network error reaching GitHub: ${(e as Error).message}`);
  }
  if (!res.ok) throw new ResumeSourceError(explain(res.status, repo, path));
  return res.text();
}

/** GitHub status → what to fix. (Private repos answer 404, not 403, when the token can't see them.) */
function explain(status: number, repo: string, path: string) {
  switch (status) {
    case 401:
      return "GitHub 401: token invalid or expired — make a new one (see .env.example)";
    case 403:
      return "GitHub 403: token lacks 'Contents: Read' on this repo, or rate-limited";
    case 404:
      return `GitHub 404: "${repo}/${path}" not found — check repo/path, and that the token was granted access to this repo`;
    default:
      return `GitHub ${status} fetching ${repo}/${path}`;
  }
}

// Resume entry point: getResume() = fetch (source.ts) + parse (parse.ts). Server-only.
// Fits: /experience and anything else that shows resume content. Errors: ResumeSourceError | ResumeParseError.

import { parseResume } from "./parse";
import { getResumeTex } from "./source";

export type { Block, Entry, Group, Resume, Section, Table, Text } from "./types";
export { ResumeParseError } from "./parse";
export { ResumeSourceError, RESUME_TAG } from "./source";

/** Latest resume as data (cached fetch, see source.ts). */
export async function getResume() {
  return parseResume(await getResumeTex());
}

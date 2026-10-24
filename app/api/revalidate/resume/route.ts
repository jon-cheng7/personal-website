// POST /api/revalidate/resume — drops the cached resume so the next visit refetches it.
// Fits: called by the resume repo's GitHub Action on push (scripts/resume-repo/notify-site.yml).
// Auth: "Authorization: Bearer <RESUME_REVALIDATE_SECRET>".

import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { RESUME_TAG } from "@/lib/resume/source";

export async function POST(req: Request) {
  const secret = process.env.RESUME_REVALIDATE_SECRET;
  const sent = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !same(sent, secret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag(RESUME_TAG, { expire: 0 });
  return Response.json({ ok: true, revalidated: RESUME_TAG, at: new Date().toISOString() });
}

/** Constant-time compare. */
function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

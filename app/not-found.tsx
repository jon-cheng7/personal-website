import type { Metadata } from "next";
import { NotFoundScene } from "@/components/not-found-scene";

// Next's special file: this renders automatically for any unmatched route
// (currently just /code — see content/nav.ts) and whenever a page calls
// notFound() explicitly. Kept as a plain server component specifically so
// it can export `metadata` normally; the actual interactive/animated
// content lives in NotFoundScene (a client component) instead of here.
export const metadata: Metadata = {
  title: "Page not found — Jon Cheng",
};

export default function NotFound() {
  return <NotFoundScene />;
}

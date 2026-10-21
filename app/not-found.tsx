// Custom 404 route.
// Fits: renders NotFoundScene inside PageShell.

import type { Metadata } from "next";
import { NotFoundScene } from "@/components/not-found-scene";

export const metadata: Metadata = {
  title: "Page not found — Jon Cheng",
};

export default function NotFound() {
  return <NotFoundScene />;
}

import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Art — Jon Cheng",
};

export default function ArtPage() {
  return (
    <PageShell>
      <h1>Art</h1>
      <p>
        Stand-in for the photo/art gallery — see the project doc&rsquo;s
        &ldquo;Decision: photo gallery&rdquo; section for the actual plan
        (manifest-driven, next/image delivery, up to ~100 photos). Nothing
        real here yet, just a destination so the nav link works.
      </p>
    </PageShell>
  );
}

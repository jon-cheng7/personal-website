import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "About Me — Jon Cheng",
};

export default function AboutMePage() {
  return (
    <PageShell>
      <h1>About Me</h1>
      <p>
        This page is a stand-in — real bio, photos, and whatever else this
        section ends up being live here once it&rsquo;s written. For now it
        exists so the nav&rsquo;s &ldquo;About Me&rdquo; link goes somewhere
        real instead of a 404, and so the seamless nav-to-page transition
        has actual content underneath it to reveal.
      </p>
    </PageShell>
  );
}

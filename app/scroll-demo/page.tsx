import type { Metadata } from "next";
import { PinnedScrubExample } from "@/components/pinned-scrub-example";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Scroll animation reference — Jon Cheng",
};

// Scratch/reference page, deliberately not in content/nav.ts — visit it
// directly at /scroll-demo. Delete this whole route once real sections
// exist and you've taken what you need from the pattern.
export default function ScrollDemoPage() {
  return (
    <>
      <section
        style={{ height: "60vh", display: "grid", placeItems: "center" }}
      >
        <p>Scroll down to see the reference patterns in action.</p>
      </section>

      <ScrollReveal>
        <section style={{ padding: "4rem 1rem", textAlign: "center" }}>
          <h2>This block fades/slides in once — plain scroll reveal</h2>
        </section>
      </ScrollReveal>

      <PinnedScrubExample />

      <section
        style={{ height: "60vh", display: "grid", placeItems: "center" }}
      >
        <p>End of the reference page.</p>
      </section>
    </>
  );
}

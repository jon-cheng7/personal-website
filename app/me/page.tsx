// /me — about-me placeholder.
// Fits: PageShell content page; hero circle links here.

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
        Hey, I'm Jonathan. My friends call me Jon. I have a very broad range of interests. From programming to literature, from graphic design to gaming, I enjoy exploring and learning new things.
        Some fun facts about me: I play 7 different intruments! I have a cute dog named Kylo (he's a samoyed). I love culture and history, travelling to new places and learning about different peoples.
      </p>
    </PageShell>
  );
}

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
        Hi, I’m Jon — a software engineer who enjoys building things that are thoughtful, polished, and a little bit playful. I like the process of taking something vague, figuring out how it should work, and shaping it into something that feels simple and intentional. That interest in both structure and aesthetics is probably why I’ve always been drawn to the space between engineering and design.
        Outside of code, I’m curious about almost everything. I love photography, especially the way it makes you slow down and pay attention to light, composition, people, and places. I’m drawn to art and graphic design for much the same reason — I like noticing the small choices that change how something feels.
        Travel is another big part of my life. I love experiencing different cultures, learning the history behind the places I visit, and understanding why people see the world the way they do. That curiosity also carries into my interest in religion and philosophy. I enjoy thinking about the bigger questions — meaning, belief, morality, identity, and the ideas that have shaped people and societies over time.
        Music has always been part of my life too. I play seven instruments, and I love how music can be technical, expressive, mathematical, emotional, and communal all at once.
        When I’m not making, learning, or overthinking something, I like being outdoors and staying active. Hiking, exploring somewhere new, or just getting outside is usually a good reset. And a significant amount of that time is spent with Kylo, my Samoyed, who is fluffy, dramatic, and generally convinced that every outing is for him.
        This website is a reflection of all of that — part portfolio, part playground, and part collection of the things I care about.
      </p>
    </PageShell>
  );
}

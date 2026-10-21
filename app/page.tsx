import { Hero } from "@/components/hero";
import { HorizontalScroll } from "@/components/horizontal-scroll";
import { ScrollMemory } from "@/components/scroll-memory";
import { FrostPanel } from "@/components/frost-panel";
import { ABOUT_CARD } from "@/lib/home-choreography";
import "./home.css";

// Placeholder filler content so there's something to scroll through before
// real sections exist — swap each of these for actual content whenever.
const fillerSections = [
  {
    heading: "",
    // Shown in a <FrostPanel> (the "about me" card) — see below.
    body: "I’m Jonathan — a software engineer, photographer, musician, and endlessly curious person. I love building things, making art, exploring new places, learning about culture and history, and thinking about the ideas that shape how we see the world.",
    card: ABOUT_CARD,
  },
  {
    heading: "2",
  },
  {
    heading: "3",
  },
  {
    heading: "4",
  },
];

export default function HomePage() {
  return (
    <>
      <HorizontalScroll fadeBarrier={0.1} fadeDiffusion={0.6} fadeMaxBlur={30}>
        <Hero />
        {fillerSections.map((section) => (
          <section key={section.heading} aria-label={section.heading}>
            {/* Plain text, no per-letter split needed — components/
                horizontal-scroll.tsx's exit frost is a single viewport-
                anchored overlay now (see that file's own doc comment), so
                there's no longer a per-element opt-in for it to key off.
                Swap these strings for real content whenever. */}
            <h2>{section.heading}</h2>
            {section.card ? (
              // Frosts in just before the hero's "about" speech bubble
              // leaves and out like the portrait does — timing/parallax in
              // lib/home-choreography.ts (ABOUT_CARD).
              <FrostPanel
                className="home-about-card"
                enter={section.card.enter}
                exit={section.card.exit}
                parallax={section.card.parallax}
              >
                <p>{section.body}</p>
              </FrostPanel>
            ) : (
              <p>{section.body}</p>
            )}
          </section>
        ))}
      </HorizontalScroll>
      {/* Sibling, rendered after HorizontalScroll — see scroll-memory.tsx's
          doc comment for why the ordering here matters. */}
      <ScrollMemory id="home" />
    </>
  );
}

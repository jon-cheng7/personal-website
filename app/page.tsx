import { Hero } from "@/components/hero";
import { HorizontalScroll } from "@/components/horizontal-scroll";
import { ScrollMemory } from "@/components/scroll-memory";
import { RevealText } from "@/components/reveal-text";
import { Stage, Place } from "@/components/stage";
import { ABOUT_TEXT } from "@/lib/home-choreography";
import "./home.css";

// See components/stage.tsx for the full API; quick reference:
//
//   <Place x="40vw" y="20vh" w="30rem">         canvas coords (from Stage's top-left)
//   <Place at="300vh" w="30rem">                centered on screen at 300vh of scroll
//   <Place at="300vh" y="25vh" anchor="top">    …top-center pinned 25vh down
//   z={2}                                       stacking when things overlap
//   mobile={{ order: 1, align: "start" }}       phone stack overrides
//
// The Stage's `length` sets how far the page scrolls past the Hero.
//
// <RevealText> (components/reveal-text.tsx): enter / lock / reveal / exit
// scroll ranges + parallax {in, out}; colors via dimColor / litColor or
// the --reveal-* CSS vars. <FrostPanel> cards are still available for
// later sections (see the cheat-sheet comment below).

export default function HomePage() {
  return (
    <>
      <HorizontalScroll fadeBarrier={0.1} fadeDiffusion={0.6} fadeMaxBlur={30}>
        <Hero />

        <Stage length="400vw" aria-label="About">
          {/* About-me statement: drifts in, locks dead-center while the
              scroll lights it up word by word, then lets go. All timing &
              parallax: ABOUT_TEXT in lib/home-choreography.ts. */}
          <Place at={ABOUT_TEXT.lock.start} w="min(84vw, 72rem)" mobile={{ w: "100%" }}>
            <RevealText
              as="h2"
              text="I’m a Software Engineer, Photographer, Creative, Artist."
              enter={ABOUT_TEXT.enter}
              lock={ABOUT_TEXT.lock}
              reveal={ABOUT_TEXT.reveal}
              exit={ABOUT_TEXT.exit}
              parallax={ABOUT_TEXT.parallax}
              smoothing={ABOUT_TEXT.smoothing}
              style={{"--reveal-align": "left", } as React.CSSProperties}
            />
          </Place>

          {/* Card look/hover props (all optional; see frost-panel.tsx):
                width height padding radius        sizes (CSS length or px)
                background="#1d2b12"               fill color
                backgroundOpacity={0.5}            fill only; text stays solid
                color borderColor borderWidth      (borderColor={false} = none)
                glass={16}                         blur what's behind (costly; opt-in)
                hover="glow" | "shimmer"           cursor light; omit = off
                hoverColor hoverSize hoverIntensity hoverLag

              Examples — uncomment (and import FrostPanel from
              "@/components/frost-panel") to try free placement / overlap:

          <Place x="240vw" y="18vh" w="26rem" z={1}>
            <FrostPanel>Card A</FrostPanel>
          </Place>
          <Place x="255vw" y="45vh" w="22rem" z={2}>
            <FrostPanel>Card B, overlapping A</FrostPanel>
          </Place>
          <Place x="330vw" y="90vh" anchor="bottom-left" w="18rem">
            <FrostPanel>Pinned to the bottom</FrostPanel>
          </Place>
          */}
        </Stage>
      </HorizontalScroll>
      {/* Sibling, rendered after HorizontalScroll — see scroll-memory.tsx's
          doc comment for why the ordering here matters. */}
      <ScrollMemory id="home" />
    </>
  );
}

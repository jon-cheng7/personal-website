// Home page content: what's on the page.
// Fits: <Scene> + <Actor id>s. Where/when → app/_home/home.choreo.ts. `?choreo` in URL = dev overlay.

import { Scene, Actor } from "@/components/choreo";
import { RevealText } from "@/components/ui/reveal-text";
import { ScrollMemory } from "@/components/scroll-memory";
import { homeChoreo } from "./_home/home.choreo";
import { Hero } from "./_home/sections/hero/hero";
import { Pillars } from "./_home/sections/pillars/pillars";
import "./_home/home.css";

export default function HomePage() {
  return (
    <>
      <Scene choreo={homeChoreo} aria-label="Home">
        <Hero />

        <Actor id="aboutText">
          <RevealText
            as="h2"
            className="about-statement"
            text="I’m an Engineer, an Artist, an Explorer."
          />
        </Actor>

        <Pillars />
      </Scene>
      <ScrollMemory id="home" />
    </>
  );
}

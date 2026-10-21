// Home page content: what's on the page.
// Fits: <Scene> + <Actor id>s. Where/when → app/_home/home.choreo.ts. `?choreo` in URL = dev overlay.

import { Scene, Actor } from "@/components/choreo";
import { RevealText } from "@/components/ui/reveal-text";
import { ScrollMemory } from "@/components/scroll-memory";
import { homeChoreo } from "./_home/home.choreo";
import { Hero } from "./_home/sections/hero/hero";
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
            text="I’m a Software Engineer, Photographer, Creative, Artist."
          />
        </Actor>
      </Scene>
      <ScrollMemory id="home" />
    </>
  );
}

import { ScrollCue } from "@/components/scroll-cue";
import "./hero.css";

export function Hero() {
  return (
    <section aria-label="Introduction" className="hero">
      <h1>Placeholder hero heading</h1>
      <p>
        Replace this with your own hero content — this is scaffolding, not a
        design. Structure only.
      </p>
      <ScrollCue />
    </section>
  );
}

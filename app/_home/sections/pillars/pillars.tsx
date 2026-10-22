// Engineering / Artistry / Exploration cards — start of the vertical section.
// Fits: one <Actor> per card (ids below); where/when + flip → app/_home/home.choreo.ts (CARDS).

import { Actor } from "@/components/choreo";
import { FlipCard } from "@/components/ui/flip-card";
import "./pillars.css";

/** Card content. `id` must match an actor in home.choreo.ts. */
const PILLARS = [
  {
    id: "cardEngineering",
    n: "01",
    title: "Engineering",
    line: "Systems that hold up. Interfaces that feel right.",
    back: "I like figuring out how things work, then making them work better. From software and systems to the tiny interactions that make an experience feel right, I enjoy turning complicated ideas into polished solutions.",
  },
  {
    id: "cardArtistry",
    n: "02",
    title: "Artistry",
    line: "Photographs, drawings, and the occasional experiment.",
    back: "Photography, design, art, and music shape how I see the world. I’m drawn to composition, detail, and expression. Whether I’m behind a camera, designing on a screen, or playing music.",
  },
  {
    id: "cardExploration",
    n: "03",
    title: "Exploration",
    line: "New cities, new cultures, new ways of seeing.",
    back: "I’m endlessly curious about people, places, and ideas. Travel, culture, history, religion, philosophy, and the outdoors constantly give me new perspectives.",
  },
] as const;

export function Pillars() {
  return (
    <>
      {PILLARS.map((p) => (
        <Actor key={p.id} id={p.id}>
          <FlipCard
            className="pillar-card"
            hover="shimmer"
            front={
              <>
                <span className="pillar-card__n">{p.n}</span>
                <div>
                  <h3 className="pillar-card__title">{p.title}</h3>
                  <p className="pillar-card__line">{p.line}</p>
                </div>
              </>
            }
            back={
              <>
                <span className="pillar-card__label">
                  <span className="pillar-card__n">{p.n}</span>
                  {p.title}
                </span>
                <p className="pillar-card__body">{p.back}</p>
              </>
            }
          />
        </Actor>
      ))}
    </>
  );
}

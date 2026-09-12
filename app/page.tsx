import { Hero } from "@/components/hero";
import { HorizontalScroll } from "@/components/horizontal-scroll";
import { ScrollMemory } from "@/components/scroll-memory";
import { SplitText } from "@/components/split-text";

// Placeholder filler content so there's something to scroll through before
// real sections exist — swap each of these for actual content whenever.
const fillerSections = [
  {
    heading: "Placeholder section one",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    heading: "Placeholder section two",
    body: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    heading: "Placeholder section three",
    body: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  },
  {
    heading: "Placeholder section four",
    body: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
  },
];

export default function HomePage() {
  return (
    <>
      <HorizontalScroll fadeBarrier={0.08} fadeDiffusion={0.35} fadeMaxBlur={14}>
        <Hero />
        {fillerSections.map((section) => (
          <section key={section.heading} aria-label={section.heading}>
            {/* SplitText marks every letter with data-scroll-fade (see that
                component's own doc comment for why word-then-letter, not a
                flat split) — components/horizontal-scroll.tsx picks all of
                them up automatically and fades each independently as the
                panel scrolls out. aria-hidden since the split version is
                decorative markup, not new content; the plain-text `.sr-only`
                heading/paragraph right after each is the one accessible
                reading — same "invisible sizer / visible copy" split
                components/hero.tsx uses for its own wordmark. Swap the
                strings here for real content whenever; SplitText itself
                needs no changes. */}
            <h2 aria-hidden="true">
              <SplitText text={section.heading} />
            </h2>
            <h2 className="sr-only">{section.heading}</h2>
            <p aria-hidden="true">
              <SplitText text={section.body} />
            </p>
            <p className="sr-only">{section.body}</p>
          </section>
        ))}
      </HorizontalScroll>
      {/* Sibling, rendered after HorizontalScroll — see scroll-memory.tsx's
          doc comment for why the ordering here matters. */}
      <ScrollMemory id="home" />
    </>
  );
}

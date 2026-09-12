import { Fragment } from "react";

interface SplitTextProps {
  text: string;
  /** Class applied to each word's own wrapping span. */
  wordClassName?: string;
  /** Class applied to each individual letter span inside a word. */
  letterClassName?: string;
}

/**
 * Splits `text` into words, and each word into individually-marked letters
 * — for components/horizontal-scroll.tsx's per-element frosted-glass exit
 * fade at letter granularity (see that file's own doc comment), applied
 * here to running body text rather than components/hero.tsx's short,
 * single-word wordmark pieces (which have their own bespoke `HeroWord` —
 * it also needs a ref per letter for its opening reveal animation, which
 * this component has no reason to support).
 *
 * Word-then-letter, not a flat per-character split, and specifically why:
 * a flat split would need every space replaced with a non-breaking one (a
 * bare space as an inline-block's sole content is unreliable across
 * engines), and a run of non-breaking spaces removes every natural line-
 * break opportunity a paragraph has — exactly wrong for wrapping body
 * text, even though it's harmless for Hero's own short, single-line,
 * never-wraps pieces. Splitting into words first keeps a real, breakable
 * space character (a plain text node, not inside any span) between each
 * word's own wrapper, so the browser wraps exactly where it normally
 * would; each word's own wrapper is `inline-block` so its letters can
 * never be torn across a line break mid-word, and the letters inside it
 * are what actually carry `data-scroll-fade` for the per-letter fade.
 */
export function SplitText({ text, wordClassName, letterClassName }: SplitTextProps) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, wordIndex) => (
        <Fragment key={wordIndex}>
          <span className={wordClassName} style={{ display: "inline-block" }}>
            {word.split("").map((char, letterIndex) => (
              <span
                key={letterIndex}
                className={letterClassName}
                data-scroll-fade
                style={{ display: "inline-block" }}
              >
                {char}
              </span>
            ))}
          </span>
          {/* A real space text node between word wrappers, not inside any
              of them — the actual line-break opportunity a paragraph needs
              between words, left untouched by the per-letter split above. */}
          {wordIndex < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

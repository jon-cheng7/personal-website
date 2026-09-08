import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Placeholder — Jon Cheng",
};

export default function PlaceholderPage() {
  return (
    <section>
      <h1>Placeholder page</h1>
      <p>
        This exists only to prove the nav pattern works for more than one
        page. Rename, replace, or delete it once the real page list is
        decided.
      </p>
    </section>
  );
}

// /art — archive landing: three collection "drawers" (photography live; design, music on standby). No gallery here.
// Fits: static page. Stats come from the photo manifest; hover/expand + contact-strip are pure CSS (art.css).
// Pixel cursor scope (data-cursor / data-cursor-link) + click burst, shared with the photo archive.

import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { PixelClickFx } from "@/components/cursor/pixel-click-fx";
import { TransitionLink } from "@/components/transition-link";
import { photoUrl, photos } from "@/content/photos";
import { archiveStats, pad } from "./photography/format";
import "./art.css";

export const metadata: Metadata = {
  title: "Art — Jon Cheng",
  description: "Photography, art & design, and music.",
};

/** thumbnails in the photography drawer's contact strip */
const STRIP_COUNT = 12;

/** evenly spread picks so the strip isn't one trip */
const strip = photos.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / STRIP_COUNT)) === 0).slice(0, STRIP_COUNT);

const s = archiveStats(photos);

type StatRow = [label: string, value: string];
const photoStats: StatRow[] = [
  ["FRAMES", pad(s.frames)],
  ["PLACES", pad(s.places, 2)],
  ["COUNTRIES", pad(s.countries, 2)],
];

function Stats({ rows }: { rows: StatRow[] }) {
  return (
    <dl className="drawer__stats">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const i = (n: number) => ({ "--i": n }) as CSSProperties;

export default function ArtPage() {
  return (
    <section className="art" data-chrome-tone="light-on-dark" data-cursor="pixel" data-cursor-link="pixel">
      <PixelClickFx />
      <header className="art__head">
        <h1>
          <span className="sr-only">Art</span>
          <span aria-hidden>ART / ARCHIVE</span>
        </h1>
        <p>03 COLLECTIONS · 01 ONLINE</p>
      </header>

      <div className="drawers">
        <TransitionLink href="/art/photography" className="drawer drawer--live" style={i(0)}>
          <div className="drawer__top">
            <span>01</span>
            <span className="drawer__path">/ARCHIVE/PHOTOGRAPHY</span>
            <span className="drawer__status">
              <span className="drawer__led" aria-hidden /> ONLINE
            </span>
          </div>

          <ul className="drawer__strip" aria-hidden>
            {strip.map((p, n) => (
              <li key={p.id} style={i(n)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-built thumbnails */}
                <img src={photoUrl(p, "webp", p.widths[0])} alt="" width={p.width} height={p.height} loading="lazy" decoding="async" />
              </li>
            ))}
          </ul>
          <span className="drawer__scan" aria-hidden />

          <h2 className="drawer__title">Photography</h2>
          <div className="drawer__foot">
            <Stats rows={photoStats} />
            <span className="drawer__enter">
              ENTER <span aria-hidden>→</span>
            </span>
          </div>
        </TransitionLink>

        <div className="drawer drawer--standby" style={i(1)} aria-disabled="true">
          <div className="drawer__top">
            <span>02</span>
            <span className="drawer__path">/ARCHIVE/ART-DESIGN</span>
            <span className="drawer__status">
              <span className="drawer__led" aria-hidden /> STANDBY
            </span>
          </div>
          <p className="drawer__signal" aria-hidden>NO SIGNAL</p>
          <h2 className="drawer__title">Art & Design</h2>
          <div className="drawer__foot">
            <Stats rows={[["STATUS", "IN PREPARATION"]]} />
          </div>
        </div>

        <div className="drawer drawer--standby" style={i(2)} aria-disabled="true">
          <div className="drawer__top">
            <span>03</span>
            <span className="drawer__path">/ARCHIVE/MUSIC</span>
            <span className="drawer__status">
              <span className="drawer__led" aria-hidden /> STANDBY
            </span>
          </div>
          <p className="drawer__signal" aria-hidden>NO SIGNAL</p>
          <h2 className="drawer__title">Music</h2>
          <div className="drawer__foot">
            <Stats rows={[["STATUS", "IN PREPARATION"]]} />
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

// ArchiveHud — sticky instrument bar: path · view switch · filter · META switch · frame counter.
// Fits: top of PhotoArchive (state lives there). Not a named view-transition layer (see archive.css).

import type { RefObject } from "react";
import { TransitionLink } from "@/components/transition-link";
import { pad, type View } from "./format";

type Props = {
  view: View;
  onView: (v: View) => void;
  meta: boolean;
  onMeta: () => void;
  query: string;
  onQuery: (q: string) => void;
  filterRef: RefObject<HTMLInputElement | null>;
  shown: number;
  total: number;
};

const LABELS: { view: View; label: string }[] = [
  { view: "index", label: "INDEX" },
  { view: "geo", label: "GEO" },
  { view: "gallery", label: "GALLERY" },
];

export function ArchiveHud({ view, onView, meta, onMeta, query, onQuery, filterRef, shown, total }: Props) {
  return (
    <div className="hud" role="toolbar" aria-label="Archive controls">
      <nav className="hud__path" aria-label="Breadcrumb">
        <TransitionLink href="/art" className="hud__crumb">
          ART
        </TransitionLink>
        <span aria-hidden>/</span>
        <span className="hud__here">PHOTOGRAPHY</span>
      </nav>

      <div className="hud__views" role="radiogroup" aria-label="View">
        {LABELS.map(({ view: v, label }, i) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            className="hud__view"
            onClick={() => onView(v)}
          >
            <span className="hud__key">{pad(i + 1, 2)}</span>
            {label}
          </button>
        ))}
      </div>

      <label className="hud__filter">
        <span className="hud__key" aria-hidden>
          /
        </span>
        <span className="sr-only">Filter photos</span>
        <input
          ref={filterRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="FILTER  athens · 55mm · 2026.07"
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      <button type="button" className="hud__meta" aria-pressed={meta} onClick={onMeta}>
        <span className="hud__led" aria-hidden />
        META <span className="hud__state">{meta ? "ON" : "OFF"}</span>
        <kbd>M</kbd>
      </button>

      <output className="hud__count" aria-live="polite">
        <span className="hud__count-n">{pad(shown)}</span>
        <span className="hud__dim">/{pad(total)}</span>
      </output>
    </div>
  );
}

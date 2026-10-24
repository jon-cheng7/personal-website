"use client";

// geo/country-panel — country list for the geo map: filter, multi-select highlight, visited countries marked.
// Fits: GeoView renders it on the left when COUNTRIES is on. Data = masks.json `countries.list` (build-geo.mjs):
// [id, name, iso, frames]. Visited (frames > 0) sit on top with a lit LED + frame count; the rest are dimmed.
// Picking only toggles ids; GeoView pushes them to the renderer (picked = light grey, everything else dark grey).

import { useMemo, useState } from "react";
import { pad } from "../format";

export type CountryRow = [id: number, name: string, iso: string, frames: number];

type Props = {
  list: CountryRow[];
  selected: ReadonlySet<number>;
  onToggle: (id: number) => void;
  onClear: () => void;
  onClose: () => void;
  /** id map download progress 0–1, null when ready */
  loading: number | null;
};

export function CountryPanel({ list, selected, onToggle, onClear, onClose, loading }: Props) {
  const [q, setQ] = useState("");

  const { visited, rest } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (c: CountryRow) => !needle || c[1].toLowerCase().includes(needle) || c[2].toLowerCase() === needle;
    const rows = list.filter(hit);
    return {
      visited: rows.filter((c) => c[3] > 0).sort((a, b) => b[3] - a[3] || a[1].localeCompare(b[1])),
      rest: rows.filter((c) => c[3] === 0),
    };
  }, [list, q]);

  const total = list.filter((c) => c[3] > 0).length;

  const row = (c: CountryRow) => {
    const on = selected.has(c[0]);
    return (
      <li key={c[0]}>
        <button
          type="button"
          className="gc__row"
          data-visited={c[3] > 0 || undefined}
          data-on={on || undefined}
          aria-pressed={on}
          onClick={() => onToggle(c[0])}
        >
          <span className="gc__box" aria-hidden />
          <span className="gc__name">{c[1].toUpperCase()}</span>
          {c[3] > 0 ? (
            <span className="gc__n">
              <span className="gc__led" aria-hidden />
              {pad(c[3], 2)}
            </span>
          ) : null}
        </button>
      </li>
    );
  };

  return (
    <aside className="gc" aria-label="Countries" data-lenis-prevent>
      <div className="gc__head">
        <div>
          <p className="gc__title">COUNTRIES</p>
          <p className="gc__sub">
            {pad(total, 2)} VISITED · {list.length} TOTAL
            {loading !== null && <span className="gc__load"> · LINK {Math.round(loading * 100)}%</span>}
          </p>
        </div>
        <button type="button" className="gc__x" onClick={onClose} aria-label="Close countries">
          ✕
        </button>
      </div>

      <label className="gc__filter">
        <span aria-hidden>/</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="FILTER" spellCheck={false} aria-label="Filter countries" />
      </label>

      <div className="gc__list">
        {visited.length > 0 && (
          <>
            <p className="gc__group">VISITED // {pad(visited.length, 2)}</p>
            <ul>{visited.map(row)}</ul>
          </>
        )}
        {rest.length > 0 && (
          <>
            <p className="gc__group">ALL // {pad(rest.length, 3)}</p>
            <ul>{rest.map(row)}</ul>
          </>
        )}
        {!visited.length && !rest.length && <p className="gc__group">NO MATCH</p>}
      </div>

      <div className="gc__foot">
        <span>
          <b>{pad(selected.size, 2)}</b> HIGHLIGHTED
        </span>
        <button type="button" onClick={onClear} disabled={!selected.size}>
          CLEAR
        </button>
      </div>
    </aside>
  );
}

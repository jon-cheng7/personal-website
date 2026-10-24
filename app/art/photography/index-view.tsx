"use client";

// IndexView — the data view: sortable list of every frame + a sticky "monitor" showing the active one.
// Fits: PhotoArchive view "index". Hover / focus / ↑↓ sets active; click / Enter opens the viewer.
// META on → exposure columns ease open (track width → blur/slide/fade, values decode); off = exact reverse
// (values scramble out → fade → tracks fold). Viewfinder HUD on the monitor.
// Rows blur/fade once they pass under the sticky header (CSS scroll timeline, JS fallback). Narrow screens: list only.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Photo } from "@/components/ui/photo";
import { ScrambleText } from "@/components/ui/scramble-text";
import type { Photo as PhotoData } from "@/content/photos";
import {
  fileLabel, fmtAperture, fmtDate, fmtFocal, fmtIso, fmtShutter, fmtTime, pad, placeLong, placeShort,
  type Sort, type SortKey,
} from "./format";
import { useScrollOut } from "./use-scroll-out";
import { ViewfinderHud } from "./viewfinder-hud";
import "./index-view.css";

type Props = {
  photos: PhotoData[];
  total: number;
  meta: boolean;
  sort: Sort;
  onSort: (s: Sort) => void;
  current: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
};

type Col = { key: string; label: string; sort?: SortKey; meta?: boolean };
const COLS: Col[] = [
  { key: "no", label: "№" },
  { key: "thumb", label: "" },
  { key: "date", label: "DATE", sort: "date" },
  { key: "time", label: "TIME", meta: true },
  { key: "place", label: "LOCATION", sort: "place" },
  { key: "focal", label: "FOCAL", sort: "focal" },
  { key: "aperture", label: "APERTURE", sort: "aperture", meta: true },
  { key: "shutter", label: "SHUTTER", sort: "shutter", meta: true },
  { key: "iso", label: "ISO", sort: "iso", meta: true },
];

/** hover → monitor: brief delay so sweeping the list doesn't fire a load per row */
const HOVER_MS = 70;

export function IndexView({ photos, total, meta, sort, onSort, current, onSelect, onOpen }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const hoverTimer = useRef<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const activeId = hovered ?? current;
  const activeIndex = photos.findIndex((p) => p.id === activeId);
  const active = photos[activeIndex];
  /** replay key for META cell decode; null = no animation */
  const play = meta ? "on" : null;
  const tableRef = useRef<HTMLDivElement>(null);
  useScrollOut(tableRef, ".ix__list > li", ".ix__head", photos);

  // keyboard selection → keep row on screen + carry focus along
  useEffect(() => {
    if (!current) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row="${current}"]`);
    if (!row) return;
    const r = row.getBoundingClientRect();
    const top = (parseFloat(getComputedStyle(row).scrollMarginTop) || 0);
    if (r.top < top || r.bottom > window.innerHeight) row.scrollIntoView({ block: "nearest" });
    if (listRef.current?.contains(document.activeElement) && document.activeElement !== row) row.focus({ preventScroll: true });
  }, [current]);

  const hover = (id: string | null) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(id), id ? HOVER_MS : 0);
  };

  const sortBy = (key: SortKey) =>
    onSort(sort.key === key ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: key === "date" ? -1 : 1 });

  return (
    <div className="ix" data-meta={meta || undefined}>
      <div ref={tableRef} className="ix__table">
        <div className="ix__head ix__grid" role="presentation">
          {COLS.map((c) =>
            c.sort ? (
              <button
                key={c.key}
                type="button"
                className={`ix__th ix__c--${c.key}${c.meta ? " ix__m" : ""}`}
                aria-sort={sort.key === c.sort ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                aria-hidden={(c.meta && !meta) || undefined}
                tabIndex={c.meta && !meta ? -1 : undefined}
                onClick={() => sortBy(c.sort!)}
              >
                {c.label}
                <span className="ix__arrow" aria-hidden>
                  {sort.key === c.sort ? (sort.dir === 1 ? "▲" : "▼") : "◇"}
                </span>
              </button>
            ) : (
              <span key={c.key} className={`ix__th ix__c--${c.key}${c.meta ? " ix__m" : ""}`}>
                {c.label}
              </span>
            ),
          )}
        </div>

        <ol ref={listRef} className="ix__list" onPointerLeave={() => hover(null)}>
          {photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className="ix__row ix__grid"
                data-row={p.id}
                data-active={p.id === activeId || undefined}
                aria-label={`${pad(i + 1)} · ${fmtDate(p.takenAt)} · ${placeShort(p)}`}
                onPointerEnter={() => hover(p.id)}
                onFocus={() => onSelect(p.id)}
                onClick={() => onOpen(p.id)}
              >
                <span className="ix__c--no">{pad(i + 1)}</span>
                <span className="ix__c--thumb" data-vt-id={p.id}>
                  <Photo photo={p} sizes="48px" aspect="1" />
                </span>
                <span className="ix__c--date">{fmtDate(p.takenAt)}</span>
                <ScrambleText className="ix__c--time ix__m ix__dim" text={fmtTime(p.takenAt)} play={play} hide={!meta} delay={260} />
                <span className="ix__c--place">{placeShort(p)}</span>
                <span className="ix__c--focal">{fmtFocal(p.exposure.focalLength)}</span>
                <ScrambleText className="ix__c--aperture ix__m" text={fmtAperture(p.exposure.aperture)} play={play} hide={!meta} delay={330} />
                <ScrambleText className="ix__c--shutter ix__m" text={fmtShutter(p.exposure.shutter)} play={play} hide={!meta} delay={400} />
                <ScrambleText className="ix__c--iso ix__m ix__dim" text={String(p.exposure.iso ?? "—")} play={play} hide={!meta} delay={470} />
              </button>
            </li>
          ))}
        </ol>
      </div>

      {active && (
        <aside className="ix__monitor" aria-label="Preview">
          <div className="ix__screen">
            {/* fit box = photo's aspect, as large as the screen allows; HUD sits on the photo itself */}
            <div className="ix__fit" style={{ "--ar": active.width / active.height } as CSSProperties}>
              {/* keyed → each photo scans in */}
              <div key={active.id} className="ix__frame">
                <Photo photo={active} sizes="(max-width: 1000px) 0px, 40vw" priority />
              </div>
              <ViewfinderHud photo={active} on={meta} frame={activeIndex + 1} total={total} />
            </div>
          </div>

          <dl className="ix__readout">
            <div><dt>FILE</dt><dd>{fileLabel(active)}</dd></div>
            <div><dt>PLACE</dt><dd>{placeLong(active)}</dd></div>
            <div><dt>LENS</dt><dd>{active.lens ?? "—"}</dd></div>
            <div>
              <dt>EXPOSURE</dt>
              <dd>
                {fmtFocal(active.exposure.focalLength)} · {fmtAperture(active.exposure.aperture)} · {fmtShutter(active.exposure.shutter)} · {fmtIso(active.exposure.iso)}
              </dd>
            </div>
            <div><dt>SIZE</dt><dd>{active.width}×{active.height}</dd></div>
          </dl>
          <p className="ix__hint">
            <kbd>↑</kbd><kbd>↓</kbd> SELECT · <kbd>↵</kbd> OPEN · <kbd>M</kbd> META
          </p>
        </aside>
      )}
    </div>
  );
}

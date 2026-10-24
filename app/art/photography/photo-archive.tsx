"use client";

// PhotoArchive — /art/photography state + keyboard: view, META, filter, sort, selection, viewer.
// Fits: page.tsx renders it; views (index / geo / gallery) + HUD + viewer are dumb children.
// URL: ?view=index|geo|gallery&photo=<id> (replaceState, no navigation). META persisted per browser.
// Keys: 1/2/3 view · M meta · / filter · ↑↓ / J K select · Enter open · Esc close/clear.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PixelClickFx } from "@/components/cursor/pixel-click-fx";
import { photos as ALL } from "@/content/photos";
import { ArchiveHud } from "./archive-hud";
import { DEFAULT_SORT, matches, parseView, sortPhotos, VIEWS, type Sort, type View } from "./format";
import { GalleryView } from "./gallery-view";
import { GeoView } from "./geo-view";
import { IndexView } from "./index-view";
import { morph } from "./morph";
import { PhotoViewer } from "./photo-viewer";
import "./archive.css";

const META_KEY = "archive:meta";

type Props = {
  /** from the URL; null during static prerender */
  initialView?: string | null;
  initialPhoto?: string | null;
};

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function PhotoArchive({ initialView = null, initialPhoto = null }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>(() => parseView(initialView));
  const [meta, setMeta] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(() => (initialPhoto && ALL.some((p) => p.id === initialPhoto) ? initialPhoto : null));

  const list = useMemo(() => sortPhotos(ALL.filter((p) => matches(p, query)), sort), [query, sort]);
  const current = selected && list.some((p) => p.id === selected) ? selected : (list[0]?.id ?? null);

  // --- persisted META ---
  useEffect(() => {
    try {
      const v = localStorage.getItem(META_KEY);
      if (v != null) setMeta(v === "1");
    } catch {}
  }, []);

  // --- URL mirror ---
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set("view", view);
    if (viewer) q.set("photo", viewer);
    else q.delete("photo");
    window.history.replaceState(window.history.state, "", `?${q}`);
  }, [view, viewer]);

  // --- actions (morphing ones go through View Transitions) ---
  const changeView = useCallback((v: View) => {
    if (v !== view) morph(() => setView(v), rootRef.current);
  }, [view]);

  const toggleMeta = useCallback(() => {
    const next = !meta;
    try {
      localStorage.setItem(META_KEY, next ? "1" : "0");
    } catch {}
    // plain update: META elements ease themselves (index columns, HUD chips); a View Transition would freeze them
    setMeta(next);
  }, [meta]);

  const changeSort = useCallback((s: Sort) => morph(() => setSort(s), rootRef.current), []);

  const step = useCallback((delta: number) => {
    if (!list.length) return;
    const i = Math.max(0, list.findIndex((p) => p.id === current));
    const next = list[(i + delta + list.length) % list.length].id;
    setSelected(next);
    return next;
  }, [list, current]);

  // --- keyboard ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (viewer) return; // viewer owns keys while open
      if (typing(e.target)) {
        if (e.key === "Escape") {
          setQuery("");
          (e.target as HTMLElement).blur();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= "3") changeView(VIEWS[+k - 1]);
      else if (k === "m") toggleMeta();
      else if (k === "/") {
        e.preventDefault();
        filterRef.current?.focus();
      } else if (view === "index" && (k === "arrowdown" || k === "j")) {
        e.preventDefault();
        step(1);
      } else if (view === "index" && (k === "arrowup" || k === "k")) {
        e.preventDefault();
        step(-1);
      } else if (view === "index" && k === "enter" && current) {
        // else Enter's default action clicks the viewer's freshly focused Close button
        e.preventDefault();
        setViewer(current);
      }
      else if (k === "escape" && query) setQuery("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, view, current, query, changeView, toggleMeta, step]);

  return (
    <section
      ref={rootRef}
      className="archive"
      data-chrome-tone="light-on-dark"
      data-view={view}
      data-meta={meta || undefined}
      data-cursor="pixel"
      data-cursor-link="pixel"
    >
      <PixelClickFx />
      <h1 className="sr-only">Photography</h1>
      <ArchiveHud
        view={view}
        onView={changeView}
        meta={meta}
        onMeta={toggleMeta}
        query={query}
        onQuery={setQuery}
        filterRef={filterRef}
        shown={list.length}
        total={ALL.length}
      />

      <div className="archive__body">
        {view === "index" && (
          <IndexView
            photos={list}
            total={ALL.length}
            meta={meta}
            sort={sort}
            onSort={changeSort}
            current={current}
            onSelect={setSelected}
            onOpen={setViewer}
          />
        )}
        {view === "gallery" && <GalleryView photos={list} meta={meta} onOpen={setViewer} />}
        {view === "geo" && (
          <GeoView
            photos={list}
            onOpen={setViewer}
            onFilter={(q) => {
              setQuery(q);
              changeView("index");
            }}
          />
        )}
        {!list.length && (
          <p className="archive__empty">
            NO MATCH FOR &ldquo;{query}&rdquo; · <button type="button" onClick={() => setQuery("")}>CLEAR</button>
          </p>
        )}
      </div>

      {viewer && (
        <PhotoViewer
          photos={list.some((p) => p.id === viewer) ? list : ALL}
          id={viewer}
          meta={meta}
          onMeta={toggleMeta}
          onChange={(id) => {
            setViewer(id);
            setSelected(id);
          }}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  );
}

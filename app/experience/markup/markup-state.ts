// Markup document: marks on the sheet + undo/redo + per-visitor persistence (localStorage, best-effort).
// Removed marks linger briefly as "ghosts" so they can dissolve out. Fits: page-view.tsx owns one; layer + bar read it.

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Pt } from "./ink";
import type { Band } from "./snap";
import type { ColorId, InkTool } from "./tools";

/** One mark: a freehand stroke (pts) or a snapped highlight (band). size = width scale (pen/pencil; absent = 1). */
export type Mark = { id: string; tool: InkTool; color: ColorId; size?: number; pts?: Pt[]; band?: Band };

const MAX_HISTORY = 100;

export function useMarkup(storageKey: string) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [ghosts, setGhosts] = useState<Mark[]>([]);
  const past = useRef<Mark[][]>([]);
  const future = useRef<Mark[][]>([]);
  const [depth, setDepth] = useState({ undo: 0, redo: 0 }); // drives undo/redo enabled state
  const marksRef = useRef(marks);
  marksRef.current = marks;

  // load once per key (after hydration; layout effect so a view mounted inside beforeprint prints its marks)
  const loadedKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    loadedKey.current = storageKey;
    past.current = [];
    future.current = [];
    setMarks(read(storageKey));
    setGhosts([]);
    setDepth({ undo: 0, redo: 0 });
  }, [storageKey]);

  /** Swap the document; removed marks become ghosts. */
  const swap = useCallback(
    (next: Mark[]) => {
      const keep = new Set(next.map((m) => m.id));
      const gone = marksRef.current.filter((m) => !keep.has(m.id));
      const goneIds = new Set(gone.map((m) => m.id));
      setGhosts((g) => {
        const kept = g.filter((x) => !keep.has(x.id) && !goneIds.has(x.id)); // re-added (redo) → stop dissolving
        return kept.length === g.length && !gone.length ? g : [...kept, ...gone];
      });
      marksRef.current = next; // back-to-back commits before the next render see this state
      setMarks(next);
      if (loadedKey.current === storageKey) write(storageKey, next);
      setDepth({ undo: past.current.length, redo: future.current.length });
    },
    [storageKey],
  );

  /** New state as one undo step. */
  const commit = useCallback(
    (next: Mark[]) => {
      past.current = [...past.current, marksRef.current].slice(-MAX_HISTORY);
      future.current = [];
      swap(next);
    },
    [swap],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(marksRef.current);
    swap(prev);
  }, [swap]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(marksRef.current);
    swap(next);
  }, [swap]);

  /** Update the current step in place (no new undo step) — e.g. an eraser gesture after its first hit. */
  const replace = useCallback((next: Mark[]) => swap(next), [swap]);

  const clear = useCallback(() => marksRef.current.length && commit([]), [commit]);
  const dropGhost = useCallback((id: string) => setGhosts((g) => g.filter((m) => m.id !== id)), []);

  return {
    marks,
    ghosts,
    commit,
    replace,
    undo,
    redo,
    clear,
    dropGhost,
    canUndo: depth.undo > 0,
    canRedo: depth.redo > 0,
  };
}

export type Markup = ReturnType<typeof useMarkup>;

export const newId = () => Math.random().toString(36).slice(2, 10);

// ---- storage (rounded numbers keep it small) ----

function read(key: string): Mark[] {
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data) ? data.filter(valid) : [];
  } catch {
    return [];
  }
}

function write(key: string, marks: Mark[]) {
  try {
    const r = (n: number) => Math.round(n * 10) / 10;
    const slim = marks.map((m) => ({
      ...m,
      pts: m.pts?.map(([x, y, p]) => [r(x), r(y), Math.round(p * 100) / 100]),
      band: m.band && { x: r(m.band.x), y: r(m.band.y), w: r(m.band.w), h: r(m.band.h) },
    }));
    if (slim.length) localStorage.setItem(key, JSON.stringify(slim));
    else localStorage.removeItem(key);
  } catch {
    /* storage full / blocked: marks just won't persist */
  }
}

function valid(m: unknown): m is Mark {
  const o = m as Mark;
  return !!o && typeof o.id === "string" && typeof o.tool === "string" && (Array.isArray(o.pts) || !!o.band);
}

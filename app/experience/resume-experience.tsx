"use client";

// /experience shell: interactive canvas (resume-canvas.tsx) or the plain page (TL;DR).
// Fits: page.tsx passes resume data + scene model. Mode: auto (SSR: both rendered, CSS picks) → scene | page.
// Page when ?tldr, reduced motion, ≤900px, or printing. Keys: R toggles. "Save PDF" = print of the page view.
// Switching = a View Transition: the toolbar pill morphs between the two bars, the paper rises in / sinks out.
// (No View Transitions support or reduced motion → instant switch.)
// Owns canvas state that must survive switching views: which scenes were read, sorted vs scattered.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getLenisInstance } from "@/lib/lenis-store";
import type { Resume } from "@/lib/resume";
import { PageView } from "./page-view";
import { ResumeCanvas } from "./resume-canvas";
import type { SceneSection } from "./scene-model";
import "./resume-experience.css";

type Mode = "auto" | "scene" | "page";

export function ResumeExperience({ resume, sections }: { resume: Resume; sections: SceneSection[] }) {
  const [mode, setMode] = useState<Mode>("auto");
  const [read, setRead] = useState<ReadonlySet<string>>(() => new Set());
  const [sorted, setSorted] = useState(false);
  const onRead = useCallback((id: string) => setRead((r) => (r.has(id) ? r : new Set(r).add(id))), []);
  const beforePrint = useRef<Mode | null>(null);

  useLayoutEffect(() => {
    const page =
      new URLSearchParams(window.location.search).has("tldr") ||
      window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 900px)").matches;
    setMode(page ? "page" : "scene");
  }, []);

  const toggle = useCallback(() => {
    const swap = () => {
      flushSync(() => setMode((m) => (m === "page" ? "scene" : "page")));
      const lenis = getLenisInstance();
      if (lenis) lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
    };
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) swap();
    else doc.startViewTransition(swap);
  }, []);

  // R = toggle (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "r" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // printing always uses the page view
  useEffect(() => {
    const before = () => {
      if (beforePrint.current) return; // already switched (some browsers fire twice)
      beforePrint.current = mode;
      if (mode !== "page") flushSync(() => setMode("page"));
    };
    const after = () => {
      if (beforePrint.current && beforePrint.current !== "page") setMode(beforePrint.current);
      beforePrint.current = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [mode]);

  return (
    <div className={`resume-x resume-x--${mode}`}>
      {mode !== "page" && (
        <div className="resume-x__canvas">
          <ResumeCanvas
            sections={sections}
            visited={read}
            onRead={onRead}
            sorted={sorted}
            onSortedChange={setSorted}
            onPageView={toggle}
          />
        </div>
      )}

      {mode !== "scene" && <PageView resume={resume} onInteractive={toggle} />}
    </div>
  );
}

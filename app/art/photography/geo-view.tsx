"use client";

// GeoView — dot-matrix world map of the archive (WebGL, geo/renderer.ts). No map library, no tiles.
// Boot: land mask streams in behind a segmented loading bar. Places = lit LEDs (screen-clustered DOM buttons on top).
// Click a place → camera flies in (van Wijk), dot resolution steps up, sharp close-up mask fades in, contact strip opens.
// Journey replay: scrub / play through stops in time order; route draws LED by LED, km rolls up.
// Perf: renders only while something moves (camera, ripple, replay, fade) — idle = zero frames.
// Masks: `pnpm geo` (scripts/geo/build-geo.mjs) → public/geo + content/geo/masks.json.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { easeInOut, flight, type Flight } from "@/app/experience/canvas/camera";
import masksJson from "@/content/geo/masks.json";
import type { Photo } from "@/content/photos";
import { fmtDate, fmtLat, fmtLon, framesByCountry, pad } from "./format";
import { loadMask } from "./geo/load-mask";
import { PlacePanel } from "./geo/place-panel";
import { buildPlaces, cluster as clusterPlaces, fitView, journey, project, type Cluster } from "./geo/places";
import { DotMap, type Box, type View } from "./geo/renderer";
import "./geo/geo.css";

type Mask = Box & { src: string; w: number; h: number; bytes: number; id?: string };
const masks = masksJson as unknown as { world: Mask | null; regions: Mask[] };

type Props = {
  photos: Photo[];
  onOpen: (id: string) => void;
  /** filter the archive by text + jump to index */
  onFilter: (query: string) => void;
};

const WORLD: View = { x: 10, y: -20, w: 360 };
const MIN_W = 0.8;
/** below this visible span (deg) the close-up mask for the region under the centre loads + fades in */
const REGION_W = 35;
const SMOOTH_MS = 90;
const REPLAY_SPEED = 1.15; // stops per second
const RIPPLE_S = 1.2;
const BAR_CELLS = 28;

/** css px between dots — steps finer as you zoom ("resolution" goes up) */
const spacingFor = (w: number) => (w > 90 ? 8 : w > 30 ? 7 : w > 6 ? 6 : 5);

const clampView = (v: View): View => ({
  w: Math.min(360, Math.max(MIN_W, v.w)),
  x: Math.min(180, Math.max(-180, v.x)),
  y: Math.min(80, Math.max(-80, v.y)),
});

/** "014,382 KM" — fixed width so the readout doesn't jitter while it counts */
const fmtKm = (k: number) => `${Math.round(k).toLocaleString("en-US").padStart(6, "0")} KM`;

export function GeoView({ photos, onOpen, onFilter }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const mapRef = useRef<DotMap | null>(null);
  const pinRefs = useRef(new Map<string, HTMLButtonElement>());

  const [status, setStatus] = useState<"boot" | "ready" | "missing" | "nogl" | "error">(masks.world ? "boot" : "missing");
  const [progress, setProgress] = useState(0);
  const [booted, setBooted] = useState(false); // loader finished its exit animation
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<Cluster | null>(null);
  const [regionLoad, setRegionLoad] = useState<number | null>(null);
  // replay UI state (engine copy lives in `replay` ref)
  const [rp, setRp] = useState({ active: false, playing: false, t: 0 });

  const places = useMemo(() => buildPlaces(photos), [photos]);
  const stops = useMemo(() => journey(places), [places]);
  const route = useMemo(
    () => stops.slice(1).map((s, i) => [stops[i].place.lon, stops[i].place.lat, s.place.lon, s.place.lat] as [number, number, number, number]),
    [stops],
  );

  // --- engine state (refs: read/written every frame, never re-render) ---
  const cam = useRef({ cur: WORLD, target: WORLD, fl: null as null | { f: Flight; t0: number } });
  const replay = useRef({ active: false, playing: false, t: 0 });
  const ripple = useRef<{ lon: number; lat: number; t0: number } | null>(null);
  const region = useRef({ id: null as string | null, mix: 0, loading: null as string | null });
  const raf = useRef(0);
  const last = useRef(0);
  const clusterKey = useRef("");
  const hoverRef = useRef<string | null>(null);
  hoverRef.current = hover;

  const size = () => {
    const c = canvasRef.current;
    return { w: c?.clientWidth || 1, h: c?.clientHeight || 1 };
  };

  const clustersRef = useRef<Cluster[]>([]);
  clustersRef.current = clusters;

  /** pins follow the camera (transform only) */
  const placePins = useCallback(() => {
    const { w, h } = size();
    const v = cam.current.cur;
    for (const c of clustersRef.current) {
      const el = pinRefs.current.get(c.key);
      if (!el) continue;
      const p = project(v, c.lon, c.lat, w, h);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    }
  }, []);

  /** one frame: advance motion, draw, update overlay; returns whether anything is still moving */
  const frame = useCallback(
    (now: number) => {
      const map = mapRef.current;
      if (!map) return false;
      const dt = Math.min(64, now - (last.current || now));
      last.current = now;
      const c = cam.current;
      let moving = false;

      // camera
      if (c.fl) {
        const t = Math.min(1, (now - c.fl.t0) / c.fl.f.ms);
        c.cur = c.target = clampView(c.fl.f.at(easeInOut(t)));
        if (t >= 1) c.fl = null;
        else moving = true;
      } else {
        const a = c.cur;
        const b = c.target;
        if (Math.abs(a.x - b.x) > 1e-4 || Math.abs(a.y - b.y) > 1e-4 || Math.abs(a.w / b.w - 1) > 1e-4) {
          const k = 1 - Math.exp(-dt / SMOOTH_MS);
          c.cur = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * k) };
          moving = true;
        } else c.cur = b;
      }

      // replay
      const r = replay.current;
      if (r.playing) {
        r.t = Math.min(stops.length - 1, r.t + (dt / 1000) * REPLAY_SPEED);
        if (r.t >= stops.length - 1) r.playing = false;
        moving = true;
        setRp({ ...r });
      }

      // region close-up: load when zoomed in over a region, fade in/out
      const v = c.cur;
      const lon = v.x;
      const lat = -v.y;
      const want = v.w < REGION_W ? masks.regions.find((m) => lon > m.lon0 && lon < m.lon1 && lat < m.lat0 && lat > m.lat1) : undefined;
      const reg = region.current;
      if (want && reg.id !== want.id && reg.loading !== want.id) {
        reg.loading = want.id!;
        setRegionLoad(0);
        loadMask(want.src, want.bytes, (p) => setRegionLoad(p))
          .then((bmp) => {
            if (region.current.loading !== want.id) return;
            map.setRegion(bmp, want);
            Object.assign(region.current, { id: want.id, mix: 0, loading: null });
            setRegionLoad(null);
            kickRef.current();
          })
          .catch(() => {
            region.current.loading = null;
            setRegionLoad(null);
          });
      }
      const mixTarget = want && reg.id === want.id ? 1 : 0;
      if (reg.mix !== mixTarget) {
        reg.mix = mixTarget > reg.mix ? Math.min(1, reg.mix + dt / 350) : Math.max(0, reg.mix - dt / 250);
        moving = true;
      }

      // ripple
      const rip = ripple.current;
      let age = -1;
      if (rip) {
        age = (now - rip.t0) / 1000;
        if (age > RIPPLE_S) ripple.current = null;
        else moving = true;
      }

      // lit places
      const reached = r.active ? new Set(stops.slice(0, Math.floor(r.t) + 1).map((s) => s.place.id)) : null;
      const hov = hoverRef.current;
      const points = places
        .filter((p) => !reached || reached.has(p.id))
        .map((p) => [p.lon, p.lat, hov && hov.split("+").includes(p.id) ? 1 : 0.55 + 0.45 * Math.min(1, p.photos.length / 20)] as [number, number, number]);

      map.draw({
        view: v,
        spacing: spacingFor(v.w),
        points,
        route,
        routeT: r.active ? r.t : 0,
        ripple: rip ? [rip.lon, rip.lat, age] : [0, 0, -1],
        regionMix: reg.mix,
      });

      // overlay: re-cluster (cheap) → React only when membership changes; positions via transform
      const { w, h } = size();
      const cl = clusterPlaces(r.active ? places.filter((p) => reached!.has(p.id)) : places, v, w, h);
      const key = cl.map((x) => x.key).join("|");
      if (key !== clusterKey.current) {
        clusterKey.current = key;
        setClusters(cl);
      } else placePins();

      return moving;
    },
    [places, stops, route, placePins],
  );
  // the running loop always calls the latest frame (no stale closures mid-animation)
  const frameRef = useRef(frame);
  frameRef.current = frame;

  /** start the render loop if idle; it stops itself when nothing moves */
  const kick = useCallback(() => {
    if (raf.current) return;
    const loop = (now: number) => {
      raf.current = 0;
      if (frameRef.current(now)) raf.current = requestAnimationFrame(loop);
      else last.current = 0;
    };
    raf.current = requestAnimationFrame(loop);
  }, []);
  const kickRef = useRef(kick);
  kickRef.current = kick;

  useLayoutEffect(() => placePins(), [clusters, placePins]);

  // --- boot: GL + world mask with progress ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !masks.world) return;
    let map: DotMap;
    try {
      map = new DotMap(canvas);
    } catch {
      setStatus("nogl");
      return;
    }
    mapRef.current = map;
    map.resize();
    let alive = true;
    loadMask(masks.world.src, masks.world.bytes, (p) => alive && setProgress(p))
      .then((bmp) => {
        if (!alive) return;
        map.setWorld(bmp);
        setStatus("ready");
        // start on the journey's extent
        const { w, h } = size();
        if (places.length) cam.current.cur = cam.current.target = clampView(fitView(places, w, h, 20, 0.8));
        kick();
      })
      .catch(() => alive && setStatus("error"));
    const ro = new ResizeObserver(() => {
      map.resize();
      kick();
    });
    ro.observe(canvas);
    return () => {
      alive = false;
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      map.dispose();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // photos/filter changed → redraw
  useEffect(() => {
    clusterKey.current = "";
    kick();
  }, [places, kick]);

  // --- camera commands ---
  const flyTo = useCallback(
    (to: View) => {
      const c = cam.current;
      const target = clampView(to);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        c.fl = null;
        c.cur = c.target = target;
      } else c.fl = { f: flight(c.cur, target), t0: performance.now() };
      kick();
    },
    [kick],
  );

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const c = cam.current;
      c.fl = null;
      const { w, h } = size();
      const t = c.target;
      const lon = t.x + (px - w / 2) * (t.w / w);
      const ny = t.y + (py - h / 2) * (t.w / w);
      const nw = Math.min(360, Math.max(MIN_W, t.w * factor));
      c.target = clampView({ w: nw, x: lon - (px - w / 2) * (nw / w), y: ny - (py - h / 2) * (nw / w) });
      kick();
    },
    [kick],
  );

  const pick = useCallback(
    (c: Cluster) => {
      setPicked(c);
      const { w, h } = size();
      const pts = c.places.flatMap((p) => p.photos.map((ph) => ph.geo!));
      // leave room for the contact strip on the right
      const v = fitView(pts, w * 0.62, h, 1.2, 0.75);
      flyTo({ ...v, x: v.x + v.w * 0.19 });
    },
    [flyTo],
  );

  // --- input ---
  useEffect(() => {
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas || status !== "ready") return;
    let drag: { x: number; y: number; id: number } | null = null;

    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const p = local(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(Math.exp(dy * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest("button, input, aside")) return;
      drag = { ...local(e), id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
      el.dataset.drag = "1";
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      const c = cam.current;
      const { w, h } = size();
      // crosshair readout (no React)
      if (coordRef.current && !drag) {
        const v = c.cur;
        const lon = v.x + (p.x - w / 2) * (v.w / w);
        const lat = -(v.y + (p.y - h / 2) * (v.w / w));
        coordRef.current.textContent = Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? `${fmtLat(lat)} ${fmtLon(lon)}` : "— OFF GRID —";
      }
      if (!drag || e.pointerId !== drag.id) return;
      const k = c.cur.w / w;
      c.fl = null;
      c.cur = c.target = clampView({ ...c.cur, x: c.cur.x - (p.x - drag.x) * k, y: c.cur.y - (p.y - drag.y) * k });
      drag = { ...p, id: drag.id };
      kick();
    };
    const onUp = () => {
      drag = null;
      delete el.dataset.drag;
    };
    const onDbl = (e: MouseEvent) => {
      if ((e.target as Element).closest("button, aside")) return;
      const p = local(e);
      zoomAt(0.4, p.x, p.y);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("dblclick", onDbl);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("dblclick", onDbl);
    };
  }, [status, zoomAt, kick]);

  // keys (map focused)
  const onKey = (e: KeyboardEvent) => {
    const { w, h } = size();
    const c = cam.current;
    const step = c.target.w * 0.15;
    const k = e.key;
    if (k === "+" || k === "=") zoomAt(0.6, w / 2, h / 2);
    else if (k === "-" || k === "_") zoomAt(1 / 0.6, w / 2, h / 2);
    else if (k === "0") resetView();
    else if (k.startsWith("Arrow")) {
      c.fl = null;
      c.target = clampView({
        ...c.target,
        x: c.target.x + (k === "ArrowRight" ? step : k === "ArrowLeft" ? -step : 0),
        y: c.target.y + (k === "ArrowDown" ? step : k === "ArrowUp" ? -step : 0),
      });
      kick();
    } else return;
    e.preventDefault();
  };

  const resetView = () => {
    setPicked(null);
    const { w, h } = size();
    flyTo(places.length ? fitView(places, w, h, 20, 0.8) : WORLD);
  };

  // --- replay controls ---
  const setReplay = (next: Partial<typeof replay.current>) => {
    Object.assign(replay.current, next);
    setRp({ ...replay.current });
    kick();
  };
  const play = () => {
    const r = replay.current;
    setPicked(null);
    if (!r.active || r.t >= stops.length - 1) {
      const { w, h } = size();
      flyTo(fitView(stops.map((s) => s.place), w, h, 20, 0.85));
      setReplay({ active: true, playing: true, t: 0 });
    } else setReplay({ playing: !r.playing });
  };

  const stopNow = stops[Math.min(stops.length - 1, Math.floor(rp.t))];
  const kmNow = (() => {
    if (!rp.active || !stops.length) return stops[stops.length - 1]?.km ?? 0;
    const i = Math.floor(rp.t);
    const a = stops[i];
    const b = stops[Math.min(stops.length - 1, i + 1)];
    return a.km + (b.km - a.km) * (rp.t - i);
  })();

  // --- boot screen fades out after the bar fills ---
  useEffect(() => {
    if (status !== "ready") return;
    const t = window.setTimeout(() => setBooted(true), 650);
    return () => window.clearTimeout(t);
  }, [status]);

  if (status === "missing" || status === "nogl" || status === "error") return <GeoFallback photos={photos} status={status} />;

  const cells = Math.round(progress * BAR_CELLS);
  const fixes = photos.filter((p) => p.geo).length;

  return (
    <div
      ref={wrapRef}
      className="geo-map"
      data-lenis-prevent
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={`Map of ${places.length} places. Arrow keys pan, plus and minus zoom, 0 resets.`}
    >
      <canvas ref={canvasRef} className="geo-map__canvas" data-cursor="pixelMove" />

      {/* place pins (screen-space clusters) */}
      <div className="geo-map__pins" data-on={status === "ready" || undefined}>
        {clusters.map((c) => (
          <button
            key={c.key}
            ref={(el) => {
              if (el) pinRefs.current.set(c.key, el);
              else pinRefs.current.delete(c.key);
            }}
            type="button"
            className="geo-pin"
            data-hot={hover === c.key || picked?.key === c.key || undefined}
            aria-label={`${c.label}, ${c.count} frames`}
            onPointerEnter={() => {
              setHover(c.key);
              ripple.current = { lon: c.lon, lat: c.lat, t0: performance.now() };
              kick();
            }}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(c.key)}
            onBlur={() => setHover(null)}
            onClick={() => pick(c)}
          >
            <span className="geo-pin__ring" aria-hidden />
            <span className="geo-pin__n">{pad(c.count, c.count > 99 ? 3 : 2)}</span>
            <span className="geo-pin__tip">
              {c.label.toUpperCase()}
              <span className="geo-pin__dim"> · {fmtDate(c.places.map((p) => p.first).filter(Boolean).sort()[0] ?? null)}</span>
            </span>
          </button>
        ))}
      </div>

      {/* instrument chrome */}
      <div className="geo-map__tl">
        <span className="geo-map__led" data-busy={regionLoad !== null || undefined} aria-hidden />
        GEO // {pad(places.length, 2)} PLACES · {pad(fixes)} FIXES
        {regionLoad !== null && <span className="geo-map__enh"> · ENHANCE {Math.round(regionLoad * 100)}%</span>}
      </div>
      <div className="geo-map__tr">
        <button type="button" onClick={() => zoomAt(0.6, size().w / 2, size().h / 2)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAt(1 / 0.6, size().w / 2, size().h / 2)} aria-label="Zoom out">−</button>
        <button type="button" onClick={resetView}>WORLD</button>
      </div>
      <span ref={coordRef} className="geo-map__coord" aria-hidden>
        — — —
      </span>

      {/* journey replay */}
      {stops.length > 1 && (
        <div className="geo-replay" data-active={rp.active || undefined}>
          <button type="button" className="geo-replay__play" onClick={play} aria-label={rp.playing ? "Pause journey" : "Play journey"}>
            {rp.playing ? "❚❚" : "▶"} {rp.active ? (rp.playing ? "PAUSE" : "PLAY") : "REPLAY JOURNEY"}
          </button>
          <input
            type="range"
            min={0}
            max={stops.length - 1}
            step={0.01}
            value={rp.t}
            aria-label="Journey position"
            onChange={(e) => setReplay({ active: true, playing: false, t: +e.target.value })}
            style={{ "--p": `${(rp.t / (stops.length - 1)) * 100}%` } as CSSProperties}
          />
          <span className="geo-replay__read">
            <span className="geo-replay__date">{fmtDate(stopNow?.at ?? null)}</span>
            <span className="geo-replay__place">
              {pad(Math.floor(rp.t) + 1, 2)}/{pad(stops.length, 2)} {stopNow?.place.label.toUpperCase()}
            </span>
          </span>
          <span className="geo-replay__km">
            DIST <b>{fmtKm(kmNow)}</b>
          </span>
          {rp.active && (
            <button type="button" className="geo-replay__x" onClick={() => setReplay({ active: false, playing: false, t: 0 })}>
              RESET
            </button>
          )}
        </div>
      )}

      {picked && (
        <PlacePanel
          key={picked.key}
          cluster={picked}
          onOpen={onOpen}
          onFilter={onFilter}
          onClose={() => setPicked(null)}
        />
      )}

      {/* boot loader */}
      {!booted && (
        <div className="geo-boot" data-done={status === "ready" || undefined} aria-live="polite">
          <p>&gt; LINK GEO MODULE</p>
          <p>
            &gt; FETCH LAND MASK {masks.world?.w}×{masks.world?.h}{" "}
            <span className="geo-boot__dim">{Math.round(((masks.world?.bytes ?? 0) * progress) / 1024)} KB</span>
          </p>
          <div className="geo-boot__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            {Array.from({ length: BAR_CELLS }, (_, i) => (
              <span key={i} data-on={i < cells || undefined} />
            ))}
            <b>{pad(Math.round(progress * 100), 3)}%</b>
          </div>
          {status === "ready" && <p>&gt; PLOT {pad(places.length, 2)} PLACES / {pad(fixes)} FIXES … OK</p>}
        </div>
      )}
    </div>
  );
}

/** no map data / no WebGL: honest standby panel with frames-per-country bars */
function GeoFallback({ photos, status }: { photos: Photo[]; status: string }) {
  const rows = framesByCountry(photos);
  const max = rows[0]?.[1] ?? 1;
  const msg =
    status === "missing" ? "MAP DATA NOT BUILT — RUN `pnpm geo`" : status === "nogl" ? "WEBGL UNAVAILABLE" : "MAP DATA FAILED TO LOAD";
  return (
    <div className="geo">
      <p className="geo__status">
        <span className="geo__led" aria-hidden /> GEO // {msg}
      </p>
      <ul className="geo__bars">
        {rows.map(([name, n], i) => (
          <li key={name} style={{ "--w": n / max, "--i": i } as CSSProperties}>
            <span className="geo__name">{name.toUpperCase()}</span>
            <span className="geo__bar" aria-hidden />
            <span className="geo__n">{pad(n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

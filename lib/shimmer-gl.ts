"use client";

// Fluid shimmer renderer: ONE shared WebGL context (offscreen) → copied into a cheap 2D canvas per panel.
// Fits: used by FrostPanel (hover="shimmer"). Each panel fades independently; ticker runs only while any is visible.
// Look: liquid colour blob trailing the cursor (spring-chain tail), noise-warped edges, swirl with speed, faint ambient flow.

import { gsap } from "@/lib/gsap";

export type ShimmerOpts = {
  /** 1–5 hex colours, cycled. */
  colors: string[];
  /** Overall alpha 0–1. */
  intensity: number;
  /** Blob radius, css px. */
  radius: number;
};

/** Render resolution vs css px (effect is soft → low res is invisible + cheap). */
const RES_SCALE = 0.5;
const MAX_DPR = 2;
const TRAIL = 6;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uTrail[${TRAIL}];
uniform vec2 uVel;
uniform float uHover;
uniform float uIntensity;
uniform float uRadius;
uniform vec3 uColors[5];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
vec3 palette(float t) {
  t = fract(t) * 5.0;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float d = abs(t - float(i));
    d = min(d, 5.0 - d);
    c += uColors[i] * max(0.0, 1.0 - d);
  }
  return c;
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 q = p / 180.0;
  vec2 w = vec2(fbm(q + uTime * 0.15), fbm(q + vec2(5.2, 1.3) - uTime * 0.12));

  // swirl around the cursor, stronger with speed
  vec2 d0 = p - uTrail[0];
  float swirl = clamp(length(uVel) / 1500.0, 0.0, 1.0) * exp(-dot(d0, d0) / (uRadius * uRadius * 4.0));
  float ang = swirl * 2.5;
  d0 = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * d0;
  vec2 pw = uTrail[0] + d0 + (w - 0.5) * uRadius * 0.9;

  // metaball field along the tail
  float f = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    float fi = float(i);
    vec2 d = pw - uTrail[i];
    float r = uRadius * (1.0 - fi * 0.1);
    f += (1.0 - fi * 0.13) * exp(-dot(d, d) / (r * r));
  }
  f *= uHover;

  float mask = smoothstep(0.15, 1.1, f);
  float ambient = 0.12 * uHover * fbm(q * 0.7 + w * 1.5 + uTime * 0.05);
  vec3 col = palette(fbm(q * 0.6 + w * 2.0) * 1.6 + uTime * 0.04 + f * 0.12);
  float a = clamp((mask + ambient) * uIntensity, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
}`;

type GL = {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  u: Record<string, WebGLUniformLocation | null>;
};

/** One panel's shimmer: own canvas, tail, fade. */
type Inst = {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  c2d: CanvasRenderingContext2D;
  opts: ShimmerOpts;
  colors: Float32Array;
  client: { x: number; y: number };
  trail: Float32Array;
  vel: { x: number; y: number };
  hover: number;
  target: number;
  live: boolean;
};

let ctx: GL | null = null;
let broken = false;
let running = false;
const insts = new Map<HTMLElement, Inst>();

function init(): GL | null {
  if (ctx || broken) return ctx;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return fail();

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("[shimmer]", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return fail();
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fail();
  gl.useProgram(prog);

  // one big triangle covering the viewport
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u: GL["u"] = {};
  for (const n of ["uRes", "uTime", "uTrail", "uVel", "uHover", "uIntensity", "uRadius", "uColors"]) {
    u[n] = gl.getUniformLocation(prog, n);
  }

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stop();
    for (const i of insts.values()) {
      i.canvas.remove();
      delete i.el.dataset.shimmerGl;
    }
    insts.clear();
    ctx = null;
    broken = true;
  });

  ctx = { gl, canvas, u };
  return ctx;
}

function fail() {
  broken = true;
  return null;
}

/** Hex list → 5 rgb slots (cycled). */
function packColors(colors: string[]) {
  const list = colors.length ? colors : ["#ffffff"];
  const out = new Float32Array(15);
  for (let i = 0; i < 5; i++) {
    const hex = list[i % list.length].replace("#", "");
    const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
    const n = parseInt(full.slice(0, 6), 16) || 0;
    out[i * 3] = ((n >> 16) & 255) / 255;
    out[i * 3 + 1] = ((n >> 8) & 255) / 255;
    out[i * 3 + 2] = (n & 255) / 255;
  }
  return out;
}

/** Client px → panel-local css px (handles actor scale; layout size, not transformed box). */
function toLocal(i: Inst, rect: DOMRect) {
  const sx = rect.width ? i.el.offsetWidth / rect.width : 1;
  const sy = rect.height ? i.el.offsetHeight / rect.height : 1;
  return { x: (i.client.x - rect.left) * sx, y: (i.client.y - rect.top) * sy };
}

/** Start shimmering `el`; its canvas lives in `host`. false = WebGL unavailable (use CSS fallback). */
export function shimmerEnter(el: HTMLElement, host: HTMLElement, o: ShimmerOpts, cx: number, cy: number) {
  if (!init()) return false;
  let i = insts.get(el);
  if (!i) {
    const canvas = document.createElement("canvas");
    canvas.className = "frost-panel__canvas";
    canvas.setAttribute("aria-hidden", "true");
    const c2d = canvas.getContext("2d");
    if (!c2d) return false;
    i = {
      el, canvas, c2d, opts: o, colors: packColors(o.colors),
      client: { x: cx, y: cy }, trail: new Float32Array(TRAIL * 2),
      vel: { x: 0, y: 0 }, hover: 0, target: 0, live: false,
    };
    insts.set(el, i);
  }
  if (i.canvas.parentElement !== host) host.appendChild(i.canvas);
  if (i.opts.colors.join() !== o.colors.join()) i.colors = packColors(o.colors);
  i.opts = o;
  i.client = { x: cx, y: cy };
  if (!i.live) {
    // fresh start: tail collapsed at the cursor
    const p = toLocal(i, el.getBoundingClientRect());
    for (let k = 0; k < TRAIL; k++) {
      i.trail[k * 2] = p.x;
      i.trail[k * 2 + 1] = p.y;
    }
    i.vel = { x: 0, y: 0 };
    i.hover = 0;
    i.live = true;
  }
  i.target = 1;
  if (!running) {
    running = true;
    gsap.ticker.add(tick);
  }
  return true;
}

export function shimmerMove(el: HTMLElement, cx: number, cy: number) {
  const i = insts.get(el);
  if (i) i.client = { x: cx, y: cy };
}

/** Fade this panel out (others unaffected). */
export function shimmerLeave(el: HTMLElement) {
  const i = insts.get(el);
  if (i) i.target = 0;
}

/** Panel unmounting: drop it now. */
export function shimmerDetach(el: HTMLElement) {
  const i = insts.get(el);
  if (!i) return;
  i.canvas.remove();
  insts.delete(el);
}

function stop() {
  if (!running) return;
  running = false;
  gsap.ticker.remove(tick);
}

function tick(time: number, deltaMs: number) {
  if (!ctx) return stop();
  const dt = Math.min(deltaMs / 1000, 0.05);
  let any = false;
  for (const i of insts.values()) {
    if (!i.live) continue;
    if (step(i, dt)) {
      draw(ctx, i, time);
      any = true;
    } else {
      i.live = false;
      i.c2d.clearRect(0, 0, i.canvas.width, i.canvas.height);
    }
  }
  if (!any) stop();
}

/** Advance tail + fade. false = fully faded. */
function step(i: Inst, dt: number) {
  const { trail, vel } = i;
  const m = toLocal(i, i.el.getBoundingClientRect());
  const px = trail[0];
  const py = trail[1];
  // spring-chain tail: head chases cursor, each link chases the one before
  const kHead = 1 - Math.exp(-dt * 22);
  trail[0] += (m.x - trail[0]) * kHead;
  trail[1] += (m.y - trail[1]) * kHead;
  const kLink = 1 - Math.exp(-dt * 14);
  for (let k = 1; k < TRAIL; k++) {
    trail[k * 2] += (trail[k * 2 - 2] - trail[k * 2]) * kLink;
    trail[k * 2 + 1] += (trail[k * 2 - 1] - trail[k * 2 + 1]) * kLink;
  }
  if (dt > 0) {
    const kv = 1 - Math.exp(-dt * 8);
    vel.x += ((trail[0] - px) / dt - vel.x) * kv;
    vel.y += ((trail[1] - py) / dt - vel.y) * kv;
  }
  i.hover += (i.target - i.hover) * (1 - Math.exp(-dt * (i.target ? 6 : 4)));
  return !(i.target === 0 && i.hover < 0.01);
}

/** Render one panel in the shared context, copy into its 2D canvas. */
function draw({ gl, canvas, u }: GL, i: Inst, time: number) {
  const w = i.el.offsetWidth;
  const h = i.el.offsetHeight;
  const s = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RES_SCALE;
  const pw = Math.max(1, Math.round(w * s));
  const ph = Math.max(1, Math.round(h * s));
  if (i.canvas.width !== pw || i.canvas.height !== ph) {
    i.canvas.width = pw;
    i.canvas.height = ph;
  }
  // shared buffer only grows (no realloc per panel)
  if (canvas.width < pw || canvas.height < ph) {
    canvas.width = Math.max(canvas.width, pw);
    canvas.height = Math.max(canvas.height, ph);
  }
  gl.viewport(0, 0, pw, ph);
  gl.uniform2f(u.uRes, w, h);
  gl.uniform1f(u.uTime, time);
  gl.uniform2fv(u.uTrail, i.trail);
  gl.uniform2f(u.uVel, i.vel.x, i.vel.y);
  gl.uniform1f(u.uHover, i.hover);
  gl.uniform1f(u.uIntensity, i.opts.intensity);
  gl.uniform1f(u.uRadius, i.opts.radius);
  gl.uniform3fv(u.uColors, i.colors);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // GL origin is bottom-left → panel's pixels are the bottom ph rows
  i.c2d.clearRect(0, 0, pw, ph);
  i.c2d.drawImage(canvas, 0, canvas.height - ph, pw, ph, 0, 0, pw, ph);
}

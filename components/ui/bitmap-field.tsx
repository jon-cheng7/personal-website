"use client";

// 1-bit dithered (Bayer 8×8) animated gradient — accent pixels on transparent. WebGL, low-res canvas, pixelated.
// Fits: reusable backdrop; inside an <Actor>, its `tide` channel (0 → 1) floods the field up from the bottom.
// Cursor brightens nearby pixels; every click sends a ripple (up to MAX_RIPPLES live). Runs only while tide > 0 and on screen.

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useChannel } from "@/components/choreo";
import "./bitmap-field.css";

type Props = {
  /** Pixel colour (default: --color-accent). */
  color?: string;
  /** Css px per bitmap pixel. */
  pixel?: number;
  /** Top of the gradient at tide = 1 (0–1 of the box, from bottom). Solid below ~height − 0.4. */
  height?: number;
  /** Actor channel driving the flood. No channel → full. */
  channel?: string;
  className?: string;
};

/** Ripples alive at once (oldest recycled past this). Each lives RIPPLE_LIFE s. */
const MAX_RIPPLES = 24;
const RIPPLE_LIFE = 1.6;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
#define MAX_RIPPLES ${MAX_RIPPLES}
#define LIFE ${RIPPLE_LIFE.toFixed(2)}
precision mediump float;
uniform vec2 uRes;      // canvas px
uniform float uTime;
uniform float uTide;
uniform float uHeight;
uniform vec2 uMouse;    // canvas px, y up; <0 = none
uniform vec3 uRipples[MAX_RIPPLES]; // x, y (canvas px), age s (<0 / ≥LIFE = dead)
uniform vec3 uColor;

float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  float aspect = uRes.x / uRes.y;

  // tide line: rises with uTide, wobbles with slow noise
  float line = mix(-0.35, uHeight, uTide) + 0.06 * sin(uv.x * 5.0 + uTime * 0.6) * uTide;
  vec2 q = vec2(uv.x * aspect, uv.y) * 2.5;
  float n = fbm(q + vec2(uTime * 0.05, -uTime * 0.08)) - 0.5;
  float v = (line - uv.y) / 0.4 + n * 0.45; // 0 at the line → solid 0.4 below it

  // sparse twinkle above the tide
  v += 0.12 * uTide * step(0.985, hash(floor(px) + floor(uTime * 3.0)));

  // cursor bloom
  if (uMouse.x >= 0.0) {
    float d = length((px - uMouse) / uRes.y);
    v += 0.55 * exp(-d * d / 0.012) * uTide;
  }
  // click ripple rings (overlapping rings add up)
  for (int i = 0; i < MAX_RIPPLES; i++) {
    vec3 rp = uRipples[i];
    if (rp.z < 0.0 || rp.z >= LIFE) continue;
    float d = length((px - rp.xy) / uRes.y);
    float r = rp.z * 0.75;
    v += 0.7 * exp(-pow((d - r) / 0.035, 2.0)) * (1.0 - rp.z / LIFE);
  }

  float on = v > bayer8(px) + 0.002 ? 1.0 : 0.0;
  gl_FragColor = vec4(uColor * on, on);
}`;

export function BitmapField({ color, pixel = 5, height = 0.62, channel = "tide", className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  /** -1 = not set yet (→ 0 if driven, else 1). */
  const tide = useRef(-1);
  const kick = useRef<() => void>(() => {});

  const driven = useChannel(channel, (v) => {
    tide.current = v;
    kick.current();
  });

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    if (tide.current < 0) tide.current = driven ? 0 : 1;
    const gl = c.getContext("webgl", { premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    // lost context (e.g. GPU reset) → skip; canvas stays empty
    if (!gl || gl.isContextLost()) return;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("[bitmap]", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { res: U("uRes"), time: U("uTime"), tide: U("uTide"), height: U("uHeight"), mouse: U("uMouse"), ripples: U("uRipples"), color: U("uColor") };

    const hex = (color || getComputedStyle(c).getPropertyValue("--color-accent").trim() || "#c5fb45").replace("#", "");
    const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
    const n = parseInt(full.slice(0, 6), 16) || 0;
    gl.uniform3f(u.color, ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    gl.uniform1f(u.height, height);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mouse = { x: -1, y: -1 };
    // ring buffer: [x, y, bornTime] per slot
    const born = new Float32Array(MAX_RIPPLES * 3).fill(-1e3);
    const rippleBuf = new Float32Array(MAX_RIPPLES * 3);
    let nextSlot = 0;
    let running = false;
    let visible = false;
    let lastTide = -1;

    const resize = () => {
      const w = Math.max(1, Math.ceil(c.offsetWidth / pixel));
      const h = Math.max(1, Math.ceil(c.offsetHeight / pixel));
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const toCanvas = (cx: number, cy: number) => {
      const r = c.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
      return { x: ((cx - r.left) / r.width) * c.width, y: (1 - (cy - r.top) / r.height) * c.height };
    };

    const draw = (time: number) => {
      gl.uniform2f(u.res, c.width, c.height);
      gl.uniform1f(u.time, reduce ? 0 : time);
      gl.uniform1f(u.tide, tide.current);
      gl.uniform2f(u.mouse, mouse.x, mouse.y);
      for (let i = 0; i < MAX_RIPPLES; i++) {
        rippleBuf[i * 3] = born[i * 3];
        rippleBuf[i * 3 + 1] = born[i * 3 + 1];
        rippleBuf[i * 3 + 2] = reduce ? -1 : time - born[i * 3 + 2];
      }
      gl.uniform3fv(u.ripples, rippleBuf);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const tick = (time: number) => {
      if (tide.current <= 0 || !visible) return stop();
      draw(time);
      // reduced motion: draw only when tide changes
      if (reduce && tide.current === lastTide) return stop();
      lastTide = tide.current;
    };
    const start = () => {
      if (running || tide.current <= 0 || !visible) return;
      running = true;
      gsap.ticker.add(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      gsap.ticker.remove(tick);
      if (tide.current <= 0) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    };
    kick.current = () => {
      lastTide = -1;
      if (tide.current <= 0) stop();
      else start();
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(c);

    const onMove = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      mouse = p ?? { x: -1, y: -1 };
    };
    const onDown = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      if (!p) return;
      born.set([p.x, p.y, gsap.ticker.time], nextSlot * 3);
      nextSlot = (nextSlot + 1) % MAX_RIPPLES;
    };
    const onResize = () => {
      resize();
      lastTide = -1;
      if (running) draw(gsap.ticker.time);
    };
    resize();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", onResize);
    start();

    return () => {
      stop();
      io.disconnect();
      kick.current = () => {};
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      // free GL objects but keep the context: a canvas returns the SAME context on re-run (Strict Mode / HMR),
      // so losing it here breaks the next mount.
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [color, pixel, height, driven]);

  return <canvas ref={canvas} className={className ? `bitmap-field ${className}` : "bitmap-field"} aria-hidden="true" />;
}

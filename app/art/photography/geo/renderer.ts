// geo/renderer — WebGL1 dot-matrix map. No library; two tiny passes, drawn only when asked.
// Pass A (one fragment per DOT, into a cols×rows texture): land coverage (world mask, mip-mapped → area-correct;
//   region close-up mask blended in), lit photo places, hover ripple.
// Country highlight: an RGB id map (id = R + G·256, NEAREST) + a 1024×1 on/off lookup texture; when any country is
//   picked (uHi > 0) picked land → light grey, all other land → dark grey. Id maps load lazily (first use of the list).
// The journey route is NOT dots — it's a thin solid SVG line on top (geo-view.tsx), so it stays legible.
// Pass B (full canvas): each pixel finds its dot cell, reads pass A, draws one anti-aliased round LED.
// The dot grid is fixed to the screen; the map moves underneath it → land "flows" through the board when panning.

export type View = { x: number; y: number; w: number }; // centre lon, centre -lat (y down), visible lon span (deg)

export const MAX_PTS = 64;

export type Frame = {
  view: View;
  /** css px between dot centres */
  spacing: number;
  /** lon, lat, intensity 0–1 */
  points: [number, number, number][];
  /** hover ripple: lon, lat, age s (age < 0 = none) */
  ripple: [number, number, number];
  /** region close-up blend 0–1 */
  regionMix: number;
  /** country highlight strength 0–1 (0 = off) */
  highlight: number;
};

export type Box = { lon0: number; lon1: number; lat0: number; lat1: number };

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG_A = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uGrid;        // cols, rows
uniform vec2 uCanvas;      // device px
uniform float uSp;         // device px per dot
uniform vec3 uView;        // lon, -lat, lon span
uniform sampler2D uWorld;
uniform sampler2D uRegion;
uniform vec4 uRegionBox;   // lon0, lat0 (north), lon1, lat1 (south)
uniform float uRegionMix;
uniform sampler2D uCWorld;   // country ids
uniform sampler2D uCRegion;
uniform float uCRegionOn;
uniform sampler2D uSel;      // 1024×1 on/off per id
uniform float uHi;
uniform vec4 uPts[${MAX_PTS}];
uniform int uPtsN;
uniform vec3 uRipple;

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 px = (cell + 0.5) * uSp;                       // dot centre, device px from bottom-left
  float dpp = uView.z / uCanvas.x;                    // degrees per device px
  float lon = uView.x + (px.x - 0.5 * uCanvas.x) * dpp;
  float lat = -uView.y + (px.y - 0.5 * uCanvas.y) * dpp;
  float dDot = dpp * uSp;                             // degrees per dot

  // land (+ picked country)
  float land = 0.0;
  float sel = 0.0;
  if (lat > -90.0 && lat < 90.0 && lon > -180.0 && lon < 180.0) {
    vec2 wuv = vec2((lon + 180.0) / 360.0, (90.0 - lat) / 180.0);
    land = texture2D(uWorld, wuv).r;
    bool inRegion = lon > uRegionBox.x && lon < uRegionBox.z && lat < uRegionBox.y && lat > uRegionBox.w;
    vec2 ruv = vec2((lon - uRegionBox.x) / (uRegionBox.z - uRegionBox.x), (uRegionBox.y - lat) / (uRegionBox.y - uRegionBox.w));
    if (uRegionMix > 0.0 && inRegion) land = mix(land, texture2D(uRegion, ruv).r, uRegionMix);
    if (uHi > 0.0) {
      vec4 c = (uCRegionOn > 0.5 && uRegionMix > 0.5 && inRegion) ? texture2D(uCRegion, ruv) : texture2D(uCWorld, wuv);
      float id = floor(c.r * 255.0 + 0.5) + floor(c.g * 255.0 + 0.5) * 256.0;
      sel = id > 0.5 ? texture2D(uSel, vec2((id + 0.5) / 1024.0, 0.5)).r : 0.0;
    }
  }

  // lit places: core + soft halo, measured in dots
  vec2 here = vec2(lon, lat);
  float lit = 0.0;
  for (int i = 0; i < ${MAX_PTS}; i++) {
    if (i >= uPtsN) break;
    float d = length((here - uPts[i].xy) / dDot);
    lit = max(lit, uPts[i].z * (d < 0.8 ? 1.0 : 0.55 * exp(-d * d / 3.0)));
  }

  // hover ripple: expanding ring, 1.2 s
  float ring = 0.0;
  if (uRipple.z >= 0.0) {
    float d = length((here - uRipple.xy) / dDot);
    float r = uRipple.z * 22.0;
    ring = (1.0 - smoothstep(0.0, 1.4, abs(d - r))) * (1.0 - uRipple.z / 1.2);
  }

  gl_FragColor = vec4(land, lit, sel, max(ring, 0.0));
}`;

const FRAG_B = `
precision mediump float;
uniform sampler2D uDots;
uniform vec2 uGrid;
uniform float uSp;
uniform vec3 uBase;
uniform vec3 uLit;
uniform float uHi;           // country highlight strength

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uSp);
  vec4 s = texture2D(uDots, (cell + 0.5) / uGrid);
  float r = length(gl_FragCoord.xy - (cell + 0.5) * uSp);

  // low threshold: a dot that is only partly land still lights → small islands (Crete, Capri) + thin coasts survive
  float land = smoothstep(0.03, 0.35, s.r);
  float glow = max(s.g, s.a * 0.7);
  float radius = uSp * (0.13 + 0.2 * land + 0.1 * glow);
  // land brightness: normal 0.38; highlighting → picked 0.44 (barely above normal — the contrast comes from
  // everything else dropping), the rest 0.1 (dark grey)
  float landA = mix(0.38, mix(0.1, 0.44, s.b), uHi);
  float a = (0.07 + landA * land) * (1.0 - glow) + glow;
  vec3 col = mix(uBase, uLit, clamp(glow * 1.2, 0.0, 1.0));
  float edge = 1.0 - smoothstep(radius - 0.9, radius + 0.4, r);
  gl_FragColor = vec4(col * a * edge, a * edge); // premultiplied
}`;

function compile(gl: WebGLRenderingContext, vs: string, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
  return p;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

export class DotMap {
  private gl: WebGLRenderingContext;
  private progA: WebGLProgram;
  private progB: WebGLProgram;
  private world: WebGLTexture | null = null;
  private region: WebGLTexture | null = null;
  private regionBox: Box | null = null;
  private dots: WebGLTexture;
  private fbo: WebGLFramebuffer;
  private grid = [0, 0];
  private uA = new Map<string, WebGLUniformLocation | null>();
  private uB = new Map<string, WebGLUniformLocation | null>();
  private cWorld: WebGLTexture | null = null;
  private cRegion: WebGLTexture | null = null;
  private sel: WebGLTexture;
  private selBuf = new Uint8Array(1024);
  private ptsBuf = new Float32Array(MAX_PTS * 4);
  dpr = 1;

  constructor(private canvas: HTMLCanvasElement, private colors = { base: "#f5f5f5", lit: "#c5fb45" }) {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true, powerPreference: "low-power" });
    if (!gl) throw new Error("webgl");
    this.gl = gl;
    this.progA = compile(gl, VERT, FRAG_A);
    this.progB = compile(gl, VERT, FRAG_B);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    for (const p of [this.progA, this.progB]) {
      const loc = gl.getAttribLocation(p, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    this.dots = gl.createTexture()!;
    this.sel = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.sel);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1024, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.selBuf);
    this.nearest();
    this.fbo = gl.createFramebuffer()!;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private loc(prog: WebGLProgram, cache: Map<string, WebGLUniformLocation | null>, name: string) {
    if (!cache.has(name)) cache.set(name, this.gl.getUniformLocation(prog, name));
    return cache.get(name)!;
  }

  private nearest() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** upload a country id map (RGB, exact values: no filtering, no colour conversion) */
  private idTexture(img: TexImageSource) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    this.nearest();
    return t;
  }

  /** world country id map (lazy) */
  setCountries(img: TexImageSource) {
    if (this.cWorld) this.gl.deleteTexture(this.cWorld);
    this.cWorld = this.idTexture(img);
  }

  /** close-up country id map for the current region box (null = use the world one) */
  setRegionCountries(img: TexImageSource | null) {
    if (this.cRegion) this.gl.deleteTexture(this.cRegion);
    this.cRegion = img ? this.idTexture(img) : null;
  }

  get hasCountries() {
    return !!this.cWorld;
  }

  /** picked country ids */
  setSelection(ids: Iterable<number>) {
    const gl = this.gl;
    this.selBuf.fill(0);
    for (const id of ids) if (id > 0 && id < 1024) this.selBuf[id] = 255;
    gl.bindTexture(gl.TEXTURE_2D, this.sel);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1024, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.selBuf);
  }

  /** upload a grey mask; world = mip-mapped (power-of-two) */
  private texture(img: TexImageSource, mip: boolean) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return t;
  }

  setWorld(img: TexImageSource) {
    this.world = this.texture(img, true);
  }

  setRegion(img: TexImageSource | null, box: Box | null) {
    if (this.region) this.gl.deleteTexture(this.region);
    this.region = img ? this.texture(img, false) : null;
    this.regionBox = box;
    this.setRegionCountries(null); // belongs to the old box
  }

  /** match canvas backing store to its css size (call on resize) */
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * this.dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(f: Frame) {
    const gl = this.gl;
    if (!this.world) return;
    const { width: W, height: H } = this.canvas;
    const sp = Math.max(2, Math.round(f.spacing * this.dpr));
    const cols = Math.ceil(W / sp);
    const rows = Math.ceil(H / sp);

    // pass A target (re)alloc on grid change
    if (cols !== this.grid[0] || rows !== this.grid[1]) {
      this.grid = [cols, rows];
      gl.bindTexture(gl.TEXTURE_2D, this.dots);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.dots, 0);
    }

    // --- pass A ---
    const A = this.progA;
    const ua = (n: string) => this.loc(A, this.uA, n);
    gl.useProgram(A);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, cols, rows);
    gl.disable(gl.BLEND);
    gl.uniform2f(ua("uGrid"), cols, rows);
    gl.uniform2f(ua("uCanvas"), W, H);
    gl.uniform1f(ua("uSp"), sp);
    gl.uniform3f(ua("uView"), f.view.x, f.view.y, f.view.w);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.world);
    gl.uniform1i(ua("uWorld"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.region ?? this.world);
    gl.uniform1i(ua("uRegion"), 1);
    const rb = this.regionBox;
    gl.uniform4f(ua("uRegionBox"), rb?.lon0 ?? 0, rb?.lat0 ?? 0, rb?.lon1 ?? 0, rb?.lat1 ?? 0);
    gl.uniform1f(ua("uRegionMix"), this.region ? f.regionMix : 0);
    const hi = this.cWorld ? f.highlight : 0;
    gl.uniform1f(ua("uHi"), hi);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.cWorld ?? this.world);
    gl.uniform1i(ua("uCWorld"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.cRegion ?? this.cWorld ?? this.world);
    gl.uniform1i(ua("uCRegion"), 3);
    gl.uniform1f(ua("uCRegionOn"), this.cRegion ? 1 : 0);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.sel);
    gl.uniform1i(ua("uSel"), 4);
    const n = Math.min(MAX_PTS, f.points.length);
    f.points.slice(0, n).forEach(([lon, lat, k], i) => this.ptsBuf.set([lon, lat, k, 0], i * 4));
    gl.uniform4fv(ua("uPts"), this.ptsBuf);
    gl.uniform1i(ua("uPtsN"), n);
    gl.uniform3f(ua("uRipple"), f.ripple[0], f.ripple[1], f.ripple[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- pass B ---
    const B = this.progB;
    const ub = (n: string) => this.loc(B, this.uB, n);
    gl.useProgram(B);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dots);
    gl.uniform1i(ub("uDots"), 0);
    gl.uniform2f(ub("uGrid"), cols, rows);
    gl.uniform1f(ub("uSp"), sp);
    gl.uniform3fv(ub("uBase"), hex(this.colors.base));
    gl.uniform3fv(ub("uLit"), hex(this.colors.lit));
    gl.uniform1f(ub("uHi"), hi);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.world);
    gl.deleteTexture(this.region);
    gl.deleteTexture(this.dots);
    gl.deleteTexture(this.cWorld);
    gl.deleteTexture(this.cRegion);
    gl.deleteTexture(this.sel);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteProgram(this.progA);
    gl.deleteProgram(this.progB);
    // context intentionally not lost: StrictMode/dev remounts reuse the same canvas
  }
}

/**
 * Frost: a window freezing over. Ice ferns grow over it from its frame and a scratch in the glass, in Kobayashi's
 * phase field for a growing crystal (1993), stepped on the GPU, and a film of hoar fogs the glass between them. A finger warms the glass and melts it clear where it is held or drawn, into water that beads and
 * dries; let go and the ice grows back over the spot from its edge, and the fog forms again.
 *
 * One file, no dependencies: WebGL 2 and eight fragment shaders. The ice lives on a grid of cells (about one to a CSS
 * pixel, up to 900,000) that holds, for each cell, how much of it is ice (p), its temperature (T), the warmth a finger
 * has put into the glass (W) and the water left by melted ice; the fog on a grid of the same size; and when each cell
 * froze, so the ice can be drawn as the needles it grew as, along the way it grew, finer than the grid. The street
 * behind the glass is a photo, a video or a camera, seen sharp through clear glass, softened through the fog and
 * scattered through the ice, which its light shows up.
 */

/** The model's constants, in its own units (Kobayashi 1993, with the anisotropy raised for sharper ferns). */
export const MODEL = {
  /** The grid's spacing and the time step. */
  dx: 0.03, dt: 1e-4,
  /** τ: how slowly the ice answers; ε̄: the interface's width; δ: how strongly it prefers six directions. */
  tau: 2e-4, eps: 0.01, delta: 0.045, sym: 6,
  /** K: the latent heat freezing gives off; α, γ: how the drive to freeze rises with the cold; Tₘ: the melting point. */
  latent: 2.2, alpha: 0.9, gamma: 10, melt: 1,
  /** The noise at the ice's edge that starts its side branches. */
  noise: 0.04,
  /** How quickly the glass draws heat back to its own temperature (per unit of model time). */
  cool: 0,
};

/** Real-time rates, per second. */
const RATE = {
  /** A finger's warmth rises in the glass, and fades after it lets go. */
  warm: 12, fade: 1.4, warmth: 3,
  /** Glass warmer than the melting point melts the ice through, at this rate per degree over it. */
  thaw: 10,
  /** The water from melted ice dries (or freezes into the glass) over a few seconds. */
  dry: 0.22,
  /** The frost film between the ferns: it forms over this many seconds once the glass is dry, and a finger melts it
   *  this fast. */
  film: 14, filmMelt: 16,
};

/** The glass's temperature, °C: the dial's range. */
export const COLD: [number, number] = [-20, -2];

/** The glass's own temperature field (model units) for a glass at `celsius`: at its frame, in its middle, and how
 *  much colder its foot is than its head. The frame is coldest (the frame draws heat out of the glass) and the bottom
 *  colder than the top, so ferns start at the frame and the foot, and the middle stays clearest. */
export function coldField(celsius: number) {
  const k = clamp((-celsius - 2) / 18, 0, 1);
  return { frame: 0.25 - 0.65 * k, middle: 0.5 - 0.6 * k, foot: 0.08 };
}

/** How thick the frost film between the ferns grows on glass at `celsius` (0 none, 1 white). */
export function filmAt(celsius: number) {
  const k = clamp((-celsius - 2) / 18, 0, 1);
  return 0.5 + 0.45 * k;
}

/** ε and dε/dθ for an interface whose normal points along (gx, gy), in a crystal turned by θ₀: ε = ε̄(1 + δ cos 6(θ − θ₀)).
 *  The sixfold terms come from the normal's direction as a complex number raised to the sixth power, with no trig;
 *  the shader does the same. */
export function anisotropy(gx: number, gy: number, theta0: number) {
  const l = Math.hypot(gx, gy);
  if (l < 1e-6) return [MODEL.eps, 0];
  const c = Math.cos(theta0), s = Math.sin(theta0);
  let zr = (gx * c + gy * s) / l, zi = (gy * c - gx * s) / l;
  const r2 = zr * zr - zi * zi, i2 = 2 * zr * zi;
  const r3 = r2 * zr - i2 * zi, i3 = r2 * zi + i2 * zr;
  zr = r3 * r3 - i3 * i3; zi = 2 * r3 * i3;
  return [MODEL.eps * (1 + MODEL.delta * zr), -MODEL.eps * MODEL.sym * MODEL.delta * zi];
}

/** A small, seeded random generator (mulberry32), so the same seed grows the same window. */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Seed = { x: number; y: number; r: number; angle: number; frame: boolean };
export type Scratch = { ax: number; ay: number; bx: number; by: number; angle: number };
/** A frame inside the canvas, in shares of its width and height from its top left: left, top, right, bottom. */
export type Frame = [number, number, number, number];

/** Where the ice starts on a grid of w × h cells (y up): along the frame (densest at the foot) and a scratch in the
 *  glass, each crystal turned its own way. At most 60 seeds. With a `frame` inside the canvas, the ice starts on its
 *  edges instead, scattered (an even row of ferns round a picture reads as a garland), and there is no scratch. */
export function seeds(w: number, h: number, seed: number, frame?: Frame): { seeds: Seed[]; scratch: Scratch | null } {
  const rnd = random(seed), list: Seed[] = [];
  const angle = () => rnd() * Math.PI / 3;
  if (frame) {
    const x0 = frame[0] * w, x1 = frame[2] * w, y0 = (1 - frame[3]) * h, y1 = (1 - frame[1]) * h;
    const fw = x1 - x0, fh = y1 - y0, s = Math.min(fw, fh);
    const scatter = (n: number, r: number, at: (u: number) => [number, number]) => {
      for (let i = 0; i < n; i++) {
        const u = rnd();
        if (rnd() < 0.18) continue;
        const [x, y] = at(u);
        list.push({ x, y, r: r + rnd() * 2.5, angle: angle(), frame: true });
      }
    };
    scatter(Math.max(3, Math.round(fw / (s * 0.1))), 2.5, u => [x0 + u * fw, y0]);                  // the foot: densest
    scatter(Math.max(2, Math.round(fh / (s * 0.143))), 2.2, u => [x0, y0 + Math.pow(u, 1.6) * fh]);  // the left, most low down
    scatter(Math.max(2, Math.round(fh / (s * 0.125))), 2.2, u => [x1, y0 + Math.pow(u, 1.4) * fh]);  // the right
    scatter(2, 2, u => [x0 + (0.15 + 0.7 * u) * fw, y1]);                                            // the head: hardly any
    return { seeds: list.slice(0, 60), scratch: null };
  }
  const along = (n: number, at: (u: number) => [number, number]) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = at((i + 0.5 + (rnd() - 0.5) * 0.7) / n);
      list.push({ x, y, r: 2.5 + rnd() * 1.5, angle: angle(), frame: true });
    }
  };
  const s = Math.min(w, h);
  along(Math.max(4, Math.round(w / (s * 0.085))), u => [u * w, 1.5]);            // the foot
  along(Math.max(2, Math.round(h / (s * 0.16))), u => [1.5, (0.06 + u * 0.88) * h]);   // the left
  along(Math.max(2, Math.round(h / (s * 0.18))), u => [w - 1.5, (0.1 + u * 0.82) * h]); // the right
  along(Math.max(2, Math.round(w / (s * 0.24))), u => [(0.12 + u * 0.8) * w, h - 1.5]); // the head
  // no specks of dust: alone in open glass a crystal grows as a six-armed star, which reads as a paper snowflake, not
  // frost. Their nine draws are kept, so each window keeps its scratch where it was.
  for (let i = 0; i < 9; i++) rnd();
  // a scratch, high on one side, slanting down towards the middle
  const left = rnd() < 0.5, len = w * (0.16 + rnd() * 0.08), tilt = 0.32 + rnd() * 0.2;
  const ax = w * (left ? 0.16 : 0.84), ay = h * (0.74 + rnd() * 0.08);
  const dir = left ? 1 : -1;
  const scratch: Scratch = { ax, ay, bx: ax + dir * len * Math.cos(tilt), by: ay - len * Math.sin(tilt), angle: tilt };
  // ice starts along the scratch as a row of nuclei, each turned nearly the scratch's way
  const nuclei = Math.min(60 - list.length, Math.max(4, Math.round(len / 9)));
  for (let i = 0; i < nuclei; i++) {
    const u = (i + 0.5 + (rnd() - 0.5) * 0.5) / nuclei;
    list.push({ x: ax + (scratch.bx - ax) * u, y: ay + (scratch.by - ay) * u, r: 1.6 + rnd(), angle: tilt + (rnd() - 0.5) * 0.3, frame: false });
  }
  return { seeds: list.slice(0, 60), scratch };
}

export type Source = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

export type FrostOptions = {
  canvas: HTMLCanvasElement;
  /** The street behind the glass: a photo, a playing video or a canvas. */
  source?: Source;
  /** Draw the source flipped left to right (a front camera). */
  mirror?: boolean;
  /** How the photo is cropped to the window, as CSS's object-position in shares ([0.5, 0.5], the default, keeps its
   *  middle; [0.5, 0.52] a little lower), so it lines up with an <img> under the canvas styled the same way. */
  focus?: [number, number];
  /** The glass's temperature, °C, −20 to −2. Default −9. */
  cold?: number;
  /** Which window: where the ice starts. */
  seed?: number;
  /** About how many cells the ice is simulated on. Default about one to a CSS px: 300,000 to 900,000 (a phone or a
   *  tablet, at most 520,000: about 1.6 to a CSS px on a phone, so its smaller window still holds fine ferns). */
  cells?: number;
  /** No time-lapse at the start: the window opens frosted, and the ice only moves where it is touched. */
  still?: boolean;
  /** A frame inside the canvas for the ice to grow out of, in place of the canvas's own edges: left, top, right and
   *  bottom, in shares of the canvas from its top left. Inside it the glass freezes as a window does; outside it the
   *  ice reaches out from the frame, furthest sideways, hardly up or down, and stops, and the fog stays thin. For a
   *  picture on a page with the canvas laid over it, larger than it (the street is then the page as it stands). */
  frame?: Frame;
  /** Canvas px per CSS px. Default: the device's, at most 2. */
  pixelRatio?: number;
  /** After each frame drawn. */
  onFrame?: (now: number) => void;
  /** The first frame is on the canvas. */
  onReady?: () => void;
  /** The context was lost or a shader didn't link: show a still instead. */
  onFail?: (reason: unknown) => void;
};

export type Frost = ReturnType<typeof createFrost>;

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
`;

const M = MODEL;
const f = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

/** One step of the ice: p, T, W and the water, from the cell and its neighbours (the 13 cells of a radius-2 cross and
 *  its diagonals). Kobayashi's equation for p, with its anisotropic terms written out; heat for T, which freezing
 *  gives off; the finger's warmth W, which spreads, fades and melts the ice through. */
const STEP = HEAD + `
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uA;    // cos θ0, sin θ0 (the crystal's turn), pinned (a seed on the frame), the glass's temperature
uniform ivec2 uN;
uniform uint uStep;
uniform float uStepSec;  // real seconds this step stands for
uniform vec4 uSeg;       // the finger's path over this step, a to b, in cells
uniform float uRad;      // its radius, cells
uniform float uPress;
uniform float uThaw;     // warmth everywhere (thawing the whole window)
const float DX = ${f(M.dx)}, DT = ${f(M.dt)}, TAU = ${f(M.tau)}, EB = ${f(M.eps)}, DELTA = ${f(M.delta)};
const float K = ${f(M.latent)}, ALPHA = ${f(M.alpha)}, GAMMA = ${f(M.gamma)}, TM = ${f(M.melt)}, NOISE = ${f(M.noise)}, COOL = ${f(M.cool)};
const float RISE = ${f(RATE.warm)}, FADE = ${f(RATE.fade)}, WMAX = ${f(RATE.warmth)}, THAW = ${f(RATE.thaw)}, DRY = ${f(RATE.dry)};

vec4 S(ivec2 c) { return texelFetch(uS, clamp(c, ivec2(0), uN - 1), 0); }
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float rand(ivec2 c) { return float(pcg(uint(c.x) + pcg(uint(c.y) + pcg(uStep)))) * (1.0 / 4294967296.0); }
// ε and dε/dθ for an edge whose normal is g, in a crystal turned by r = (cos θ0, sin θ0)
vec2 eps(vec2 g, vec2 r) {
  float l2 = dot(g, g);
  if (l2 < 1e-10) return vec2(EB, 0.0);
  vec2 z = vec2(g.x * r.x + g.y * r.y, g.y * r.x - g.x * r.y) * inversesqrt(l2);
  vec2 z2 = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
  vec2 z3 = vec2(z2.x * z.x - z2.y * z.y, z2.x * z.y + z2.y * z.x);
  vec2 z6 = vec2(z3.x * z3.x - z3.y * z3.y, 2.0 * z3.x * z3.y);
  return vec2(EB * (1.0 + DELTA * z6.x), -EB * 6.0 * DELTA * z6.y);
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = S(c), e = S(c + ivec2(1, 0)), w = S(c - ivec2(1, 0)), n = S(c + ivec2(0, 1)), so = S(c - ivec2(0, 1));
  float ee = S(c + ivec2(2, 0)).x, ww = S(c - ivec2(2, 0)).x, nn = S(c + ivec2(0, 2)).x, ss = S(c - ivec2(0, 2)).x;
  float ne = S(c + ivec2(1, 1)).x, nw = S(c + ivec2(-1, 1)).x, se = S(c + ivec2(1, -1)).x, sw = S(c + ivec2(-1, -1)).x;
  vec4 a = texelFetch(uA, c, 0);
  float h = 0.5 / DX, p = s.x;
  vec2 gC = vec2(e.x - w.x, n.x - so.x) * h, gE = vec2(ee - p, ne - se) * h, gW = vec2(p - ww, nw - sw) * h;
  vec2 gN = vec2(ne - nw, nn - p) * h, gS = vec2(se - sw, p - ss) * h;
  vec2 kC = eps(gC, a.xy), kE = eps(gE, a.xy), kW = eps(gW, a.xy), kN = eps(gN, a.xy), kS = eps(gS, a.xy);
  float t1 = (kN.x * kN.y * gN.x - kS.x * kS.y * gS.x) * h;
  float t2 = -(kE.x * kE.y * gE.y - kW.x * kW.y * gW.y) * h;
  float lap = (e.x + w.x + n.x + so.x - 4.0 * p) / (DX * DX);
  float t3 = kC.x * kC.x * lap + (kE.x * kE.x - kW.x * kW.x) * h * gC.x + (kN.x * kN.x - kS.x * kS.x) * h * gC.y;
  float T = s.y, W = s.z, Te = T + W + uThaw;
  float m = ALPHA / 3.14159265 * atan(GAMMA * (TM - Te));
  float noise = NOISE * p * (1.0 - p) * (rand(c) - 0.5);
  // the ice grows or shrinks at its edge
  float pg = clamp(p + DT / TAU * (t1 + t2 + t3 + p * (1.0 - p) * (p - 0.5 + m) + noise), 0.0, 1.0);
  // glass warmed past the melting point (by a finger, or a thaw: not by the ice's own latent heat) melts it through,
  // not only at its edge
  float warm = W + uThaw;
  float pn = pg * exp(-uStepSec * THAW * min(max(Te - TM, 0.0), warm));
  // a seed on the frame holds, unless warmed: the pane freezes again from there
  pn = max(pn, a.z * step(Te, TM));
  float lapT = (e.y + w.y + n.y + so.y - 4.0 * T) / (DX * DX);
  // freezing gives heat off and melting takes it in (from the finger): a melted spot is left colder, and freezes again
  float Tn = T + DT * lapT + K * (pn - p) + DT * COOL * (a.w - T);
  // the finger's warmth: it spreads a little through the glass and fades once it lets go
  float Wn = (W + 0.2 * (e.z + w.z + n.z + so.z - 4.0 * W)) * exp(-uStepSec * FADE);
  if (uPress > 0.0) {
    vec2 pa = vec2(c) + 0.5 - uSeg.xy, ba = uSeg.zw - uSeg.xy;
    float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float d = length(pa - ba * t) / uRad;
    Wn += (WMAX - Wn) * exp(-2.2 * d * d) * (1.0 - exp(-uStepSec * RISE)) * uPress;
  }
  // the water the melted ice leaves beads and dries
  float water = (s.w + max(p - pn, 0.0) * step(0.05, warm)) * exp(-uStepSec * DRY);
  o = vec4(pn, Tn, Wn, min(water, 2.0));
}`;

/** The window as it starts: the seeds as small crystals (mode 0: p, T, W, water), or each cell's crystal turn, its pin
 *  and the glass's temperature (mode 1). */
const INIT = HEAD + `
uniform vec4 uSeeds[60];   // x, y, radius (cells), turn
uniform float uFrame[60];  // 1 for a seed on the frame
uniform int uCount;
uniform ivec2 uN;
uniform vec3 uCold;        // the glass at its frame, in its middle, how much colder at its foot
uniform vec4 uBox;         // a frame inside the canvas (cells, y up: left, foot, right, head); empty, the canvas's own
uniform int uMode;
uniform sampler2D uPrev;    // the window before: its water stays on the glass
uniform int uKeep;
void main() {
  vec2 q = gl_FragCoord.xy;
  float best = 1e9, ice = 0.0, turn = 0.0, pin = 0.0;
  for (int i = 0; i < 60; i++) {
    if (i >= uCount) break;
    float d = distance(q, uSeeds[i].xy) - uSeeds[i].z;
    float v = smoothstep(1.0, -1.0, d);
    ice = max(ice, v);
    if (uFrame[i] > 0.5) pin = max(pin, smoothstep(0.0, -1.5, d));
    if (d < best) { best = d; turn = uSeeds[i].w; }
  }

  vec2 u = q / vec2(uN);
  float aspect = float(uN.x) / float(uN.y);
  float edge = min(min(u.x, 1.0 - u.x) * aspect, min(u.y, 1.0 - u.y)) / (0.5 * min(aspect, 1.0));
  float glass = mix(uCold.x, uCold.y, pow(clamp(edge, 0.0, 1.0), 0.75)) - uCold.z * (1.0 - u.y);
  if (uBox.z > uBox.x) {
    // a frame inside the canvas: inside it, a window's glass; outside, glass that warms away from the frame, soonest
    // up and down, so the ferns reach out sideways and stop. A little colder towards its lower left corner, so the
    // frost there runs on further and the four sides differ.
    vec2 lo = uBox.xy, hi = uBox.zw;
    float s = min(hi.x - lo.x, hi.y - lo.y);
    float side = max(lo.x - q.x, q.x - hi.x), below = max(lo.y - q.y, 0.0), above = max(q.y - hi.y, 0.0);
    float chill = 0.14 * exp(-distance(q, lo) / (0.47 * s));
    if (side > 0.0 || below > 0.0 || above > 0.0) {
      float far = length(vec2(max(side, 0.0), below * 3.2 + above * 1.7));
      glass = mix(uCold.x, 1.05, smoothstep(0.0, 0.27 * s, far)) - chill;
    } else {
      float inside = min(min(q.x - lo.x, hi.x - q.x), min(q.y - lo.y, hi.y - q.y));
      glass = mix(uCold.x, uCold.y, pow(clamp(inside / (0.5 * s), 0.0, 1.0), 0.75)) - uCold.z * (1.0 - (q.y - lo.y) / (hi.y - lo.y)) - chill;
    }
  }
  float water = uKeep == 1 ? texelFetch(uPrev, ivec2(q), 0).w : 0.0;
  o = uMode == 0 ? vec4(ice, glass, 0.0, water) : vec4(cos(turn), sin(turn), pin, glass);
}`;

/** The frost film between the ferns (hoar, as breath leaves on cold glass): it forms where the glass is dry and cold,
 *  thinner in the warmer middle, and a finger melts it, leaving it wet for a few seconds before it frosts over again.
 *  Once a frame, from the state: the film's thickness and the wet it left. */
const FILM = HEAD + `
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uF;    // the film before: thickness, wet
uniform sampler2D uA;    // the glass's temperature in .w
uniform float uDt;       // seconds of the ice's time since the last
uniform float uThaw;
uniform float uMax;      // how thick it grows at this cold
uniform vec4 uBox;       // a frame inside the canvas (cells, y up), as INIT's
const float GROW = ${f(RATE.film)}, MELT = ${f(RATE.filmMelt)}, DRY = ${f(RATE.dry)};
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), u = fract(p); u = u * u * (3.0 - 2.0 * u);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uS, c, 0);
  vec2 h = texelFetch(uF, c, 0).rg;
  float glass = texelFetch(uA, c, 0).w;
  float warm = s.z + uThaw;
  vec2 q = vec2(c);
  // uneven, as frost is: in drifts some twenty cells across, with a finer grain
  float grain = 0.5 + 0.5 * vnoise(q / 26.0) * (0.75 + 0.25 * vnoise(q / 6.0));
  // (round a frame inside the canvas, warm glass takes none, and the glass outside the frame only a thin film)
  float framed = uBox.z > uBox.x ? 1.0 : 0.0;
  float target = uMax * grain * clamp(1.0 - glass * 1.4, 0.35 * (1.0 - framed), 1.0);
  if (framed > 0.5) { vec2 inF = step(uBox.xy, q) * step(q, uBox.zw); target *= mix(0.12, 1.0, inF.x * inF.y); }
  float wet = max(h.g, s.w);
  float grow = (1.0 - exp(-uDt / GROW)) * (1.0 - smoothstep(0.02, 0.2, wet)) * (1.0 - smoothstep(0.05, 0.3, warm));
  float film = h.r + max(target - h.r, 0.0) * grow;
  float gone = film * (1.0 - exp(-uDt * MELT * smoothstep(0.15, 0.8, warm)));
  film -= gone;
  o = vec4(film, min(h.g + gone * 1.6, 1.5) * exp(-uDt * DRY), 0.0, 1.0);
}`;

/** The look of the ice for this frame, at the grid's size: p, its thickness (p blurred: thickest down a fern's
 *  middle), the water, the warmth. In two passes, across then up. */
const BLUR = HEAD + `
uniform sampler2D uS;
uniform ivec2 uN;
uniform ivec2 uDir;
uniform int uPass;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uS, c, 0);
  // the first pass reads the state (p, T, W, water) and blurs p and the water; the second blurs those blurs
  int ia = uPass == 0 ? 0 : 1, ib = uPass == 0 ? 3 : 2;
  float th = s[ia], wa = s[ib], sum = 1.0;
  for (int i = 1; i <= 7; i++) {
    float k = exp(-float(i * i) / 18.0);
    vec4 x = texelFetch(uS, clamp(c + uDir * i, ivec2(0), uN - 1), 0), y = texelFetch(uS, clamp(c - uDir * i, ivec2(0), uN - 1), 0);
    th += (x[ia] + y[ia]) * k; wa += (x[ib] + y[ib]) * k; sum += 2.0 * k;
  }
  th /= sum; wa /= sum;
  o = uPass == 0 ? vec4(s.x, th, wa, s.z) : vec4(s.x, th, wa, s.w);
}`;

/** When each cell froze, on the ice's clock (its steps): the moment p crossed a half, found between this frame's state
 *  and the last one's, so it is smooth from cell to cell; −1 while the cell is water or glass. A cell melted and
 *  frozen again takes its new time. Once a frame. */
const AGE = HEAD + `
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uG;    // before: when it froze, p
uniform vec2 uClock;     // the ice's clock at the last frame and now
uniform int uInit;       // a new window: what is ice now froze at 0
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float p = texelFetch(uS, c, 0).x;
  if (uInit == 1) { o = vec4(p >= 0.5 ? 0.0 : -1.0, p, 0.0, 1.0); return; }
  vec2 g = texelFetch(uG, c, 0).xy;
  float t = g.x;
  if (p < 0.5) t = -1.0;
  else if (t < 0.0) t = mix(uClock.x, uClock.y, clamp((0.5 - g.y) / max(p - g.y, 1e-6), 0.0, 1.0));
  o = vec4(t, p, 0.0, 1.0);
}`;

/** The way the ice grew at each cell, up its age (from where it froze first toward where it froze last: along a fern's
 *  stem, and out across its sides), as a doubled angle, since a needle has no head or tail; and how near the ice is.
 *  Pass 0 finds it, passes 1 and 2 blur it across and up, which smooths it and carries it a few cells past the ice's
 *  edge, for the needles that run on past it. */
const DIR = HEAD + `
uniform sampler2D uG;    // when it froze (pass 0), the pass before (1, 2)
uniform ivec2 uN;
uniform ivec2 uDir;
uniform int uPass;
uniform float uAhead;    // steps: how much later the glass next to the ice will freeze than the ice beside it
float tf(ivec2 c) { return texelFetch(uG, clamp(c, ivec2(0), uN - 1), 0).x; }
float across(float a, float b, float t) {
  // the cells either side; one that isn't ice yet freezes after this one
  return 0.5 * ((a < 0.0 ? t + uAhead : a) - (b < 0.0 ? t + uAhead : b));
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  if (uPass == 0) {
    float t = tf(c);
    if (t < 0.0) { o = vec4(0.0); return; }
    vec2 g = vec2(across(tf(c + ivec2(1, 0)), tf(c - ivec2(1, 0)), t), across(tf(c + ivec2(0, 1)), tf(c - ivec2(0, 1)), t));
    float l = length(g);
    vec2 u = l > 1e-6 ? g / l : vec2(0.0);
    // a seed froze all at once: no way there
    o = vec4(vec2(u.x * u.x - u.y * u.y, 2.0 * u.x * u.y) * smoothstep(0.0, 0.5, l), 1.0, 0.0);
    return;
  }
  vec4 sum = texelFetch(uG, c, 0);
  float k0 = 1.0;
  for (int i = 1; i <= 5; i++) {
    float k = exp(-float(i * i) / 8.0);
    sum += (texelFetch(uG, clamp(c + uDir * i, ivec2(0), uN - 1), 0) + texelFetch(uG, clamp(c - uDir * i, ivec2(0), uN - 1), 0)) * k;
    k0 += 2.0 * k;
  }
  o = sum / k0;
}`;

/** The street, made soft (as the eye sees it past frost it is focused on) and softer still (as ice scatters it): a
 *  separable Gaussian, at a quarter and then a sixteenth of the picture's size. The first pass reads the picture's own
 *  quarter-size mip (a video frame comes as sRGB bytes and is decoded here); the rest read linear light. */
const SOFT = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uOut;        // this pass's size, px
uniform vec2 uDir;        // one step, in this pass's px
uniform float uLod;
uniform int uDecode;
uniform float uSigma;     // in steps
vec3 dec(vec3 c) { return uDecode == 1 ? mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)) : c; }
vec3 at(vec2 uv) { return dec(textureLod(uSrc, uv, uLod).rgb); }
void main() {
  vec2 uv = gl_FragCoord.xy / uOut, d = uDir / uOut;
  vec3 c = at(uv);
  float sum = 1.0;
  for (int i = 1; i <= 8; i++) {
    float w = exp(-float(i * i) / (2.0 * uSigma * uSigma));
    c += (at(uv + d * float(i)) + at(uv - d * float(i))) * w;
    sum += 2.0 * w;
  }
  o = vec4(c / sum, 1.0);
}`;

/** The window: the street through clear glass, through the frost film and through the ferns, which the street's own
 *  light shows up; the water on the glass where it melted. */
const LOOK = HEAD + `
uniform sampler2D uLook;   // p, thickness, water, warmth (grid)
uniform sampler2D uFilm;   // the frost film, the wet it left (grid)
uniform sampler2D uSharp;  // the photo (sRGB, mipmapped) or a video frame
uniform sampler2D uSoft;   // the photo out of focus
uniform sampler2D uGlow;   // the photo scattered
uniform sampler2D uWay;    // the way the ice grew (a doubled angle), how near it is (grid)
uniform vec2 uRes;         // canvas px
uniform float uScale;      // canvas px per CSS px
uniform vec4 uFit;         // the photo's rectangle on the canvas (px, from the top left)
uniform vec2 uGrid;        // cells
uniform vec2 uLight;       // the pointer (canvas px, from the top left): a lamp in the room, for the glints
uniform float uLit;        // how much that lamp is on (a mouse over the glass)
uniform float uTime;
uniform int uDecode;
uniform int uMirror;
vec3 dec(vec3 c) { return uDecode == 1 ? mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)) : c; }
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }
float vnoise(vec2 p) {
  vec2 i = floor(p), u = fract(p); u = u * u * (3.0 - 2.0 * u);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// the grain the needles are drawn from: smooth noise in cells of 0.7 CSS px
float fibre(vec2 q, float css) { return vnoise(q * css * 1.4); }
vec2 wayOf(vec4 d) { float a = 0.5 * atan(d.y, d.x); return vec2(cos(a), sin(a)); }
vec2 fit(vec2 q) { vec2 uv = (q - uFit.xy) / uFit.zw; if (uMirror == 1) uv.x = 1.0 - uv.x; return uv; }
void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);          // canvas px from the top left
  vec2 g = gl_FragCoord.xy / uRes;                                    // grid uv (y up)
  vec2 cell = 1.0 / uGrid;
  vec4 L = texture(uLook, g);
  vec2 F = texture(uFilm, g).rg;
  float thE = texture(uLook, g + vec2(cell.x, 0.0)).y, thW = texture(uLook, g - vec2(cell.x, 0.0)).y;
  float thN = texture(uLook, g + vec2(0.0, cell.y)).y, thS = texture(uLook, g - vec2(0.0, cell.y)).y;
  // the ice's edge, sharp at any size; how far in from it (thickest down a fern's stem)
  float aa = clamp(fwidth(L.x) * 0.9, 0.01, 0.5);
  float ice = smoothstep(0.5 - aa, 0.5 + aa, L.x);
  float th = clamp(L.y * 1.4 - 0.2, 0.0, 1.0);
  vec2 slope = vec2(thE - thW, thS - thN);                            // canvas axes (y down)
  // a crystal's side catches the light: a fine line along its edge
  float side = exp(-pow((L.x - 0.5) / (aa * 1.6 + 0.04), 2.0));
  // the ferns draw the vapour round them, so the film stops short of them
  float film = F.x * (1.0 - 0.55 * smoothstep(0.1, 0.4, L.y)) * (1.0 - ice);
  // the water: beads on the glass where it melted, each a small lens
  float css = 1.0 / uScale;
  vec2 bq = q * css / 8.0;                                            // a bead every 8 CSS px or so
  vec2 bi = floor(bq), bn = vec2(0.0);
  float bead = 0.0, wet = smoothstep(0.03, 0.5, max(L.z, F.y));
  if (wet > 0.0) {
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 id = bi + vec2(i, j), h = hash2(id);
      float r = mix(0.14, 0.5, h.x * h.x) * smoothstep(h.y * 0.85, h.y * 0.85 + 0.2, wet);
      vec2 d = bq - (id + 0.2 + 0.6 * hash2(id + 3.7));
      float k = 1.0 - dot(d, d) / max(r * r, 1e-4);
      if (k > bead) { bead = k; bn = d / max(r, 1e-3); }
    }
  }
  float drop = smoothstep(0.0, 0.25, bead);
  // where the street's light comes from: bent by the ice's slope, and by a bead (which turns it over)
  vec2 bend = (slope * 14.0 * ice - bn * 7.0 * drop) * uScale;
  vec2 uv = fit(q + bend);
  vec3 sharp = dec(texture(uSharp, uv).rgb);
  vec3 soft = texture(uSoft, uv).rgb, haze = texture(uGlow, uv).rgb, glow = texture(uGlow, fit(q)).rgb;
  // what comes straight through: sharp through clear glass, softened through the film, little through the ice
  float fo = clamp(film * 2.4, 0.0, 1.0);
  vec3 behind = mix(sharp, mix(soft, haze, smoothstep(0.35, 0.9, fo)), smoothstep(0.0, 0.6, fo));
  float iceOp = ice * (0.38 + 0.55 * th);
  float filmOp = clamp(film * 1.3, 0.0, 0.9);
  vec3 direct = behind * (1.0 - filmOp) * (1.0 - iceOp) + mix(soft, haze, th) * iceOp * 0.22;
  // what the frost scatters toward us: the street's lights behind it, and a little of the room's light in front
  vec3 room = vec3(0.018, 0.0225, 0.030);
  vec3 back = 1.25 * glow + 0.35 * soft + room;
  // ice is grainy: hoar crystals a CSS px or two across, each its own brightness
  vec2 hp = q * css;
  float sugar = 0.78 + 0.3 * hash(floor(hp * 0.8)) + 0.12 * hash(floor(hp * 0.31));
  vec3 tint = vec3(0.86, 0.93, 1.0);
  // the ice's needles: that grain drawn out along the way the ice grew (a line integral convolution: averaged along
  // the path up the growth from here, both ways), so a fern reads as the feathers of needles it is made of, finer than
  // the grid it grew on
  vec4 D = texture(uWay, g);
  float needles = 0.5, sheen = 0.0;
  if (D.z > 0.3) {
    vec2 way = wayOf(D);
    float step1 = 0.8 / ((uRes.x / uScale) / uGrid.x);                 // 0.8 CSS px, in cells
    float acc = fibre(q, css), sum = 1.0;
    for (int dir = 0; dir < 2; dir++) {
      vec2 at = g, last = dir == 0 ? way : -way;
      for (int i = 1; i <= 14; i++) {
        vec4 d = texture(uWay, at);
        if (d.z < 0.45) break;                                         // a needle ends at the ice's edge
        vec2 w = wayOf(d);
        last = dot(w, last) < 0.0 ? -w : w;
        at += last * step1 / uGrid;
        float k = exp(-float(i * i) / 70.0);
        acc += fibre(vec2(at.x * uRes.x, (1.0 - at.y) * uRes.y), css) * k;
        sum += k;
      }
    }
    needles = clamp((acc / sum - 0.5) * 10.0 + 0.5, 0.0, 1.0);
    // the needles catch the room's lamp across their length, as brushed metal does (Kajiya and Kay's highlight)
    vec3 t = vec3(way.x, -way.y, 0.0);
    vec3 h = normalize(normalize(vec3((uLight - q) * css / 420.0, 1.0)) + vec3(0.0, 0.0, 1.0));
    float th2 = dot(t, h);
    sheen = pow(max(1.0 - th2 * th2, 0.0), 30.0) * uLit;
  }
  vec3 col = direct;
  col += back * tint * (filmOp * 0.55 * (0.85 + 0.3 * hash(floor(hp * 0.5))) + iceOp * (0.6 + 0.9 * th) * sugar * mix(0.35, 1.5, needles));
  col += back * tint * side * 0.5;
  col += (back * 0.6 + vec3(0.05)) * tint * ice * sheen * 0.8 * (0.3 + needles);
  // the ice's edge is ragged with them: the bright ones run on a little past it
  float fringe = smoothstep(0.6, 0.85, needles) * smoothstep(0.3, 0.5, D.z) * (1.0 - ice);
  col = col * (1.0 - 0.35 * fringe) + back * tint * fringe * 0.9 * sugar;
  // glints: a facet catches the lamp in the room as the pointer moves
  vec2 gid = floor(hp / 3.0), gh = hash2(gid);
  if (gh.x > 0.97 && ice > 0.5) {
    vec2 toL = (uLight - q) * css / 500.0;
    vec2 n2 = (hash2(gid + 9.1) - 0.5) * 2.2;
    float flash = pow(max(0.0, 1.0 - length(n2 - toL)), 30.0) * uLit;
    vec2 inCell = fract(hp / 3.0) - 0.5;
    col += flash * smoothstep(0.32, 0.0, length(inCell)) * (0.6 + 4.0 * glow) * ice;
  }
  // a bead: dark at its rim, a bright point where a light catches it
  if (drop > 0.0) {
    float rimB = smoothstep(0.3, 0.0, bead);
    col *= 1.0 - 0.3 * rimB * drop;
    vec2 hl = bn - vec2(-0.32, -0.38);
    col += exp(-dot(hl, hl) * 22.0) * drop * (0.04 + glow * 2.5);
  }
  // the frost darkens toward the frame's corners, out of the street's light; clear glass shows the photo as it is (the
  // page shows the photo itself while the window loads and fades the window in over it, so the two must match)
  vec2 v = q / uRes - 0.5;
  col *= 1.0 - 0.6 * dot(v, v) * smoothstep(0.0, 0.5, max(iceOp, filmOp));
  // a shoulder only above where the photo itself mostly reaches: what the frost scatters rolls off instead of clipping
  vec3 over = max(col - 0.8, 0.0);
  col = min(col, 0.8) + 0.2 * (1.0 - exp(-over / 0.2));
  // out in sRGB exactly, as the photo came in (a plain 2.2 power lifts the blacks: 4 of 255 came out 13)
  col = max(col, 0.0);
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  col += (hash(q + fract(uTime) * 91.0) - 0.5) / 255.0;
  o = vec4(col, 1.0);
}`;

/**
 * The window. Throws without WebGL 2 or float render targets, before anything is drawn; later failures (a lost
 * context, a shader that won't link) go to onFail.
 */
export function createFrost(o: FrostOptions) {
  const canvas = o.canvas;
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
  if (!gl) throw new Error("no WebGL 2");
  // the ice is stepped in 32-bit floats (a step moves p by less than half precision can hold), so it needs float targets
  if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("no float render targets");

  // the programs, compiling while the rest is set up (in the background where the browser can; the extension is asked
  // for before the link, as Safari builds a program linked before then at once, holding the page)
  const parallel = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
  const shaders: WebGLShader[] = [];
  const shader = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); shaders.push(s); return s; };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  type Prog = { prog: WebGLProgram; fs: WebGLShader; u: Map<string, WebGLUniformLocation | null> };
  const make = (src: string): Prog => {
    const prog = gl.createProgram()!, fs = shader(gl.FRAGMENT_SHADER, src);
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.bindAttribLocation(prog, 0, "p"); gl.linkProgram(prog);
    return { prog, fs, u: new Map() };
  };
  const P = { init: make(INIT), step: make(STEP), film: make(FILM), blur: make(BLUR), age: make(AGE), way: make(DIR), soft: make(SOFT), look: make(LOOK) };
  const progs = Object.values(P);
  let linked = false;

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

  type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
  const targets = new Set<Target>();
  const target = (w: number, h: number, internal: number, linear: boolean): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internal, w, h);
    const filter = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const t = { tex, fbo, w, h };
    targets.add(t);
    return t;
  };
  const drop = (t: Target | null) => { if (!t) return; gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); targets.delete(t); };

  // the size of the window (CSS px) and the canvas
  let W = 1, H = 1, dpr = o.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2);
  const small = () => Math.min(W, H) < 560 || matchMedia("(pointer: coarse)").matches;

  // the grid: its size, its state (two, stepped from one into the other), each cell's crystal and glass, the look
  let gw = 0, gh = 0, cur = 0, steps = 0, fc = 0;
  let state: [Target, Target] | null = null, aux: Target | null = null, lookA: Target | null = null, look: Target | null = null;
  // the frost film between the ferns (two, stepped from one into the other)
  let film: [Target, Target] | null = null;
  // when each cell froze (two, stepped from one into the other), and the way the ice grew (found, across, up)
  let age: [Target, Target] | null = null, ac = 0, wayA: Target | null = null, wayB: Target | null = null, way: Target | null = null;
  let seedNo = o.seed ?? 7, cold = clamp(o.cold ?? -9, ...COLD), layout = seeds(1, 1, seedNo);

  // the street: the picture, out of focus and scattered
  let src: Source | null = null, tex: WebGLTexture | null = null, sw = 0, sh = 0, srgb = true, mirror = !!o.mirror, fresh = false;
  let focus: [number, number] = o.focus ?? [0.5, 0.5];
  let softA: Target | null = null, softB: Target | null = null, glowA: Target | null = null, glowB: Target | null = null;
  let videoCb = 0;
  const video = () => (src instanceof HTMLVideoElement ? src : null);
  const frames = (v: HTMLVideoElement) => typeof (v as { requestVideoFrameCallback?: unknown }).requestVideoFrameCallback === "function";

  // time: how many steps a second the ice takes (a time-lapse at the start, then slower), and when it settles
  let still = !!o.still, alive = true, active = true, raf = 0, last = -1, ready = false, owed = 0, cap = 18, born = -1, woke = -1;
  const gaps: number[] = [];
  // a finger (or the mouse button) on the glass: where it is, where it was at the last step, in CSS px
  let press: { id: number; x: number; y: number; px: number; py: number } | null = null;
  let light: [number, number] = [0, 0], lightSet = false, hover = false;
  // thawing the whole window: 0 → 1 → a new window
  let thawT0 = -1, thaw = 0;
  // reduced motion: steps still owed before the window shows (it opens frosted)
  let preroll = 0, pace = 1;
  let dirty = true;

  /** Steps a second: a time-lapse while the window first freezes, then the ice creeps on, and settles after a minute
   *  untouched. Warmth on the glass, or the cold just changed, wakes it. */
  function rate(now: number) {
    if (thawT0 >= 0) return 260 * pace;
    if (born < 0) return 0;
    const t = (now - born) / 1000, since = (now - woke) / 1000;
    const warm = press || since < 6;
    if (still) return warm ? 260 : 0;
    const burst = 900 * Math.exp(-t / 2.4);
    const settle = t < 45 ? 1 : Math.max(0, 1 - (t - 45) / 20);
    return pace * Math.max(burst + 230 * settle, warm ? 260 : 0, since < 40 ? 230 : 0);
  }

  function size() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    // a new grid when there is none, or when the window's shape has changed a lot (a phone turned round); otherwise
    // the grid stretches a little with the window
    const want = W / H, have = gw / Math.max(1, gh);
    if (!state || Math.abs(Math.log(want / have)) > 0.18) grid();
    dirty = true;
  }

  function grid() {
    // about a cell to a CSS px, so a fern's needles are a px or two across
    const cells = o.cells ?? Math.round(small() ? Math.min(520000, W * H * 1.6) : clamp(W * H * 0.72, 300000, 900000));
    gw = Math.max(32, Math.min(maxSize, Math.round(Math.sqrt(cells * W / H))));
    gh = Math.max(32, Math.min(maxSize, Math.round(cells / gw)));
    if (state) { drop(state[0]); drop(state[1]); }
    if (film) { drop(film[0]); drop(film[1]); }
    if (age) { drop(age[0]); drop(age[1]); }
    drop(aux); drop(lookA); drop(look); drop(wayA); drop(wayB); drop(way);
    state = [target(gw, gh, gl!.RGBA32F, false), target(gw, gh, gl!.RGBA32F, false)];
    film = [target(gw, gh, gl!.RG16F, true), target(gw, gh, gl!.RG16F, true)];
    aux = target(gw, gh, gl!.RGBA16F, false);
    lookA = target(gw, gh, gl!.RGBA16F, false);
    look = target(gw, gh, gl!.RGBA16F, true);
    age = [target(gw, gh, gl!.RG32F, false), target(gw, gh, gl!.RG32F, false)]; ac = 0;
    wayA = target(gw, gh, gl!.RGBA16F, false); wayB = target(gw, gh, gl!.RGBA16F, false); way = target(gw, gh, gl!.RGBA16F, true);
    steps = 0; cur = 0; fc = 0;
    // a finer grid takes more steps to cover the same share of the window
    pace = Math.sqrt(gw * gh / 520000);
    if (linked) start();
  }

  /** The window as it starts: the seeds, each cell's crystal and the glass's temperature. */
  function start() {
    if (!state || !aux) return;
    layout = seeds(gw, gh, seedNo, o.frame);
    writeAux(true);
    born = -1; steps = 0; owed = 0;
    if (still) preroll = Math.round(5200 * pace);
  }
  /** Each cell's crystal, pin and glass (the glass changes with the cold), and the state too when it starts over. */
  function writeAux(fresh: boolean) {
    const u = use(P.init);
    const sd = new Float32Array(240), fr = new Float32Array(60);
    layout.seeds.forEach((s, i) => { sd.set([s.x, s.y, s.r, s.angle], i * 4); fr[i] = s.frame ? 1 : 0; });
    gl!.uniform4fv(u("uSeeds"), sd); gl!.uniform1fv(u("uFrame"), fr); gl!.uniform1i(u("uCount"), layout.seeds.length);
    gl!.uniform2i(u("uN"), gw, gh);
    const c = coldField(cold);
    gl!.uniform3f(u("uCold"), c.frame, c.middle, c.foot);
    box(u);
    gl!.viewport(0, 0, gw, gh);
    gl!.uniform1i(u("uKeep"), 0); gl!.uniform1i(u("uPrev"), 0);
    bind(0, state![cur].tex);
    gl!.uniform1i(u("uMode"), 1); into(aux!);
    if (fresh) {
      // into the other state, reading this one's water (a new window after a thaw keeps the melt on the glass)
      gl!.uniform1i(u("uMode"), 0); gl!.uniform1i(u("uKeep"), steps > 0 ? 1 : 0);
      bind(0, state![cur].tex); into(state![1 - cur]); cur = 1 - cur;
      ageIce(0, 0, true);
    }
  }

  /** Binds a program and gives its uniforms by name. */
  function use(p: Prog) {
    gl!.useProgram(p.prog);
    return (n: string) => { let l = p.u.get(n); if (l === undefined) { l = gl!.getUniformLocation(p.prog, n); p.u.set(n, l); } return l; };
  }
  function into(t: Target | null) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, t ? t.fbo : null);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }
  function bind(unit: number, t: WebGLTexture | null) { gl!.activeTexture(gl!.TEXTURE0 + unit); gl!.bindTexture(gl!.TEXTURE_2D, t); }

  /** n steps of the ice, standing for `secs` of real time between them; the finger's path is spread over them. */
  function stepIce(n: number, secs: number) {
    if (!state || !aux || n <= 0) return;
    const u = use(P.step);
    gl!.viewport(0, 0, gw, gh);
    gl!.uniform1i(u("uS"), 0); gl!.uniform1i(u("uA"), 1); gl!.uniform2i(u("uN"), gw, gh);
    gl!.uniform1f(u("uStepSec"), secs / n);
    gl!.uniform1f(u("uThaw"), thaw);
    // a finger is about 16 mm across: some 60 CSS px, at least 5 % of the window's short side
    const kx = gw / W, ky = gh / H;
    gl!.uniform1f(u("uRad"), Math.max(26, Math.min(W, H) * 0.05) * kx);
    bind(1, aux.tex);
    for (let i = 0; i < n; i++) {
      if (press) {
        const a = i / n, b = (i + 1) / n;
        const ax = press.px + (press.x - press.px) * a, ay = press.py + (press.y - press.py) * a;
        const bx = press.px + (press.x - press.px) * b, by = press.py + (press.y - press.py) * b;
        gl!.uniform4f(u("uSeg"), ax * kx, (H - ay) * ky, bx * kx, (H - by) * ky);
        gl!.uniform1f(u("uPress"), 1);
      } else gl!.uniform1f(u("uPress"), 0);
      gl!.uniform1ui(u("uStep"), steps++);
      bind(0, state[cur].tex);
      into(state[1 - cur]);
      cur = 1 - cur;
    }
    if (press) { press.px = press.x; press.py = press.y; }
  }

  /** The frost film, `secs` of the ice's time on. */
  /** The frame inside the canvas, in cells (y up), for the programs that shape the glass round it; none, empty. */
  function box(u: (name: string) => WebGLUniformLocation | null) {
    const f = o.frame;
    if (f) gl!.uniform4f(u("uBox"), f[0] * gw, (1 - f[3]) * gh, f[2] * gw, (1 - f[1]) * gh);
    else gl!.uniform4f(u("uBox"), 0, 0, -1, -1);
  }
  function stepFilm(secs: number) {
    if (!state || !aux || !film || secs <= 0) return;
    const u = use(P.film);
    gl!.viewport(0, 0, gw, gh);
    gl!.uniform1i(u("uS"), 0); gl!.uniform1i(u("uF"), 1); gl!.uniform1i(u("uA"), 2);
    gl!.uniform1f(u("uDt"), secs); gl!.uniform1f(u("uThaw"), thaw); gl!.uniform1f(u("uMax"), filmAt(cold));
    box(u);
    bind(0, state[cur].tex); bind(1, film[fc].tex); bind(2, aux.tex);
    into(film[1 - fc]);
    fc = 1 - fc;
  }

  /** When the cells that froze since the last frame froze, between the clock's two readings (or, for a new window,
   *  what is ice froze at 0). */
  function ageIce(t0: number, t1: number, init = false) {
    if (!state || !age) return;
    const u = use(P.age);
    gl!.viewport(0, 0, gw, gh);
    gl!.uniform1i(u("uS"), 0); gl!.uniform1i(u("uG"), 1); gl!.uniform2f(u("uClock"), t0, t1); gl!.uniform1i(u("uInit"), init ? 1 : 0);
    bind(0, state[cur].tex); bind(1, age[ac].tex);
    into(age[1 - ac]); ac = 1 - ac;
  }

  /** The way the ice grew: found, then blurred across and up. */
  function wayIce() {
    if (!age || !wayA || !wayB || !way) return;
    const u = use(P.way);
    gl!.viewport(0, 0, gw, gh);
    gl!.uniform1i(u("uG"), 0); gl!.uniform2i(u("uN"), gw, gh); gl!.uniform1f(u("uAhead"), 40 * pace);
    gl!.uniform1i(u("uPass"), 0); bind(0, age[ac].tex); into(wayA);
    gl!.uniform1i(u("uPass"), 1); gl!.uniform2i(u("uDir"), 1, 0); bind(0, wayA.tex); into(wayB);
    gl!.uniform1i(u("uPass"), 2); gl!.uniform2i(u("uDir"), 0, 1); bind(0, wayB.tex); into(way);
  }

  /** The ice's look for this frame: across, then up. */
  function blurIce() {
    if (!state || !lookA || !look) return;
    const u = use(P.blur);
    gl!.viewport(0, 0, gw, gh);
    gl!.uniform1i(u("uS"), 0); gl!.uniform2i(u("uN"), gw, gh);
    gl!.uniform2i(u("uDir"), 1, 0); gl!.uniform1i(u("uPass"), 0);
    bind(0, state[cur].tex); into(lookA);
    gl!.uniform2i(u("uDir"), 0, 1); gl!.uniform1i(u("uPass"), 1);
    bind(0, lookA.tex); into(look);
  }

  function upload() {
    if (!src) return;
    const v = video();
    const w = v ? v.videoWidth : (src as HTMLImageElement).naturalWidth || src.width, h = v ? v.videoHeight : (src as HTMLImageElement).naturalHeight || src.height;
    if (!w || !h) return;
    let from: TexImageSource = src;
    if (!v && Math.max(w, h) > maxSize) {
      const s = maxSize / Math.max(w, h), c = document.createElement("canvas");
      c.width = Math.round(w * s); c.height = Math.round(h * s);
      c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
      from = c;
    }
    const tw = from === src ? w : (from as HTMLCanvasElement).width, th = from === src ? h : (from as HTMLCanvasElement).height;
    gl!.activeTexture(gl!.TEXTURE2);
    // a photo is stored as sRGB, so the GPU filters it in linear light; a video frame goes up as it comes and is decoded
    // in the shaders
    if (!tex || tw !== sw || th !== sh || srgb !== !v) {
      if (tex) gl!.deleteTexture(tex);
      tex = gl!.createTexture(); gl!.bindTexture(gl!.TEXTURE_2D, tex);
      sw = tw; sh = th; srgb = !v;
      gl!.texStorage2D(gl!.TEXTURE_2D, Math.floor(Math.log2(Math.max(sw, sh))) + 1, srgb ? gl!.SRGB8_ALPHA8 : gl!.RGBA8, sw, sh);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.MIRRORED_REPEAT); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.MIRRORED_REPEAT);
      drop(softA); drop(softB); drop(glowA); drop(glowB);
      const qw = Math.max(8, Math.round(sw / 4)), qh = Math.max(8, Math.round(sh / 4));
      softA = target(qw, qh, gl!.RGBA16F, true); softB = target(qw, qh, gl!.RGBA16F, true);
      const ew = Math.max(4, Math.round(sw / 16)), eh = Math.max(4, Math.round(sh / 16));
      glowA = target(ew, eh, gl!.RGBA16F, true); glowB = target(ew, eh, gl!.RGBA16F, true);
    }
    gl!.activeTexture(gl!.TEXTURE2); gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false); gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, from);
    gl!.generateMipmap(gl!.TEXTURE_2D);
    fresh = false;
    if (linked) soften();
  }

  /** The street out of focus (a quarter of the picture's size) and scattered (a sixteenth). */
  function soften() {
    if (!tex || !softA || !softB || !glowA || !glowB) return;
    const u = use(P.soft);
    gl!.uniform1i(u("uSrc"), 0);
    const pass = (from: WebGLTexture, to: Target, dx: number, dy: number, lod: number, decode: boolean, sigma: number) => {
      gl!.viewport(0, 0, to.w, to.h);
      gl!.uniform2f(u("uOut"), to.w, to.h); gl!.uniform2f(u("uDir"), dx, dy); gl!.uniform1f(u("uLod"), lod);
      gl!.uniform1i(u("uDecode"), decode ? 1 : 0); gl!.uniform1f(u("uSigma"), sigma);
      bind(0, from); into(to);
    };
    pass(tex, softA, 1, 0, 2, !srgb, 2.6);
    pass(softA.tex, softB, 0, 1, 0, false, 2.6);
    pass(softB.tex, glowA, 1.5, 0, 0, false, 3.2);
    pass(glowA.tex, glowB, 0, 1.5, 0, false, 3.2);
  }

  function draw(now: number) {
    if (!linked || !tex || !look || !film || !softB || !glowB || !way) return false;
    blurIce();
    wayIce();
    const u = use(P.look);
    const cw = canvas.width, ch = canvas.height;
    gl!.viewport(0, 0, cw, ch);
    // the picture covers the window, placed as CSS's object-fit: cover and object-position: focus place it (so a page
    // can show the photo itself under the canvas while the window loads, and the two line up to the pixel)
    const s = Math.max(cw / sw, ch / sh), [fx, fy] = focus;
    const pw = sw * s, ph = sh * s;
    const x0 = (cw - pw) * fx, y0 = (ch - ph) * fy;
    gl!.uniform4f(u("uFit"), x0, y0, pw, ph);
    gl!.uniform2f(u("uRes"), cw, ch); gl!.uniform1f(u("uScale"), cw / W);
    gl!.uniform2f(u("uGrid"), gw, gh);
    if (!lightSet) light = [W * 0.3, H * 0.2];
    gl!.uniform2f(u("uLight"), light[0] * cw / W, light[1] * ch / H);
    gl!.uniform1f(u("uTime"), (now / 1000) % 1000);
    gl!.uniform1i(u("uDecode"), srgb ? 0 : 1); gl!.uniform1i(u("uMirror"), mirror ? 1 : 0);
    gl!.uniform1f(u("uLit"), hover || press ? 1 : 0.35);
    gl!.uniform1i(u("uLook"), 0); gl!.uniform1i(u("uSharp"), 1); gl!.uniform1i(u("uSoft"), 2); gl!.uniform1i(u("uGlow"), 3); gl!.uniform1i(u("uFilm"), 4); gl!.uniform1i(u("uWay"), 5);
    bind(0, look.tex); bind(1, tex); bind(2, softB.tex); bind(3, glowB.tex); bind(4, film[fc].tex); bind(5, way.tex);
    into(null);
    return true;
  }

  function frame(now: number) {
    raf = 0;
    if (!alive || !active) return;
    if (!linked && !link()) { raf = requestAnimationFrame(frame); return; }
    const dt = last < 0 ? 1 / 60 : Math.min(0.1, (now - last) / 1000);
    if (last >= 0) { gaps.push(now - last); if (gaps.length > 40) gaps.shift(); }
    last = now;
    const v = video();
    if (v && (fresh || (!frames(v) && !v.paused))) upload();
    // a long run of slow frames takes fewer steps a frame (the ice grows slower, the page stays smooth)
    if (gaps.length >= 40) {
      const sorted = [...gaps].sort((a, b) => a - b), mid = sorted[20];
      if (mid > 21 && cap > 3) { cap = Math.max(3, Math.floor(cap * 0.75)); gaps.length = 0; }
    }
    let n = 0, secs = dt;
    if (preroll > 0) {
      // reduced motion: the window opens already frosted, stepped there behind the photo a few dozen steps a frame
      n = Math.min(preroll, 80); preroll -= n; secs = n / 260;
    } else if (thawT0 >= 0) {
      const t = (now - thawT0) / 1000;
      thaw = still ? 1 : Math.min(1, t / 0.9) * 0.9;
      if (t > (still ? 0 : 1.8)) { thawT0 = -1; thaw = 0; seedNo++; start(); if (!still) born = now; woke = now; }
      else { owed += rate(now) * dt; n = Math.min(Math.floor(owed), cap); owed -= n; }
    } else {
      owed += rate(now) * dt;
      n = Math.min(Math.floor(owed), cap);
      owed = Math.min(owed - n, cap);
    }
    stepIce(n, secs);
    if (n > 0) ageIce(steps - n, steps);
    // the film forms in the ice's time: with the time-lapse at the start, and faster still behind a still window's photo
    if (n > 0) stepFilm(n / (230 * pace) * (preroll > 0 ? 2.5 : 1));
    const drew = (n > 0 || dirty || !!v) && draw(now);
    if (drew) {
      dirty = false;
      o.onFrame?.(now);
      if (!ready && preroll <= 0) {
        ready = true;
        requestAnimationFrame(() => requestAnimationFrame(t => { if (alive) { if (born < 0 && !still) born = t; o.onReady?.(); kick(); } }));
      }
    }
    const moving = preroll > 0 || thawT0 >= 0 || rate(now) > 0 || (born < 0 && !still && !ready) || (!!v && !v.paused);
    if ((moving && tex) || !linked) raf = requestAnimationFrame(frame);
    else last = -1;
  }
  function kick() { if (alive && active && !raf) raf = requestAnimationFrame(frame); }

  /** Whether every program has linked; on the first success, the window is laid out and the picture softened. */
  function link() {
    if (parallel && progs.some(p => !gl!.getProgramParameter(p.prog, parallel.COMPLETION_STATUS_KHR))) return false;
    for (const p of progs) {
      if (!gl!.getProgramParameter(p.prog, gl!.LINK_STATUS)) {
        const log = gl!.getShaderInfoLog(p.fs) || gl!.getProgramInfoLog(p.prog) || "link failed";
        fail(new Error(`frost: ${log}`));
        return false;
      }
    }
    linked = true;
    start();
    if (tex) soften();
    return true;
  }

  function fail(reason: unknown) {
    if (!alive) return;
    o.onFail?.(reason);
    dispose();
  }
  const lost = (e: Event) => { e.preventDefault(); fail(new Error("frost: WebGL context lost")); };
  canvas.addEventListener("webglcontextlost", lost);

  // hands: a finger, a pen or the mouse button held on the glass warms it; a mouse moved over it is the room's lamp
  const at = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  const onDown = (e: PointerEvent) => {
    if (e.button > 0 || press) return;
    const [x, y] = at(e);
    press = { id: e.pointerId, x, y, px: x, py: y };
    light = [x, y]; lightSet = true;
    canvas.setPointerCapture?.(e.pointerId);
    woke = performance.now();
    e.preventDefault();
    kick();
  };
  const onMove = (e: PointerEvent) => {
    const [x, y] = at(e);
    if (press && press.id === e.pointerId) { press.x = x; press.y = y; }
    if (e.pointerType === "mouse" || press) { light = [x, y]; lightSet = true; hover = e.pointerType === "mouse"; dirty = true; kick(); }
  };
  const onLeave = () => { if (hover) { hover = false; dirty = true; kick(); } };
  const onUp = (e: PointerEvent) => {
    if (!press || press.id !== e.pointerId) return;
    press = null; woke = performance.now();
    kick();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  const onVisible = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; last = -1; } else kick(); };
  document.addEventListener("visibilitychange", onVisible);

  // a new size clears the canvas, so it is drawn again at once, before the browser shows it
  const resize = new ResizeObserver(() => { size(); if (ready) draw(performance.now()); kick(); });
  resize.observe(canvas);
  size();

  function watchVideo(v: HTMLVideoElement) {
    const rv = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (!rv.requestVideoFrameCallback) { v.addEventListener("play", kick); return; }
    const each = () => { if (!alive || src !== v) return; fresh = true; kick(); videoCb = rv.requestVideoFrameCallback!(each); };
    videoCb = rv.requestVideoFrameCallback(each);
  }
  function unwatchVideo() {
    const v = video() as (HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }) | null;
    if (!v) return;
    v.removeEventListener("play", kick);
    if (videoCb) v.cancelVideoFrameCallback?.(videoCb);
    videoCb = 0;
  }

  function setSource(s: Source, opts: { mirror?: boolean; focus?: [number, number] } = {}) {
    unwatchVideo();
    src = s; mirror = !!opts.mirror; fresh = true;
    focus = opts.focus ?? [0.5, 0.5];
    const v = video();
    if (v) watchVideo(v);
    if (!v || v.readyState >= 2) upload();
    else v.addEventListener("loadeddata", () => { if (src === v) { upload(); dirty = true; kick(); } }, { once: true });
    dirty = true;
    kick();
  }

  function dispose() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    unwatchVideo();
    resize.disconnect();
    document.removeEventListener("visibilitychange", onVisible);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp); canvas.removeEventListener("pointerleave", onLeave);
    if (!gl!.isContextLost()) {
      for (const t of [...targets]) drop(t);
      gl!.deleteTexture(tex); gl!.deleteBuffer(buf); gl!.deleteVertexArray(vao);
      for (const p of progs) gl!.deleteProgram(p.prog);
      for (const s of shaders) gl!.deleteShader(s);
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }

  if (o.source) setSource(o.source, { mirror: o.mirror, focus: o.focus });
  kick();

  return {
    /** A photo, a playing video or a camera (with its mirror, and where its middle of interest is): the street behind
     *  the glass. */
    setSource,
    /** The glass's temperature, °C (−20 to −2): colder, the ice grows faster and further in. */
    setCold(c: number) {
      cold = clamp(c, ...COLD);
      if (linked && state) writeAux(false);
      woke = performance.now();
      kick();
    },
    get cold() { return cold; },
    /** Warms the whole window: the ice melts away to water, and a new window freezes over. */
    thaw() { if (thawT0 < 0 && linked) { thawT0 = performance.now(); woke = thawT0; kick(); } },
    /** Holds a finger on the glass at x, y (CSS px of the canvas), or moves it; null lifts it. For keys and tests. */
    touch(x: number | null, y = 0) {
      if (x === null) { if (press?.id === -1) press = null; woke = performance.now(); kick(); return; }
      if (press && press.id === -1) { press.x = x; press.y = y; }
      else if (!press) press = { id: -1, x, y, px: x, py: y };
      light = [x, y]; lightSet = true; woke = performance.now();
      kick();
    },
    /** Motion reduced or paused: no time-lapse; the ice moves only where it is warmed. */
    setStill(s: boolean) {
      if (s === still) return;
      still = s;
      if (s && born >= 0 && performance.now() - born < 8000) preroll = Math.round(4000 * pace);
      dirty = true; kick();
    },
    /** Off screen or not: nothing is stepped or drawn while it isn't. */
    setActive(a: boolean) { active = a; if (!a) { cancelAnimationFrame(raf); raf = 0; last = -1; } else { dirty = true; kick(); } },
    /** Canvas px per CSS px (drawn again at once, so the canvas never shows cleared). */
    setPixelRatio(p: number) { dpr = p; size(); if (ready) draw(performance.now()); kick(); },
    /** The grid's size, cells. */
    get grid() { return [gw, gh] as const; },
    /** Steps taken since the window started freezing. */
    get steps() { return steps; },
    /** Takes n steps at once (for stills and tests), then draws. */
    advance(n: number) {
      if (!linked) return;
      for (let i = 0; i < n; i += 50) { const k = Math.min(50, n - i); stepIce(k, k / 260); ageIce(steps - k, steps); stepFilm(k / (230 * pace)); }
      draw(performance.now());
    },
    /** The grid's state (p, T, W, water for each cell, rows from the foot up), for tests. */
    read() {
      if (!state) return null;
      const out = new Float32Array(gw * gh * 4);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, state[cur].fbo);
      gl!.readPixels(0, 0, gw, gh, gl!.RGBA, gl!.FLOAT, out);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      return out;
    },
    /** The canvas as it stands, as an image file. */
    snapshot(type = "image/png", quality?: number) {
      draw(performance.now());
      return new Promise<Blob | null>(done => canvas.toBlob(done, type, quality));
    },
    dispose,
  };
}

/** A camera as a playing video, for setSource: the front one (mirrored, as a mirror shows you) or the back one. */
export async function openCamera(facing: "user" | "environment" = "user") {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } } });
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.srcObject = stream;
  try { await video.play(); } catch (e) { stream.getTracks().forEach(t => t.stop()); throw e; }
  const said = stream.getVideoTracks()[0]?.getSettings().facingMode;
  return { video, mirror: (said ?? facing) !== "environment", stop() { stream.getTracks().forEach(t => t.stop()); video.srcObject = null; } };
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

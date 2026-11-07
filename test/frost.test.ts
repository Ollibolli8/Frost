// The ice against what is known of it: the sixfold anisotropy against its formula, where the ice starts, the glass's
// temperature and the frost film over the dial's range, and a crystal grown on the CPU by the shader's own scheme
// (Kobayashi 1993, the same constants and the same 13-cell stencil), which must grow six arms along its own axes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COLD, MODEL, anisotropy, coldField, filmAt, random, seeds } from "../src/frost.ts";

test("ε and dε/dθ are ε̄(1 + δ cos 6(θ − θ₀)) and its derivative, with no trig", () => {
  const rnd = random(1);
  for (let i = 0; i < 2000; i++) {
    const th = rnd() * Math.PI * 2, t0 = rnd() * Math.PI / 3, r = 0.01 + rnd() * 10;
    const [e, de] = anisotropy(Math.cos(th) * r, Math.sin(th) * r, t0);
    const want = MODEL.eps * (1 + MODEL.delta * Math.cos(6 * (th - t0)));
    const dwant = -MODEL.eps * 6 * MODEL.delta * Math.sin(6 * (th - t0));
    assert.ok(Math.abs(e - want) < 1e-12 && Math.abs(de - dwant) < 1e-12, `θ = ${th}, θ₀ = ${t0}`);
  }
  assert.deepEqual(anisotropy(0, 0, 0.3), [MODEL.eps, 0]);
});

test("the same seed lays the same window out; the ice starts on the frame, a scratch and a few specks of dust", () => {
  for (const [w, h] of [[1200, 750], [548, 548], [390, 770]]) {
    const a = seeds(w, h, 7), b = seeds(w, h, 7), c = seeds(w, h, 8);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.ok(a.seeds.length <= 60);
    for (const s of a.seeds) {
      assert.ok(s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h, `${s.x}, ${s.y} on ${w} × ${h}`);
      assert.ok(s.angle >= -0.2 && s.angle <= Math.PI / 3 + 0.8);
      if (s.frame) assert.ok(Math.min(s.x, w - s.x, s.y, h - s.y) < 2, "a frame seed sits on the frame");
    }
    const inside = a.seeds.filter(s => !s.frame);
    assert.ok(inside.length >= 7, "dust and the scratch");
    // the scratch's nuclei lie along it
    const { ax, ay, bx, by } = a.scratch, len = Math.hypot(bx - ax, by - ay);
    const along = inside.filter(s => Math.abs((bx - ax) * (ay - s.y) - (ax - s.x) * (by - ay)) / len < 1);
    assert.ok(along.length >= 4, `${along.length} nuclei on the scratch`);
    // most of the frame's seeds are at its foot, where the glass is coldest
    const foot = a.seeds.filter(s => s.frame && s.y < 2).length, head = a.seeds.filter(s => s.frame && s.y > h - 2).length;
    assert.ok(foot > head);
  }
});

test("colder glass is colder everywhere, its frame colder than its middle; the film thickens with the cold", () => {
  let last = coldField(COLD[1]), lastFilm = filmAt(COLD[1]);
  for (let c = COLD[1] - 0.5; c >= COLD[0]; c -= 0.5) {
    const f = coldField(c);
    assert.ok(f.frame <= last.frame && f.middle <= last.middle, `${c} °C`);
    assert.ok(f.frame < f.middle);
    // below the melting point (1 in the model) everywhere, so the whole pane can freeze
    assert.ok(f.middle < MODEL.melt);
    const film = filmAt(c);
    assert.ok(film >= lastFilm && film <= 1);
    last = f; lastFilm = film;
  }
});

/** The shader's step on the CPU: p, T on an n × n grid, the edges clamped. */
function grow(n: number, steps: number, theta0: number) {
  const { dx, dt, tau, latent: K, alpha, gamma, melt } = MODEL;
  let p = new Float64Array(n * n), T = new Float64Array(n * n);
  const c = (n - 1) / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (Math.hypot(x - c, y - c) < 3) p[y * n + x] = 1;
  const at = (a: Float64Array, x: number, y: number) => a[Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))];
  const h = 0.5 / dx;
  for (let s = 0; s < steps; s++) {
    const pn = new Float64Array(n * n), Tn = new Float64Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const P = (i: number, j: number) => at(p, x + i, y + j);
      const v = P(0, 0);
      const gC = [(P(1, 0) - P(-1, 0)) * h, (P(0, 1) - P(0, -1)) * h];
      const gE = [(P(2, 0) - v) * h, (P(1, 1) - P(1, -1)) * h], gW = [(v - P(-2, 0)) * h, (P(-1, 1) - P(-1, -1)) * h];
      const gN = [(P(1, 1) - P(-1, 1)) * h, (P(0, 2) - v) * h], gS = [(P(1, -1) - P(-1, -1)) * h, (v - P(0, -2)) * h];
      const [kC] = anisotropy(gC[0], gC[1], theta0);
      const kE = anisotropy(gE[0], gE[1], theta0), kW = anisotropy(gW[0], gW[1], theta0);
      const kN = anisotropy(gN[0], gN[1], theta0), kS = anisotropy(gS[0], gS[1], theta0);
      const t1 = (kN[0] * kN[1] * gN[0] - kS[0] * kS[1] * gS[0]) * h;
      const t2 = -(kE[0] * kE[1] * gE[1] - kW[0] * kW[1] * gW[1]) * h;
      const lap = (P(1, 0) + P(-1, 0) + P(0, 1) + P(0, -1) - 4 * v) / (dx * dx);
      const t3 = kC * kC * lap + (kE[0] ** 2 - kW[0] ** 2) * h * gC[0] + (kN[0] ** 2 - kS[0] ** 2) * h * gC[1];
      const t = at(T, x, y), m = alpha / Math.PI * Math.atan(gamma * (melt - t));
      const q = Math.min(1, Math.max(0, v + dt / tau * (t1 + t2 + t3 + v * (1 - v) * (v - 0.5 + m))));
      const lapT = (at(T, x + 1, y) + at(T, x - 1, y) + at(T, x, y + 1) + at(T, x, y - 1) - 4 * t) / (dx * dx);
      pn[y * n + x] = q;
      Tn[y * n + x] = t + dt * lapT + K * (q - v);
    }
    p = pn; T = Tn;
  }
  return p;
}

test("a crystal grows six arms, along its own axes", () => {
  const n = 90, theta0 = 0.3, p = grow(n, 700, theta0), c = (n - 1) / 2;
  // how far the ice reaches from the middle, in cells, along a direction
  const reach = (a: number) => {
    let r = 0;
    for (let d = 0; d < c - 2; d += 0.5) {
      const x = Math.round(c + Math.cos(a) * d), y = Math.round(c + Math.sin(a) * d);
      if (p[y * n + x] > 0.5) r = d; else if (d > r + 2) break;
    }
    return r;
  };
  const arms = [0, 1, 2, 3, 4, 5].map(k => reach(theta0 + k * Math.PI / 3));
  const gaps = [0, 1, 2, 3, 4, 5].map(k => reach(theta0 + (k + 0.5) * Math.PI / 3));
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  assert.ok(mean(arms) > 12, `the arms reach ${arms}`);
  assert.ok(mean(arms) > 1.6 * mean(gaps), `arms ${arms}, between them ${gaps}`);
  // and all six about alike (no direction of the grid favoured)
  assert.ok(Math.max(...arms) - Math.min(...arms) < 0.35 * mean(arms), `arms ${arms}`);
});

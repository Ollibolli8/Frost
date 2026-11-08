var Xt={dx:.03,dt:1e-4,tau:2e-4,eps:.01,delta:.045,sym:6,latent:2.2,alpha:.9,gamma:10,melt:1,noise:.04,cool:0},ee={warm:12,fade:1.4,warmth:3,thaw:10,dry:.22,film:14,filmMelt:16},Lt=[-20,-2];function Vt(n){let a=Pe((-n-2)/18,0,1);return{frame:.25-.65*a,middle:.5-.6*a,foot:.08}}function $t(n){return .5+.45*Pe((-n-2)/18,0,1)}function jt(n){let a=n>>>0;return()=>{a=a+1831565813>>>0;let e=Math.imul(a^a>>>15,1|a);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function Rt(n,a,e){let p=jt(e),h=[],me=()=>p()*Math.PI/3,he=(u,T)=>{for(let M=0;M<u;M++){let[Te,Ve]=T((M+.5+(p()-.5)*.7)/u);h.push({x:Te,y:Ve,r:2.5+p()*1.5,angle:me(),frame:!0})}},F=Math.min(n,a);he(Math.max(4,Math.round(n/(F*.085))),u=>[u*n,1.5]),he(Math.max(2,Math.round(a/(F*.16))),u=>[1.5,(.06+u*.88)*a]),he(Math.max(2,Math.round(a/(F*.18))),u=>[n-1.5,(.1+u*.82)*a]),he(Math.max(2,Math.round(n/(F*.24))),u=>[(.12+u*.8)*n,a-1.5]);for(let u=0;u<9;u++)p();let D=p()<.5,ne=n*(.16+p()*.08),L=.32+p()*.2,ae=n*(D?.16:.84),ie=a*(.74+p()*.08),se={ax:ae,ay:ie,bx:ae+(D?1:-1)*ne*Math.cos(L),by:ie-ne*Math.sin(L),angle:L},w=Math.min(60-h.length,Math.max(4,Math.round(ne/9)));for(let u=0;u<w;u++){let T=(u+.5+(p()-.5)*.5)/w;h.push({x:ae+(se.bx-ae)*T,y:ie+(se.by-ie)*T,r:1.6+p(),angle:L+(p()-.5)*.3,frame:!1})}return{seeds:h.slice(0,60),scratch:se}}var Kt=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,te=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
`,P=Xt,E=n=>Number.isInteger(n)?n.toFixed(1):String(n),Yt=te+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uA;    // cos \u03B80, sin \u03B80 (the crystal's turn), pinned (a seed on the frame), the glass's temperature
uniform ivec2 uN;
uniform uint uStep;
uniform float uStepSec;  // real seconds this step stands for
uniform vec4 uSeg;       // the finger's path over this step, a to b, in cells
uniform float uRad;      // its radius, cells
uniform float uPress;
uniform float uThaw;     // warmth everywhere (thawing the whole window)
const float DX = ${E(P.dx)}, DT = ${E(P.dt)}, TAU = ${E(P.tau)}, EB = ${E(P.eps)}, DELTA = ${E(P.delta)};
const float K = ${E(P.latent)}, ALPHA = ${E(P.alpha)}, GAMMA = ${E(P.gamma)}, TM = ${E(P.melt)}, NOISE = ${E(P.noise)}, COOL = ${E(P.cool)};
const float RISE = ${E(ee.warm)}, FADE = ${E(ee.fade)}, WMAX = ${E(ee.warmth)}, THAW = ${E(ee.thaw)}, DRY = ${E(ee.dry)};

vec4 S(ivec2 c) { return texelFetch(uS, clamp(c, ivec2(0), uN - 1), 0); }
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float rand(ivec2 c) { return float(pcg(uint(c.x) + pcg(uint(c.y) + pcg(uStep)))) * (1.0 / 4294967296.0); }
// \u03B5 and d\u03B5/d\u03B8 for an edge whose normal is g, in a crystal turned by r = (cos \u03B80, sin \u03B80)
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
}`,Zt=te+`
uniform vec4 uSeeds[60];   // x, y, radius (cells), turn
uniform float uFrame[60];  // 1 for a seed on the frame
uniform int uCount;
uniform ivec2 uN;
uniform vec3 uCold;        // the glass at its frame, in its middle, how much colder at its foot
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
  float water = uKeep == 1 ? texelFetch(uPrev, ivec2(q), 0).w : 0.0;
  o = uMode == 0 ? vec4(ice, glass, 0.0, water) : vec4(cos(turn), sin(turn), pin, glass);
}`,Jt=te+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uF;    // the film before: thickness, wet
uniform sampler2D uA;    // the glass's temperature in .w
uniform float uDt;       // seconds of the ice's time since the last
uniform float uThaw;
uniform float uMax;      // how thick it grows at this cold
const float GROW = ${E(ee.film)}, MELT = ${E(ee.filmMelt)}, DRY = ${E(ee.dry)};
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
  float target = uMax * grain * clamp(1.0 - glass * 1.4, 0.35, 1.0);
  float wet = max(h.g, s.w);
  float grow = (1.0 - exp(-uDt / GROW)) * (1.0 - smoothstep(0.02, 0.2, wet)) * (1.0 - smoothstep(0.05, 0.3, warm));
  float film = h.r + max(target - h.r, 0.0) * grow;
  float gone = film * (1.0 - exp(-uDt * MELT * smoothstep(0.15, 0.8, warm)));
  film -= gone;
  o = vec4(film, min(h.g + gone * 1.6, 1.5) * exp(-uDt * DRY), 0.0, 1.0);
}`,Qt=te+`
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
}`,er=te+`
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
}`,tr=te+`
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
}`,rr=te+`
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
}`,or=te+`
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
}`;function kt(n){let a=n.canvas,e=a.getContext("webgl2",{antialias:!1,alpha:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!e)throw new Error("no WebGL 2");if(!e.getExtension("EXT_color_buffer_float"))throw new Error("no float render targets");let p=e.getExtension("KHR_parallel_shader_compile"),h=[],me=(t,r)=>{let o=e.createShader(t);return e.shaderSource(o,r),e.compileShader(o),h.push(o),o},he=me(e.VERTEX_SHADER,Kt),F=t=>{let r=e.createProgram(),o=me(e.FRAGMENT_SHADER,t);return e.attachShader(r,he),e.attachShader(r,o),e.bindAttribLocation(r,0,"p"),e.linkProgram(r),{prog:r,fs:o,u:new Map}},D={init:F(Zt),step:F(Yt),film:F(Jt),blur:F(Qt),age:F(er),way:F(tr),soft:F(rr),look:F(or)},ne=Object.values(D),L=!1,ae=e.createVertexArray();e.bindVertexArray(ae);let ie=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ie),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let Ee=e.getParameter(e.MAX_TEXTURE_SIZE),se=new Set,w=(t,r,o,i)=>{let m=e.createTexture();e.bindTexture(e.TEXTURE_2D,m),e.texStorage2D(e.TEXTURE_2D,1,o,t,r);let d=i?e.LINEAR:e.NEAREST;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,d),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,d),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let y=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,y),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,m,0),e.bindFramebuffer(e.FRAMEBUFFER,null);let f={tex:m,fbo:y,w:t,h:r};return se.add(f),f},u=t=>{t&&(e.deleteTexture(t.tex),e.deleteFramebuffer(t.fbo),se.delete(t))},T=1,M=1,Te=n.pixelRatio??Math.min(window.devicePixelRatio||1,2),Ve=()=>Math.min(T,M)<560||matchMedia("(pointer: coarse)").matches,c=0,l=0,R=0,G=0,de=0,g=null,B=null,Me=null,pe=null,U=null,I=null,ge=0,Se=null,Le=null,ve=null,$e=n.seed??7,Ge=Pe(n.cold??-9,...Lt),je=Rt(1,1,$e),k=null,A=null,H=0,X=0,Re=!0,ct=!!n.mirror,Ue=!1,lt=n.focus??[.5,.5],ke=null,ue=null,Fe=null,xe=null,Ae=0,Ie=()=>k instanceof HTMLVideoElement?k:null,Ut=t=>typeof t.requestVideoFrameCallback=="function",W=!!n.still,ce=!0,Ke=!0,z=0,V=-1,De=!1,$=0,be=18,O=-1,j=-1,we=[],s=null,ye=[0,0],We=!1,Oe=!1,K=-1,Ne=0,Y=0,Z=1,N=!0;function Ye(t){if(K>=0)return 260*Z;if(O<0)return 0;let r=(t-O)/1e3,o=(t-j)/1e3,i=s||o<6;if(W)return i?260:0;let m=900*Math.exp(-r/2.4),d=r<45?1:Math.max(0,1-(r-45)/20);return Z*Math.max(m+230*d,i?260:0,o<40?230:0)}function Ze(){let t=a.getBoundingClientRect();T=Math.max(1,t.width),M=Math.max(1,t.height);let r=Math.round(T*Te),o=Math.round(M*Te);(a.width!==r||a.height!==o)&&(a.width=r,a.height=o);let i=T/M,m=c/Math.max(1,l);(!g||Math.abs(Math.log(i/m))>.18)&&It(),N=!0}function It(){let t=n.cells??Math.round(Ve()?Math.min(52e4,T*M*1.6):Pe(T*M*.72,3e5,9e5));c=Math.max(32,Math.min(Ee,Math.round(Math.sqrt(t*T/M)))),l=Math.max(32,Math.min(Ee,Math.round(t/c))),g&&(u(g[0]),u(g[1])),U&&(u(U[0]),u(U[1])),I&&(u(I[0]),u(I[1])),u(B),u(Me),u(pe),u(Se),u(Le),u(ve),g=[w(c,l,e.RGBA32F,!1),w(c,l,e.RGBA32F,!1)],U=[w(c,l,e.RG16F,!0),w(c,l,e.RG16F,!0)],B=w(c,l,e.RGBA16F,!1),Me=w(c,l,e.RGBA16F,!1),pe=w(c,l,e.RGBA16F,!0),I=[w(c,l,e.RG32F,!1),w(c,l,e.RG32F,!1)],ge=0,Se=w(c,l,e.RGBA16F,!1),Le=w(c,l,e.RGBA16F,!1),ve=w(c,l,e.RGBA16F,!0),G=0,R=0,de=0,Z=Math.sqrt(c*l/52e4),L&&Je()}function Je(){!g||!B||(je=Rt(c,l,$e),ft(!0),O=-1,G=0,$=0,W&&(Y=Math.round(5200*Z)))}function ft(t){let r=J(D.init),o=new Float32Array(240),i=new Float32Array(60);je.seeds.forEach((d,y)=>{o.set([d.x,d.y,d.r,d.angle],y*4),i[y]=d.frame?1:0}),e.uniform4fv(r("uSeeds"),o),e.uniform1fv(r("uFrame"),i),e.uniform1i(r("uCount"),je.seeds.length),e.uniform2i(r("uN"),c,l);let m=Vt(Ge);e.uniform3f(r("uCold"),m.frame,m.middle,m.foot),e.viewport(0,0,c,l),e.uniform1i(r("uKeep"),0),e.uniform1i(r("uPrev"),0),v(0,g[R].tex),e.uniform1i(r("uMode"),1),_(B),t&&(e.uniform1i(r("uMode"),0),e.uniform1i(r("uKeep"),G>0?1:0),v(0,g[R].tex),_(g[1-R]),R=1-R,Qe(0,0,!0))}function J(t){return e.useProgram(t.prog),r=>{let o=t.u.get(r);return o===void 0&&(o=e.getUniformLocation(t.prog,r),t.u.set(r,o)),o}}function _(t){e.bindFramebuffer(e.FRAMEBUFFER,t?t.fbo:null),e.drawArrays(e.TRIANGLES,0,3)}function v(t,r){e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r)}function mt(t,r){if(!g||!B||t<=0)return;let o=J(D.step);e.viewport(0,0,c,l),e.uniform1i(o("uS"),0),e.uniform1i(o("uA"),1),e.uniform2i(o("uN"),c,l),e.uniform1f(o("uStepSec"),r/t),e.uniform1f(o("uThaw"),Ne);let i=c/T,m=l/M;e.uniform1f(o("uRad"),Math.max(26,Math.min(T,M)*.05)*i),v(1,B.tex);for(let d=0;d<t;d++){if(s){let y=d/t,f=(d+1)/t,q=s.px+(s.x-s.px)*y,Q=s.py+(s.y-s.py)*y,Ce=s.px+(s.x-s.px)*f,Ht=s.py+(s.y-s.py)*f;e.uniform4f(o("uSeg"),q*i,(M-Q)*m,Ce*i,(M-Ht)*m),e.uniform1f(o("uPress"),1)}else e.uniform1f(o("uPress"),0);e.uniform1ui(o("uStep"),G++),v(0,g[R].tex),_(g[1-R]),R=1-R}s&&(s.px=s.x,s.py=s.y)}function ht(t){if(!g||!B||!U||t<=0)return;let r=J(D.film);e.viewport(0,0,c,l),e.uniform1i(r("uS"),0),e.uniform1i(r("uF"),1),e.uniform1i(r("uA"),2),e.uniform1f(r("uDt"),t),e.uniform1f(r("uThaw"),Ne),e.uniform1f(r("uMax"),$t(Ge)),v(0,g[R].tex),v(1,U[de].tex),v(2,B.tex),_(U[1-de]),de=1-de}function Qe(t,r,o=!1){if(!g||!I)return;let i=J(D.age);e.viewport(0,0,c,l),e.uniform1i(i("uS"),0),e.uniform1i(i("uG"),1),e.uniform2f(i("uClock"),t,r),e.uniform1i(i("uInit"),o?1:0),v(0,g[R].tex),v(1,I[ge].tex),_(I[1-ge]),ge=1-ge}function Wt(){if(!I||!Se||!Le||!ve)return;let t=J(D.way);e.viewport(0,0,c,l),e.uniform1i(t("uG"),0),e.uniform2i(t("uN"),c,l),e.uniform1f(t("uAhead"),40*Z),e.uniform1i(t("uPass"),0),v(0,I[ge].tex),_(Se),e.uniform1i(t("uPass"),1),e.uniform2i(t("uDir"),1,0),v(0,Se.tex),_(Le),e.uniform1i(t("uPass"),2),e.uniform2i(t("uDir"),0,1),v(0,Le.tex),_(ve)}function Ot(){if(!g||!Me||!pe)return;let t=J(D.blur);e.viewport(0,0,c,l),e.uniform1i(t("uS"),0),e.uniform2i(t("uN"),c,l),e.uniform2i(t("uDir"),1,0),e.uniform1i(t("uPass"),0),v(0,g[R].tex),_(Me),e.uniform2i(t("uDir"),0,1),e.uniform1i(t("uPass"),1),v(0,Me.tex),_(pe)}function et(){if(!k)return;let t=Ie(),r=t?t.videoWidth:k.naturalWidth||k.width,o=t?t.videoHeight:k.naturalHeight||k.height;if(!r||!o)return;let i=k;if(!t&&Math.max(r,o)>Ee){let y=Ee/Math.max(r,o),f=document.createElement("canvas");f.width=Math.round(r*y),f.height=Math.round(o*y),f.getContext("2d").drawImage(k,0,0,f.width,f.height),i=f}let m=i===k?r:i.width,d=i===k?o:i.height;if(e.activeTexture(e.TEXTURE2),!A||m!==H||d!==X||Re!==!t){A&&e.deleteTexture(A),A=e.createTexture(),e.bindTexture(e.TEXTURE_2D,A),H=m,X=d,Re=!t,e.texStorage2D(e.TEXTURE_2D,Math.floor(Math.log2(Math.max(H,X)))+1,Re?e.SRGB8_ALPHA8:e.RGBA8,H,X),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.MIRRORED_REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.MIRRORED_REPEAT),u(ke),u(ue),u(Fe),u(xe);let y=Math.max(8,Math.round(H/4)),f=Math.max(8,Math.round(X/4));ke=w(y,f,e.RGBA16F,!0),ue=w(y,f,e.RGBA16F,!0);let q=Math.max(4,Math.round(H/16)),Q=Math.max(4,Math.round(X/16));Fe=w(q,Q,e.RGBA16F,!0),xe=w(q,Q,e.RGBA16F,!0)}e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,A),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texSubImage2D(e.TEXTURE_2D,0,0,0,e.RGBA,e.UNSIGNED_BYTE,i),e.generateMipmap(e.TEXTURE_2D),Ue=!1,L&&dt()}function dt(){if(!A||!ke||!ue||!Fe||!xe)return;let t=J(D.soft);e.uniform1i(t("uSrc"),0);let r=(o,i,m,d,y,f,q)=>{e.viewport(0,0,i.w,i.h),e.uniform2f(t("uOut"),i.w,i.h),e.uniform2f(t("uDir"),m,d),e.uniform1f(t("uLod"),y),e.uniform1i(t("uDecode"),f?1:0),e.uniform1f(t("uSigma"),q),v(0,o),_(i)};r(A,ke,1,0,2,!Re,2.6),r(ke.tex,ue,0,1,0,!1,2.6),r(ue.tex,Fe,1.5,0,0,!1,3.2),r(Fe.tex,xe,0,1.5,0,!1,3.2)}function _e(t){if(!L||!A||!pe||!U||!ue||!xe||!ve)return!1;Ot(),Wt();let r=J(D.look),o=a.width,i=a.height;e.viewport(0,0,o,i);let m=Math.max(o/H,i/X),[d,y]=lt,f=H*m,q=X*m,Q=(o-f)*d,Ce=(i-q)*y;return e.uniform4f(r("uFit"),Q,Ce,f,q),e.uniform2f(r("uRes"),o,i),e.uniform1f(r("uScale"),o/T),e.uniform2f(r("uGrid"),c,l),We||(ye=[T*.3,M*.2]),e.uniform2f(r("uLight"),ye[0]*o/T,ye[1]*i/M),e.uniform1f(r("uTime"),t/1e3%1e3),e.uniform1i(r("uDecode"),Re?0:1),e.uniform1i(r("uMirror"),ct?1:0),e.uniform1f(r("uLit"),Oe||s?1:.35),e.uniform1i(r("uLook"),0),e.uniform1i(r("uSharp"),1),e.uniform1i(r("uSoft"),2),e.uniform1i(r("uGlow"),3),e.uniform1i(r("uFilm"),4),e.uniform1i(r("uWay"),5),v(0,pe.tex),v(1,A),v(2,ue.tex),v(3,xe.tex),v(4,U[de].tex),v(5,ve.tex),_(null),!0}function tt(t){if(z=0,!ce||!Ke)return;if(!L&&!Nt()){z=requestAnimationFrame(tt);return}let r=V<0?1/60:Math.min(.1,(t-V)/1e3);V>=0&&(we.push(t-V),we.length>40&&we.shift()),V=t;let o=Ie();o&&(Ue||!Ut(o)&&!o.paused)&&et(),we.length>=40&&[...we].sort((Q,Ce)=>Q-Ce)[20]>21&&be>3&&(be=Math.max(3,Math.floor(be*.75)),we.length=0);let i=0,m=r;if(Y>0)i=Math.min(Y,80),Y-=i,m=i/260;else if(K>=0){let f=(t-K)/1e3;Ne=W?1:Math.min(1,f/.9)*.9,f>(W?0:1.8)?(K=-1,Ne=0,$e++,Je(),W||(O=t),j=t):($+=Ye(t)*r,i=Math.min(Math.floor($),be),$-=i)}else $+=Ye(t)*r,i=Math.min(Math.floor($),be),$=Math.min($-i,be);mt(i,m),i>0&&Qe(G-i,G),i>0&&ht(i/(230*Z)*(Y>0?2.5:1)),(i>0||N||o)&&_e(t)&&(N=!1,n.onFrame?.(t),!De&&Y<=0&&(De=!0,requestAnimationFrame(()=>requestAnimationFrame(f=>{ce&&(O<0&&!W&&(O=f),n.onReady?.(),x())})))),(Y>0||K>=0||Ye(t)>0||O<0&&!W&&!De||!!o&&!o.paused)&&A||!L?z=requestAnimationFrame(tt):V=-1}function x(){ce&&Ke&&!z&&(z=requestAnimationFrame(tt))}function Nt(){if(p&&ne.some(t=>!e.getProgramParameter(t.prog,p.COMPLETION_STATUS_KHR)))return!1;for(let t of ne)if(!e.getProgramParameter(t.prog,e.LINK_STATUS)){let r=e.getShaderInfoLog(t.fs)||e.getProgramInfoLog(t.prog)||"link failed";return pt(new Error(`frost: ${r}`)),!1}return L=!0,Je(),A&&dt(),!0}function pt(t){ce&&(n.onFail?.(t),St())}let gt=t=>{t.preventDefault(),pt(new Error("frost: WebGL context lost"))};a.addEventListener("webglcontextlost",gt);let vt=t=>{let r=a.getBoundingClientRect();return[t.clientX-r.left,t.clientY-r.top]},xt=t=>{if(t.button>0||s)return;let[r,o]=vt(t);s={id:t.pointerId,x:r,y:o,px:r,py:o},ye=[r,o],We=!0,a.setPointerCapture?.(t.pointerId),j=performance.now(),t.preventDefault(),x()},bt=t=>{let[r,o]=vt(t);s&&s.id===t.pointerId&&(s.x=r,s.y=o),(t.pointerType==="mouse"||s)&&(ye=[r,o],We=!0,Oe=t.pointerType==="mouse",N=!0,x())},wt=()=>{Oe&&(Oe=!1,N=!0,x())},Be=t=>{!s||s.id!==t.pointerId||(s=null,j=performance.now(),x())};a.addEventListener("pointerdown",xt),a.addEventListener("pointermove",bt),a.addEventListener("pointerup",Be),a.addEventListener("pointercancel",Be),a.addEventListener("pointerleave",wt);let yt=()=>{document.hidden?(cancelAnimationFrame(z),z=0,V=-1):x()};document.addEventListener("visibilitychange",yt);let Et=new ResizeObserver(()=>{Ze(),De&&_e(performance.now()),x()});Et.observe(a),Ze();function Bt(t){let r=t;if(!r.requestVideoFrameCallback){t.addEventListener("play",x);return}let o=()=>{!ce||k!==t||(Ue=!0,x(),Ae=r.requestVideoFrameCallback(o))};Ae=r.requestVideoFrameCallback(o)}function Tt(){let t=Ie();t&&(t.removeEventListener("play",x),Ae&&t.cancelVideoFrameCallback?.(Ae),Ae=0)}function Mt(t,r={}){Tt(),k=t,ct=!!r.mirror,Ue=!0,lt=r.focus??[.5,.5];let o=Ie();o&&Bt(o),!o||o.readyState>=2?et():o.addEventListener("loadeddata",()=>{k===o&&(et(),N=!0,x())},{once:!0}),N=!0,x()}function St(){if(ce&&(ce=!1,cancelAnimationFrame(z),Tt(),Et.disconnect(),document.removeEventListener("visibilitychange",yt),a.removeEventListener("webglcontextlost",gt),a.removeEventListener("pointerdown",xt),a.removeEventListener("pointermove",bt),a.removeEventListener("pointerup",Be),a.removeEventListener("pointercancel",Be),a.removeEventListener("pointerleave",wt),!e.isContextLost())){for(let t of[...se])u(t);e.deleteTexture(A),e.deleteBuffer(ie),e.deleteVertexArray(ae);for(let t of ne)e.deleteProgram(t.prog);for(let t of h)e.deleteShader(t);e.getExtension("WEBGL_lose_context")?.loseContext()}}return n.source&&Mt(n.source,{mirror:n.mirror,focus:n.focus}),x(),{setSource:Mt,setCold(t){Ge=Pe(t,...Lt),L&&g&&ft(!1),j=performance.now(),x()},get cold(){return Ge},thaw(){K<0&&L&&(K=performance.now(),j=K,x())},touch(t,r=0){if(t===null){s?.id===-1&&(s=null),j=performance.now(),x();return}s&&s.id===-1?(s.x=t,s.y=r):s||(s={id:-1,x:t,y:r,px:t,py:r}),ye=[t,r],We=!0,j=performance.now(),x()},setStill(t){t!==W&&(W=t,t&&O>=0&&performance.now()-O<8e3&&(Y=Math.round(4e3*Z)),N=!0,x())},setActive(t){Ke=t,t?(N=!0,x()):(cancelAnimationFrame(z),z=0,V=-1)},setPixelRatio(t){Te=t,Ze(),De&&_e(performance.now()),x()},get grid(){return[c,l]},get steps(){return G},advance(t){if(L){for(let r=0;r<t;r+=50){let o=Math.min(50,t-r);mt(o,o/260),Qe(G-o,G),ht(o/(230*Z))}_e(performance.now())}},read(){if(!g)return null;let t=new Float32Array(c*l*4);return e.bindFramebuffer(e.FRAMEBUFFER,g[R].fbo),e.readPixels(0,0,c,l,e.RGBA,e.FLOAT,t),e.bindFramebuffer(e.FRAMEBUFFER,null),t},snapshot(t="image/png",r){return _e(performance.now()),new Promise(o=>a.toBlob(o,t,r))},dispose:St}}async function Ft(n="user"){let a=await navigator.mediaDevices.getUserMedia({audio:!1,video:{facingMode:n,width:{ideal:1920},height:{ideal:1080}}}),e=document.createElement("video");e.muted=!0,e.playsInline=!0,e.srcObject=a;try{await e.play()}catch(h){throw a.getTracks().forEach(me=>me.stop()),h}let p=a.getVideoTracks()[0]?.getSettings().facingMode;return{video:e,mirror:(p??n)!=="environment",stop(){a.getTracks().forEach(h=>h.stop()),e.srcObject=null}}}function Pe(n,a,e){return Math.min(e,Math.max(a,n))}var fe=new URLSearchParams(location.search),S=document.querySelector("#frost"),re=S.querySelector("canvas"),At=S.querySelector(".fr-finger"),rt=S.querySelector(".fr-note"),nt=S.querySelector(".fr-cold input"),_t=S.querySelector("output"),Ct=[...S.querySelectorAll("[data-source]")],it=S.querySelector(".fr-flip"),at=matchMedia("(prefers-reduced-motion: reduce)"),nr=matchMedia("(max-width: 700px)").matches,He=nr?[.5,.5]:[.5,.52],st=Number(fe.get("cold")??-9),Pt=n=>`${n<0?"\u2212":""}${Math.abs(n).toFixed(1)} \xB0C`,b=null,oe=null,ze=null,le=S.querySelector(".fr-photo");fe.has("photo")&&(S.querySelector(".fr-pic source")?.remove(),le.src=fe.get("photo"));nt.value=String(st);_t.textContent=Pt(st);function ut(n){for(let a of Ct)a.setAttribute("aria-pressed",String(a.dataset.source===n))}function Xe(n){rt.textContent=n,n&&setTimeout(()=>{rt.textContent===n&&(rt.textContent="")},4e3)}function qe(){oe?.stop(),oe=null,it.hidden=!0,ze&&(URL.revokeObjectURL(ze),ze=null)}try{b=kt({canvas:re,cold:st,focus:He,seed:fe.has("seed")?Number(fe.get("seed")):void 0,still:fe.has("still")||at.matches,onReady:()=>{S.dataset.gl="on"},onFail:()=>{S.dataset.gl="off",b=null,qe()}}),le.decode().then(()=>{b?.setSource(le,{focus:He}),le.addEventListener("load",()=>{b&&!oe&&!ze&&le.complete&&b.setSource(le,{focus:He})})},()=>Xe("The photo didn't load"))}catch{S.dataset.gl="off"}at.addEventListener("change",()=>b?.setStill(at.matches));fe.has("debug")&&Object.assign(window,{frost:b});function zt(){qe(),b?.setSource(le,{focus:He}),ut("photo")}async function qt(n){if(b)try{let a=await Ft(n);if(!b){a.stop();return}qe(),oe=a,b.setSource(a.video,{mirror:a.mirror}),ut("camera"),navigator.mediaDevices.enumerateDevices?.().then(e=>{it.hidden=!oe||e.filter(p=>p.kind==="videoinput").length<2},()=>{})}catch{Xe("No camera, or it wasn't allowed")}}for(let n of Ct)n.addEventListener("click",()=>{n.dataset.source==="photo"||oe?zt():qt("user")});it.addEventListener("click",()=>{qt(oe?.mirror?"environment":"user")});S.querySelector(".fr-file input").addEventListener("change",n=>{let a=n.target.files?.[0];if(!a||!b)return;let e=URL.createObjectURL(a),p=h=>{qe(),ze=e,b.setSource(h),ut("")};if(a.type.startsWith("video/")){let h=document.createElement("video");h.muted=!0,h.loop=!0,h.playsInline=!0,h.src=e,h.play().then(()=>p(h),()=>{URL.revokeObjectURL(e),Xe("That video won't play here")})}else{let h=new Image;h.src=e,h.decode().then(()=>p(h),()=>{URL.revokeObjectURL(e),Xe("That file isn't a picture")})}});nt.addEventListener("input",()=>{let n=Number(nt.value);b?.setCold(n),_t.textContent=Pt(n)});S.querySelector(".fr-thaw").addEventListener("click",()=>b?.thaw());var C=null;function Dt(n,a){return C??={x:0,y:0,down:!1},C.x=Math.min(re.clientWidth,Math.max(0,n)),C.y=Math.min(re.clientHeight,Math.max(0,a)),At.style.left=`${C.x}px`,At.style.top=`${C.y}px`,C.down&&b?.touch(C.x,C.y),C}var ot={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};re.addEventListener("keydown",n=>{if(!b)return;let a=C??Dt(re.clientWidth/2,re.clientHeight/2);ot[n.key]?(n.preventDefault(),Dt(a.x+ot[n.key][0],a.y+ot[n.key][1])):(n.key===" "||n.key==="Enter")&&!n.repeat&&(n.preventDefault(),a.down=!0,b.touch(a.x,a.y))});var Gt=()=>{C?.down&&(C.down=!1,b?.touch(null))};re.addEventListener("keyup",n=>{(n.key===" "||n.key==="Enter")&&Gt()});re.addEventListener("blur",Gt);S.querySelector(".fr-save").addEventListener("click",async()=>{let n=await b?.snapshot("image/jpeg",.92);if(!n)return;let a=document.createElement("a");a.href=URL.createObjectURL(n),a.download="frost.jpg",a.click(),setTimeout(()=>URL.revokeObjectURL(a.href),1e3)});addEventListener("pagehide",qe);document.addEventListener("visibilitychange",()=>{document.hidden&&oe&&zt()});

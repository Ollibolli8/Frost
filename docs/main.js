var Vt={dx:.03,dt:1e-4,tau:2e-4,eps:.01,delta:.045,sym:6,latent:2.2,alpha:.9,gamma:10,melt:1,noise:.04,cool:0},ie={warm:12,fade:1.4,warmth:3,thaw:10,dry:.22,film:14,filmMelt:16},kt=[-20,-2];function $t(n){let a=_e((-n-2)/18,0,1);return{frame:.25-.65*a,middle:.5-.6*a,foot:.08}}function jt(n){return .5+.45*_e((-n-2)/18,0,1)}function Kt(n){let a=n>>>0;return()=>{a=a+1831565813>>>0;let e=Math.imul(a^a>>>15,1|a);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function Rt(n,a,e,L){let f=Kt(e),G=[],ze=()=>f()*Math.PI/3;if(L){let c=L[0]*n,x=L[2]*n,q=(1-L[3])*a,ge=(1-L[1])*a,s=x-c,u=ge-q,M=Math.min(s,u),F=(S,d,W)=>{for(let j=0;j<S;j++){let K=f();if(f()<.18)continue;let[U,B]=W(K);G.push({x:U,y:B,r:d+f()*2.5,angle:ze(),frame:!0})}};return F(Math.max(3,Math.round(s/(M*.1))),2.5,S=>[c+S*s,q]),F(Math.max(2,Math.round(u/(M*.143))),2.2,S=>[c,q+Math.pow(S,1.6)*u]),F(Math.max(2,Math.round(u/(M*.125))),2.2,S=>[x,q+Math.pow(S,1.4)*u]),F(2,2,S=>[c+(.15+.7*S)*s,ge]),{seeds:G.slice(0,60),scratch:null}}let D=(c,x)=>{for(let q=0;q<c;q++){let[ge,s]=x((q+.5+(f()-.5)*.7)/c);G.push({x:ge,y:s,r:2.5+f()*1.5,angle:ze(),frame:!0})}},R=Math.min(n,a);D(Math.max(4,Math.round(n/(R*.085))),c=>[c*n,1.5]),D(Math.max(2,Math.round(a/(R*.16))),c=>[1.5,(.06+c*.88)*a]),D(Math.max(2,Math.round(a/(R*.18))),c=>[n-1.5,(.1+c*.82)*a]),D(Math.max(2,Math.round(n/(R*.24))),c=>[(.12+c*.8)*n,a-1.5]);for(let c=0;c<9;c++)f();let xe=f()<.5,C=n*(.16+f()*.08),ce=.32+f()*.2,fe=n*(xe?.16:.84),H=a*(.74+f()*.08),v={ax:fe,ay:H,bx:fe+(xe?1:-1)*C*Math.cos(ce),by:H-C*Math.sin(ce),angle:ce},b=Math.min(60-G.length,Math.max(4,Math.round(C/9)));for(let c=0;c<b;c++){let x=(c+.5+(f()-.5)*.5)/b;G.push({x:fe+(v.bx-fe)*x,y:H+(v.by-H)*x,r:1.6+f(),angle:ce+(f()-.5)*.3,frame:!1})}return{seeds:G.slice(0,60),scratch:v}}var Yt=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,se=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
`,I=Vt,E=n=>Number.isInteger(n)?n.toFixed(1):String(n),Zt=se+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uA;    // cos \u03B80, sin \u03B80 (the crystal's turn), pinned (a seed on the frame), the glass's temperature
uniform ivec2 uN;
uniform uint uStep;
uniform float uStepSec;  // real seconds this step stands for
uniform vec4 uSeg;       // the finger's path over this step, a to b, in cells
uniform float uRad;      // its radius, cells
uniform float uPress;
uniform float uThaw;     // warmth everywhere (thawing the whole window)
const float DX = ${E(I.dx)}, DT = ${E(I.dt)}, TAU = ${E(I.tau)}, EB = ${E(I.eps)}, DELTA = ${E(I.delta)};
const float K = ${E(I.latent)}, ALPHA = ${E(I.alpha)}, GAMMA = ${E(I.gamma)}, TM = ${E(I.melt)}, NOISE = ${E(I.noise)}, COOL = ${E(I.cool)};
const float RISE = ${E(ie.warm)}, FADE = ${E(ie.fade)}, WMAX = ${E(ie.warmth)}, THAW = ${E(ie.thaw)}, DRY = ${E(ie.dry)};

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
}`,Jt=se+`
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
}`,Qt=se+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uF;    // the film before: thickness, wet
uniform sampler2D uA;    // the glass's temperature in .w
uniform float uDt;       // seconds of the ice's time since the last
uniform float uThaw;
uniform float uMax;      // how thick it grows at this cold
uniform vec4 uBox;       // a frame inside the canvas (cells, y up), as INIT's
const float GROW = ${E(ie.film)}, MELT = ${E(ie.filmMelt)}, DRY = ${E(ie.dry)};
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
}`,er=se+`
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
}`,tr=se+`
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
}`,rr=se+`
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
}`,or=se+`
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
}`,nr=se+`
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
}`;function Ft(n){let a=n.canvas,e=a.getContext("webgl2",{antialias:!1,alpha:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!e)throw new Error("no WebGL 2");if(!e.getExtension("EXT_color_buffer_float"))throw new Error("no float render targets");let L=e.getExtension("KHR_parallel_shader_compile"),f=[],G=(t,r)=>{let o=e.createShader(t);return e.shaderSource(o,r),e.compileShader(o),f.push(o),o},ze=G(e.VERTEX_SHADER,Yt),D=t=>{let r=e.createProgram(),o=G(e.FRAGMENT_SHADER,t);return e.attachShader(r,ze),e.attachShader(r,o),e.bindAttribLocation(r,0,"p"),e.linkProgram(r),{prog:r,fs:o,u:new Map}},R={init:D(Jt),step:D(Zt),film:D(Qt),blur:D(er),age:D(tr),way:D(rr),soft:D(or),look:D(nr)},xe=Object.values(R),C=!1,ce=e.createVertexArray();e.bindVertexArray(ce);let fe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,fe),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let H=e.getParameter(e.MAX_TEXTURE_SIZE),Ge=new Set,v=(t,r,o,i)=>{let h=e.createTexture();e.bindTexture(e.TEXTURE_2D,h),e.texStorage2D(e.TEXTURE_2D,1,o,t,r);let p=i?e.LINEAR:e.NEAREST;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,p),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,p),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let T=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,T),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,h,0),e.bindFramebuffer(e.FRAMEBUFFER,null);let m={tex:h,fbo:T,w:t,h:r};return Ge.add(m),m},b=t=>{t&&(e.deleteTexture(t.tex),e.deleteFramebuffer(t.fbo),Ge.delete(t))},c=1,x=1,q=n.pixelRatio??Math.min(window.devicePixelRatio||1,2),ge=()=>Math.min(c,x)<560||matchMedia("(pointer: coarse)").matches,s=0,u=0,M=0,F=0,S=0,d=null,W=null,j=null,K=null,U=null,B=null,ve=0,Me=null,Se=null,be=null,$e=n.seed??7,Ue=_e(n.cold??-9,...kt),je=Rt(1,1,$e),A=null,_=null,Y=0,Z=0,Le=!0,lt=!!n.mirror,Be=!1,ct=n.focus??[.5,.5],ke=null,me=null,Re=null,we=null,Fe=0,Ie=()=>A instanceof HTMLVideoElement?A:null,Bt=t=>typeof t.requestVideoFrameCallback=="function",X=!!n.still,he=!0,Ke=!0,N=0,J=-1,Ae=!1,Q=0,ye=18,V=-1,ee=-1,Te=[],l=null,Ee=[0,0],We=!1,Ne=!1,te=-1,Oe=0,re=0,oe=1,$=!0;function Ye(t){if(te>=0)return 260*oe;if(V<0)return 0;let r=(t-V)/1e3,o=(t-ee)/1e3,i=l||o<6;if(X)return i?260:0;let h=900*Math.exp(-r/2.4),p=r<45?1:Math.max(0,1-(r-45)/20);return oe*Math.max(h+230*p,i?260:0,o<40?230:0)}function Ze(){let t=a.getBoundingClientRect();c=Math.max(1,t.width),x=Math.max(1,t.height);let r=Math.round(c*q),o=Math.round(x*q);(a.width!==r||a.height!==o)&&(a.width=r,a.height=o);let i=c/x,h=s/Math.max(1,u);(!d||Math.abs(Math.log(i/h))>.18)&&It(),$=!0}function It(){let t=n.cells??Math.round(ge()?Math.min(52e4,c*x*1.6):_e(c*x*.72,3e5,9e5));s=Math.max(32,Math.min(H,Math.round(Math.sqrt(t*c/x)))),u=Math.max(32,Math.min(H,Math.round(t/s))),d&&(b(d[0]),b(d[1])),U&&(b(U[0]),b(U[1])),B&&(b(B[0]),b(B[1])),b(W),b(j),b(K),b(Me),b(Se),b(be),d=[v(s,u,e.RGBA32F,!1),v(s,u,e.RGBA32F,!1)],U=[v(s,u,e.RG16F,!0),v(s,u,e.RG16F,!0)],W=v(s,u,e.RGBA16F,!1),j=v(s,u,e.RGBA16F,!1),K=v(s,u,e.RGBA16F,!0),B=[v(s,u,e.RG32F,!1),v(s,u,e.RG32F,!1)],ve=0,Me=v(s,u,e.RGBA16F,!1),Se=v(s,u,e.RGBA16F,!1),be=v(s,u,e.RGBA16F,!0),F=0,M=0,S=0,oe=Math.sqrt(s*u/52e4),C&&Je()}function Je(){!d||!W||(je=Rt(s,u,$e,n.frame),ft(!0),V=-1,F=0,Q=0,X&&(re=Math.round(5200*oe)))}function ft(t){let r=ne(R.init),o=new Float32Array(240),i=new Float32Array(60);je.seeds.forEach((p,T)=>{o.set([p.x,p.y,p.r,p.angle],T*4),i[T]=p.frame?1:0}),e.uniform4fv(r("uSeeds"),o),e.uniform1fv(r("uFrame"),i),e.uniform1i(r("uCount"),je.seeds.length),e.uniform2i(r("uN"),s,u);let h=$t(Ue);e.uniform3f(r("uCold"),h.frame,h.middle,h.foot),ht(r),e.viewport(0,0,s,u),e.uniform1i(r("uKeep"),0),e.uniform1i(r("uPrev"),0),g(0,d[M].tex),e.uniform1i(r("uMode"),1),P(W),t&&(e.uniform1i(r("uMode"),0),e.uniform1i(r("uKeep"),F>0?1:0),g(0,d[M].tex),P(d[1-M]),M=1-M,Qe(0,0,!0))}function ne(t){return e.useProgram(t.prog),r=>{let o=t.u.get(r);return o===void 0&&(o=e.getUniformLocation(t.prog,r),t.u.set(r,o)),o}}function P(t){e.bindFramebuffer(e.FRAMEBUFFER,t?t.fbo:null),e.drawArrays(e.TRIANGLES,0,3)}function g(t,r){e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r)}function mt(t,r){if(!d||!W||t<=0)return;let o=ne(R.step);e.viewport(0,0,s,u),e.uniform1i(o("uS"),0),e.uniform1i(o("uA"),1),e.uniform2i(o("uN"),s,u),e.uniform1f(o("uStepSec"),r/t),e.uniform1f(o("uThaw"),Oe);let i=s/c,h=u/x;e.uniform1f(o("uRad"),Math.max(26,Math.min(c,x)*.05)*i),g(1,W.tex);for(let p=0;p<t;p++){if(l){let T=p/t,m=(p+1)/t,O=l.px+(l.x-l.px)*T,ae=l.py+(l.y-l.py)*T,Ce=l.px+(l.x-l.px)*m,Xt=l.py+(l.y-l.py)*m;e.uniform4f(o("uSeg"),O*i,(x-ae)*h,Ce*i,(x-Xt)*h),e.uniform1f(o("uPress"),1)}else e.uniform1f(o("uPress"),0);e.uniform1ui(o("uStep"),F++),g(0,d[M].tex),P(d[1-M]),M=1-M}l&&(l.px=l.x,l.py=l.y)}function ht(t){let r=n.frame;r?e.uniform4f(t("uBox"),r[0]*s,(1-r[3])*u,r[2]*s,(1-r[1])*u):e.uniform4f(t("uBox"),0,0,-1,-1)}function dt(t){if(!d||!W||!U||t<=0)return;let r=ne(R.film);e.viewport(0,0,s,u),e.uniform1i(r("uS"),0),e.uniform1i(r("uF"),1),e.uniform1i(r("uA"),2),e.uniform1f(r("uDt"),t),e.uniform1f(r("uThaw"),Oe),e.uniform1f(r("uMax"),jt(Ue)),ht(r),g(0,d[M].tex),g(1,U[S].tex),g(2,W.tex),P(U[1-S]),S=1-S}function Qe(t,r,o=!1){if(!d||!B)return;let i=ne(R.age);e.viewport(0,0,s,u),e.uniform1i(i("uS"),0),e.uniform1i(i("uG"),1),e.uniform2f(i("uClock"),t,r),e.uniform1i(i("uInit"),o?1:0),g(0,d[M].tex),g(1,B[ve].tex),P(B[1-ve]),ve=1-ve}function Wt(){if(!B||!Me||!Se||!be)return;let t=ne(R.way);e.viewport(0,0,s,u),e.uniform1i(t("uG"),0),e.uniform2i(t("uN"),s,u),e.uniform1f(t("uAhead"),40*oe),e.uniform1i(t("uPass"),0),g(0,B[ve].tex),P(Me),e.uniform1i(t("uPass"),1),e.uniform2i(t("uDir"),1,0),g(0,Me.tex),P(Se),e.uniform1i(t("uPass"),2),e.uniform2i(t("uDir"),0,1),g(0,Se.tex),P(be)}function Nt(){if(!d||!j||!K)return;let t=ne(R.blur);e.viewport(0,0,s,u),e.uniform1i(t("uS"),0),e.uniform2i(t("uN"),s,u),e.uniform2i(t("uDir"),1,0),e.uniform1i(t("uPass"),0),g(0,d[M].tex),P(j),e.uniform2i(t("uDir"),0,1),e.uniform1i(t("uPass"),1),g(0,j.tex),P(K)}function et(){if(!A)return;let t=Ie(),r=t?t.videoWidth:A.naturalWidth||A.width,o=t?t.videoHeight:A.naturalHeight||A.height;if(!r||!o)return;let i=A;if(!t&&Math.max(r,o)>H){let T=H/Math.max(r,o),m=document.createElement("canvas");m.width=Math.round(r*T),m.height=Math.round(o*T),m.getContext("2d").drawImage(A,0,0,m.width,m.height),i=m}let h=i===A?r:i.width,p=i===A?o:i.height;if(e.activeTexture(e.TEXTURE2),!_||h!==Y||p!==Z||Le!==!t){_&&e.deleteTexture(_),_=e.createTexture(),e.bindTexture(e.TEXTURE_2D,_),Y=h,Z=p,Le=!t,e.texStorage2D(e.TEXTURE_2D,Math.floor(Math.log2(Math.max(Y,Z)))+1,Le?e.SRGB8_ALPHA8:e.RGBA8,Y,Z),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.MIRRORED_REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.MIRRORED_REPEAT),b(ke),b(me),b(Re),b(we);let T=Math.max(8,Math.round(Y/4)),m=Math.max(8,Math.round(Z/4));ke=v(T,m,e.RGBA16F,!0),me=v(T,m,e.RGBA16F,!0);let O=Math.max(4,Math.round(Y/16)),ae=Math.max(4,Math.round(Z/16));Re=v(O,ae,e.RGBA16F,!0),we=v(O,ae,e.RGBA16F,!0)}e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,_),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texSubImage2D(e.TEXTURE_2D,0,0,0,e.RGBA,e.UNSIGNED_BYTE,i),e.generateMipmap(e.TEXTURE_2D),Be=!1,C&&pt()}function pt(){if(!_||!ke||!me||!Re||!we)return;let t=ne(R.soft);e.uniform1i(t("uSrc"),0);let r=(o,i,h,p,T,m,O)=>{e.viewport(0,0,i.w,i.h),e.uniform2f(t("uOut"),i.w,i.h),e.uniform2f(t("uDir"),h,p),e.uniform1f(t("uLod"),T),e.uniform1i(t("uDecode"),m?1:0),e.uniform1f(t("uSigma"),O),g(0,o),P(i)};r(_,ke,1,0,2,!Le,2.6),r(ke.tex,me,0,1,0,!1,2.6),r(me.tex,Re,1.5,0,0,!1,3.2),r(Re.tex,we,0,1.5,0,!1,3.2)}function De(t){if(!C||!_||!K||!U||!me||!we||!be)return!1;Nt(),Wt();let r=ne(R.look),o=a.width,i=a.height;e.viewport(0,0,o,i);let h=Math.max(o/Y,i/Z),[p,T]=ct,m=Y*h,O=Z*h,ae=(o-m)*p,Ce=(i-O)*T;return e.uniform4f(r("uFit"),ae,Ce,m,O),e.uniform2f(r("uRes"),o,i),e.uniform1f(r("uScale"),o/c),e.uniform2f(r("uGrid"),s,u),We||(Ee=[c*.3,x*.2]),e.uniform2f(r("uLight"),Ee[0]*o/c,Ee[1]*i/x),e.uniform1f(r("uTime"),t/1e3%1e3),e.uniform1i(r("uDecode"),Le?0:1),e.uniform1i(r("uMirror"),lt?1:0),e.uniform1f(r("uLit"),Ne||l?1:.35),e.uniform1i(r("uLook"),0),e.uniform1i(r("uSharp"),1),e.uniform1i(r("uSoft"),2),e.uniform1i(r("uGlow"),3),e.uniform1i(r("uFilm"),4),e.uniform1i(r("uWay"),5),g(0,K.tex),g(1,_),g(2,me.tex),g(3,we.tex),g(4,U[S].tex),g(5,be.tex),P(null),!0}function tt(t){if(N=0,!he||!Ke)return;if(!C&&!Ot()){N=requestAnimationFrame(tt);return}let r=J<0?1/60:Math.min(.1,(t-J)/1e3);J>=0&&(Te.push(t-J),Te.length>40&&Te.shift()),J=t;let o=Ie();o&&(Be||!Bt(o)&&!o.paused)&&et(),Te.length>=40&&[...Te].sort((ae,Ce)=>ae-Ce)[20]>21&&ye>3&&(ye=Math.max(3,Math.floor(ye*.75)),Te.length=0);let i=0,h=r;if(re>0)i=Math.min(re,80),re-=i,h=i/260;else if(te>=0){let m=(t-te)/1e3;Oe=X?1:Math.min(1,m/.9)*.9,m>(X?0:1.8)?(te=-1,Oe=0,$e++,Je(),X||(V=t),ee=t):(Q+=Ye(t)*r,i=Math.min(Math.floor(Q),ye),Q-=i)}else Q+=Ye(t)*r,i=Math.min(Math.floor(Q),ye),Q=Math.min(Q-i,ye);mt(i,h),i>0&&Qe(F-i,F),i>0&&dt(i/(230*oe)*(re>0?2.5:1)),(i>0||$||o)&&De(t)&&($=!1,n.onFrame?.(t),!Ae&&re<=0&&(Ae=!0,requestAnimationFrame(()=>requestAnimationFrame(m=>{he&&(V<0&&!X&&(V=m),n.onReady?.(),w())})))),(re>0||te>=0||Ye(t)>0||V<0&&!X&&!Ae||!!o&&!o.paused)&&_||!C?N=requestAnimationFrame(tt):J=-1}function w(){he&&Ke&&!N&&(N=requestAnimationFrame(tt))}function Ot(){if(L&&xe.some(t=>!e.getProgramParameter(t.prog,L.COMPLETION_STATUS_KHR)))return!1;for(let t of xe)if(!e.getProgramParameter(t.prog,e.LINK_STATUS)){let r=e.getShaderInfoLog(t.fs)||e.getProgramInfoLog(t.prog)||"link failed";return xt(new Error(`frost: ${r}`)),!1}return C=!0,Je(),_&&pt(),!0}function xt(t){he&&(n.onFail?.(t),Lt())}let gt=t=>{t.preventDefault(),xt(new Error("frost: WebGL context lost"))};a.addEventListener("webglcontextlost",gt);let vt=t=>{let r=a.getBoundingClientRect();return[t.clientX-r.left,t.clientY-r.top]},bt=t=>{if(t.button>0||l)return;let[r,o]=vt(t);l={id:t.pointerId,x:r,y:o,px:r,py:o},Ee=[r,o],We=!0,a.setPointerCapture?.(t.pointerId),ee=performance.now(),t.preventDefault(),w()},wt=t=>{let[r,o]=vt(t);l&&l.id===t.pointerId&&(l.x=r,l.y=o),(t.pointerType==="mouse"||l)&&(Ee=[r,o],We=!0,Ne=t.pointerType==="mouse",$=!0,w())},yt=()=>{Ne&&(Ne=!1,$=!0,w())},He=t=>{!l||l.id!==t.pointerId||(l=null,ee=performance.now(),w())};a.addEventListener("pointerdown",bt),a.addEventListener("pointermove",wt),a.addEventListener("pointerup",He),a.addEventListener("pointercancel",He),a.addEventListener("pointerleave",yt);let Tt=()=>{document.hidden?(cancelAnimationFrame(N),N=0,J=-1):w()};document.addEventListener("visibilitychange",Tt);let Et=new ResizeObserver(()=>{Ze(),Ae&&De(performance.now()),w()});Et.observe(a),Ze();function Ht(t){let r=t;if(!r.requestVideoFrameCallback){t.addEventListener("play",w);return}let o=()=>{!he||A!==t||(Be=!0,w(),Fe=r.requestVideoFrameCallback(o))};Fe=r.requestVideoFrameCallback(o)}function Mt(){let t=Ie();t&&(t.removeEventListener("play",w),Fe&&t.cancelVideoFrameCallback?.(Fe),Fe=0)}function St(t,r={}){Mt(),A=t,lt=!!r.mirror,Be=!0,ct=r.focus??[.5,.5];let o=Ie();o&&Ht(o),!o||o.readyState>=2?et():o.addEventListener("loadeddata",()=>{A===o&&(et(),$=!0,w())},{once:!0}),$=!0,w()}function Lt(){if(he&&(he=!1,cancelAnimationFrame(N),Mt(),Et.disconnect(),document.removeEventListener("visibilitychange",Tt),a.removeEventListener("webglcontextlost",gt),a.removeEventListener("pointerdown",bt),a.removeEventListener("pointermove",wt),a.removeEventListener("pointerup",He),a.removeEventListener("pointercancel",He),a.removeEventListener("pointerleave",yt),!e.isContextLost())){for(let t of[...Ge])b(t);e.deleteTexture(_),e.deleteBuffer(fe),e.deleteVertexArray(ce);for(let t of xe)e.deleteProgram(t.prog);for(let t of f)e.deleteShader(t);e.getExtension("WEBGL_lose_context")?.loseContext()}}return n.source&&St(n.source,{mirror:n.mirror,focus:n.focus}),w(),{setSource:St,setCold(t){Ue=_e(t,...kt),C&&d&&ft(!1),ee=performance.now(),w()},get cold(){return Ue},thaw(){te<0&&C&&(te=performance.now(),ee=te,w())},touch(t,r=0){if(t===null){l?.id===-1&&(l=null),ee=performance.now(),w();return}l&&l.id===-1?(l.x=t,l.y=r):l||(l={id:-1,x:t,y:r,px:t,py:r}),Ee=[t,r],We=!0,ee=performance.now(),w()},setStill(t){t!==X&&(X=t,t&&V>=0&&performance.now()-V<8e3&&(re=Math.round(4e3*oe)),$=!0,w())},setActive(t){Ke=t,t?($=!0,w()):(cancelAnimationFrame(N),N=0,J=-1)},setPixelRatio(t){q=t,Ze(),Ae&&De(performance.now()),w()},get grid(){return[s,u]},get steps(){return F},advance(t){if(C){for(let r=0;r<t;r+=50){let o=Math.min(50,t-r);mt(o,o/260),Qe(F-o,F),dt(o/(230*oe))}De(performance.now())}},read(){if(!d)return null;let t=new Float32Array(s*u*4);return e.bindFramebuffer(e.FRAMEBUFFER,d[M].fbo),e.readPixels(0,0,s,u,e.RGBA,e.FLOAT,t),e.bindFramebuffer(e.FRAMEBUFFER,null),t},snapshot(t="image/png",r){return De(performance.now()),new Promise(o=>a.toBlob(o,t,r))},dispose:Lt}}async function At(n="user"){let a=await navigator.mediaDevices.getUserMedia({audio:!1,video:{facingMode:n,width:{ideal:1920},height:{ideal:1080}}}),e=document.createElement("video");e.muted=!0,e.playsInline=!0,e.srcObject=a;try{await e.play()}catch(f){throw a.getTracks().forEach(G=>G.stop()),f}let L=a.getVideoTracks()[0]?.getSettings().facingMode;return{video:e,mirror:(L??n)!=="environment",stop(){a.getTracks().forEach(f=>f.stop()),e.srcObject=null}}}function _e(n,a,e){return Math.min(e,Math.max(a,n))}var pe=new URLSearchParams(location.search),k=document.querySelector("#frost"),ue=k.querySelector("canvas"),Dt=k.querySelector(".fr-finger"),rt=k.querySelector(".fr-note"),nt=k.querySelector(".fr-cold input"),_t=k.querySelector("output"),qt=[...k.querySelectorAll("[data-source]")],it=k.querySelector(".fr-flip"),at=matchMedia("(prefers-reduced-motion: reduce)"),ar=matchMedia("(max-width: 700px)").matches,Xe=ar?[.5,.5]:[.5,.52],st=Number(pe.get("cold")??-9),Pt=n=>`${n<0?"\u2212":""}${Math.abs(n).toFixed(1)} \xB0C`,y=null,le=null,qe=null,de=k.querySelector(".fr-photo");pe.has("photo")&&(k.querySelector(".fr-pic source")?.remove(),de.src=pe.get("photo"));nt.value=String(st);_t.textContent=Pt(st);function ut(n){for(let a of qt)a.setAttribute("aria-pressed",String(a.dataset.source===n))}function Ve(n){rt.textContent=n,n&&setTimeout(()=>{rt.textContent===n&&(rt.textContent="")},4e3)}function Pe(){le?.stop(),le=null,it.hidden=!0,qe&&(URL.revokeObjectURL(qe),qe=null)}try{y=Ft({canvas:ue,cold:st,focus:Xe,seed:pe.has("seed")?Number(pe.get("seed")):void 0,still:pe.has("still")||at.matches,onReady:()=>{k.dataset.gl="on"},onFail:()=>{k.dataset.gl="off",y=null,Pe()}}),de.decode().then(()=>{y?.setSource(de,{focus:Xe}),de.addEventListener("load",()=>{y&&!le&&!qe&&de.complete&&y.setSource(de,{focus:Xe})})},()=>Ve("The photo didn't load"))}catch{k.dataset.gl="off"}at.addEventListener("change",()=>y?.setStill(at.matches));pe.has("debug")&&Object.assign(window,{frost:y});function zt(){Pe(),y?.setSource(de,{focus:Xe}),ut("photo")}async function Gt(n){if(y)try{let a=await At(n);if(!y){a.stop();return}Pe(),le=a,y.setSource(a.video,{mirror:a.mirror}),ut("camera"),navigator.mediaDevices.enumerateDevices?.().then(e=>{it.hidden=!le||e.filter(L=>L.kind==="videoinput").length<2},()=>{})}catch{Ve("No camera, or it wasn't allowed")}}for(let n of qt)n.addEventListener("click",()=>{n.dataset.source==="photo"||le?zt():Gt("user")});it.addEventListener("click",()=>{Gt(le?.mirror?"environment":"user")});k.querySelector(".fr-file input").addEventListener("change",n=>{let a=n.target.files?.[0];if(!a||!y)return;let e=URL.createObjectURL(a),L=f=>{Pe(),qe=e,y.setSource(f),ut("")};if(a.type.startsWith("video/")){let f=document.createElement("video");f.muted=!0,f.loop=!0,f.playsInline=!0,f.src=e,f.play().then(()=>L(f),()=>{URL.revokeObjectURL(e),Ve("That video won't play here")})}else{let f=new Image;f.src=e,f.decode().then(()=>L(f),()=>{URL.revokeObjectURL(e),Ve("That file isn't a picture")})}});nt.addEventListener("input",()=>{let n=Number(nt.value);y?.setCold(n),_t.textContent=Pt(n)});k.querySelector(".fr-thaw").addEventListener("click",()=>y?.thaw());var z=null;function Ct(n,a){return z??={x:0,y:0,down:!1},z.x=Math.min(ue.clientWidth,Math.max(0,n)),z.y=Math.min(ue.clientHeight,Math.max(0,a)),Dt.style.left=`${z.x}px`,Dt.style.top=`${z.y}px`,z.down&&y?.touch(z.x,z.y),z}var ot={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};ue.addEventListener("keydown",n=>{if(!y)return;let a=z??Ct(ue.clientWidth/2,ue.clientHeight/2);ot[n.key]?(n.preventDefault(),Ct(a.x+ot[n.key][0],a.y+ot[n.key][1])):(n.key===" "||n.key==="Enter")&&!n.repeat&&(n.preventDefault(),a.down=!0,y.touch(a.x,a.y))});var Ut=()=>{z?.down&&(z.down=!1,y?.touch(null))};ue.addEventListener("keyup",n=>{(n.key===" "||n.key==="Enter")&&Ut()});ue.addEventListener("blur",Ut);k.querySelector(".fr-save").addEventListener("click",async()=>{let n=await y?.snapshot("image/jpeg",.92);if(!n)return;let a=document.createElement("a");a.href=URL.createObjectURL(n),a.download="frost.jpg",a.click(),setTimeout(()=>URL.revokeObjectURL(a.href),1e3)});addEventListener("pagehide",Pe);document.addEventListener("visibilitychange",()=>{document.hidden&&le&&zt()});

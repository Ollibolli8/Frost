var $t={dx:.03,dt:1e-4,tau:2e-4,eps:.01,delta:.045,sym:6,latent:2.2,alpha:.9,gamma:10,melt:1,noise:.04,cool:0},he={warm:12,fade:1.4,warmth:3,thaw:10,dry:.22,film:14,filmMelt:16},kt=[-20,-2];function jt(n){let a=Ee((-n-2)/18,0,1);return{frame:.25-.65*a,middle:.5-.6*a,foot:.08}}function Kt(n){return .5+.45*Ee((-n-2)/18,0,1)}function Yt(n){let a=n>>>0;return()=>{a=a+1831565813>>>0;let e=Math.imul(a^a>>>15,1|a);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}var Ft=1;function Rt(n,a,e,A){let f=Yt(e),F=[],Ae=()=>f()*Math.PI/3;if(A){let u=A[0]*n,d=A[2]*n,P=(1-A[3])*a,te=(1-A[1])*a,s=d-u,l=te-P,E=Math.min(s,l),L=Ft+1.5,X=(x,W,Y,I,R)=>{for(let O=0;O<x;O++){let Z=f();if(f()<.18)continue;let[z,v]=Y(Z);z+=I*L,v+=R*L,z>u&&z<d&&(z=Ee(z,u+L,d-L),v=Ee(v,P+L,te-L)),F.push({x:z,y:v,r:W+f()*2.5,angle:Ae(),frame:!0})}},p=x=>W=>P+Math.pow(W,x)*l;X(Math.max(3,Math.round(s/(E*.1))),2.5,x=>[u+x*s,P],0,1);let G=F.length;X(Math.max(2,Math.round(l/(E*.143))),2.2,x=>[u,p(1.6)(x)],1,0);let be=F.slice(G);G=F.length,X(Math.max(2,Math.round(l/(E*.125))),2.2,x=>[d,p(1.4)(x)],-1,0);let re=F.slice(G);X(2,2,x=>[u+(.15+.7*x)*s,te],0,-1);let U=(x,W,Y)=>{let I=[P+L,...W.map(R=>R.y).sort((R,O)=>R-O),te-L];for(let R=1;R<I.length;R++){let O=I[R]-I[R-1];if(O<E*.07)continue;let Z=Math.max(1,Math.round(O/(E*.17)));for(let z=0;z<Z;z++){let v=f();f()<.18||F.push({x:x+Y*L,y:I[R-1]+O*(z+.5+(v-.5)*.3)/Z,r:2.2+f()*2.5,angle:Ae(),frame:!0})}}};return U(u,be,-1),U(d,re,1),{seeds:F.slice(0,60),scratch:null}}let C=(u,d)=>{for(let P=0;P<u;P++){let[te,s]=d((P+.5+(f()-.5)*.7)/u);F.push({x:te,y:s,r:2.5+f()*1.5,angle:Ae(),frame:!0})}},q=Math.min(n,a);C(Math.max(4,Math.round(n/(q*.085))),u=>[u*n,1.5]),C(Math.max(2,Math.round(a/(q*.16))),u=>[1.5,(.06+u*.88)*a]),C(Math.max(2,Math.round(a/(q*.18))),u=>[n-1.5,(.1+u*.82)*a]),C(Math.max(2,Math.round(n/(q*.24))),u=>[(.12+u*.8)*n,a-1.5]);for(let u=0;u<9;u++)f();let Se=f()<.5,_=n*(.16+f()*.08),ge=.32+f()*.2,ve=n*(Se?.16:.84),K=a*(.74+f()*.08),w={ax:ve,ay:K,bx:ve+(Se?1:-1)*_*Math.cos(ge),by:K-_*Math.sin(ge),angle:ge},y=Math.min(60-F.length,Math.max(4,Math.round(_/9)));for(let u=0;u<y;u++){let d=(u+.5+(f()-.5)*.5)/y;F.push({x:ve+(w.bx-ve)*d,y:K+(w.by-K)*d,r:1.6+f(),angle:ge+(f()-.5)*.3,frame:!1})}return{seeds:F.slice(0,60),scratch:w}}var Zt=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,de=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
`,V=$t,M=n=>Number.isInteger(n)?n.toFixed(1):String(n),Jt=de+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uA;    // cos \u03B80, sin \u03B80 (the crystal's turn), pinned (1: a seed on the frame; under 0: the line of a frame inside the canvas), the glass's temperature
uniform ivec2 uN;
uniform uint uStep;
uniform float uStepSec;  // real seconds this step stands for
uniform vec4 uSeg;       // the finger's path over this step, a to b, in cells
uniform float uRad;      // its radius, cells
uniform float uPress;
uniform float uThaw;     // warmth everywhere (thawing the whole window)
const float DX = ${M(V.dx)}, DT = ${M(V.dt)}, TAU = ${M(V.tau)}, EB = ${M(V.eps)}, DELTA = ${M(V.delta)};
const float K = ${M(V.latent)}, ALPHA = ${M(V.alpha)}, GAMMA = ${M(V.gamma)}, TM = ${M(V.melt)}, NOISE = ${M(V.noise)}, COOL = ${M(V.cool)};
const float RISE = ${M(he.warm)}, FADE = ${M(he.fade)}, WMAX = ${M(he.warmth)}, THAW = ${M(he.thaw)}, DRY = ${M(he.dry)};

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
  // the line of a frame inside the canvas takes no ice of its own, so no crystal grows across it; where ice stands on
  // both sides of it the line freezes over between them (a.z: -1 where it runs up and down, -2 along, -3 at a corner)
  if (a.z < -0.5) pn = a.z > -1.5 ? min(max(w.x, ww), max(e.x, ee)) : a.z > -2.5 ? min(max(so.x, ss), max(n.x, nn)) : 0.0;
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
}`,Qt=de+`
uniform vec4 uSeeds[60];   // x, y, radius (cells), turn
uniform float uFrame[60];  // 1 for a seed on the frame
uniform int uCount;
uniform ivec2 uN;
uniform vec3 uCold;        // the glass at its frame, in its middle, how much colder at its foot
uniform vec4 uBox;         // a frame inside the canvas (cells, y up: left, foot, right, head); empty, the canvas's own
uniform int uMode;
uniform sampler2D uPrev;    // the window before: its water stays on the glass
uniform int uKeep;
const float WALL = ${M(Ft)};
// how far a cell is from the line of a frame inside the canvas: under 0 inside the frame
float lineOf(vec2 q) {
  vec2 dq = abs(q - 0.5 * (uBox.xy + uBox.zw)) - 0.5 * (uBox.zw - uBox.xy);
  return length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0);
}
void main() {
  vec2 q = gl_FragCoord.xy;
  bool framed = uBox.z > uBox.x;
  float best = 1e9, ice = 0.0, turn = 0.0, pin = 0.0, line = framed ? lineOf(q) : 0.0;
  for (int i = 0; i < 60; i++) {
    if (i >= uCount) break;
    float d = distance(q, uSeeds[i].xy) - uSeeds[i].z;
    if (d < best) { best = d; turn = uSeeds[i].w; }
    // (round a frame inside the canvas a seed is ice on its own side of the frame's line only)
    if (framed && line * lineOf(uSeeds[i].xy) < 0.0) continue;
    float v = smoothstep(1.0, -1.0, d);
    ice = max(ice, v);
    if (uFrame[i] > 0.5) pin = max(pin, smoothstep(0.0, -1.5, d));
  }

  vec2 u = q / vec2(uN);
  float aspect = float(uN.x) / float(uN.y);
  float edge = min(min(u.x, 1.0 - u.x) * aspect, min(u.y, 1.0 - u.y)) / (0.5 * min(aspect, 1.0));
  float glass = mix(uCold.x, uCold.y, pow(clamp(edge, 0.0, 1.0), 0.75)) - uCold.z * (1.0 - u.y);
  if (framed) {
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
    // the frame's own line takes no ice of its own, so a crystal grows on one side of it only (half a star: a fern)
    if (abs(line) < WALL) {
      vec2 dq = abs(abs(q - 0.5 * (lo + hi)) - 0.5 * (hi - lo));
      ice = 0.0;
      pin = dq.x < WALL && dq.y < WALL ? -3.0 : dq.x < WALL ? -1.0 : dq.y < WALL ? -2.0 : -3.0;
    }
  }
  float water = uKeep == 1 ? texelFetch(uPrev, ivec2(q), 0).w : 0.0;
  o = uMode == 0 ? vec4(ice, glass, 0.0, water) : vec4(cos(turn), sin(turn), pin, glass);
}`,er=de+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uF;    // the film before: thickness, wet
uniform sampler2D uA;    // the glass's temperature in .w
uniform float uDt;       // seconds of the ice's time since the last
uniform float uThaw;
uniform float uMax;      // how thick it grows at this cold
uniform vec4 uBox;       // a frame inside the canvas (cells, y up), as INIT's
const float GROW = ${M(he.film)}, MELT = ${M(he.filmMelt)}, DRY = ${M(he.dry)};
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
}`,tr=de+`
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
}`,rr=de+`
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
}`,or=de+`
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
}`,nr=de+`
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
}`,ar=de+`
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
}`;function At(n){let a=n.canvas,e=a.getContext("webgl2",{antialias:!1,alpha:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!e)throw new Error("no WebGL 2");if(!e.getExtension("EXT_color_buffer_float"))throw new Error("no float render targets");let A=e.getExtension("KHR_parallel_shader_compile"),f=[],F=(t,r)=>{let o=e.createShader(t);return e.shaderSource(o,r),e.compileShader(o),f.push(o),o},Ae=F(e.VERTEX_SHADER,Zt),C=t=>{let r=e.createProgram(),o=F(e.FRAGMENT_SHADER,t);return e.attachShader(r,Ae),e.attachShader(r,o),e.bindAttribLocation(r,0,"p"),e.linkProgram(r),{prog:r,fs:o,u:new Map}},q={init:C(Qt),step:C(Jt),film:C(er),blur:C(tr),age:C(rr),way:C(or),soft:C(nr),look:C(ar)},Se=Object.values(q),_=!1,ge=e.createVertexArray();e.bindVertexArray(ge);let ve=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ve),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let K=e.getParameter(e.MAX_TEXTURE_SIZE),We=new Set,w=(t,r,o,i)=>{let h=e.createTexture();e.bindTexture(e.TEXTURE_2D,h),e.texStorage2D(e.TEXTURE_2D,1,o,t,r);let g=i?e.LINEAR:e.NEAREST;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,g),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,g),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let k=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,k),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,h,0),e.bindFramebuffer(e.FRAMEBUFFER,null);let m={tex:h,fbo:k,w:t,h:r};return We.add(m),m},y=t=>{t&&(e.deleteTexture(t.tex),e.deleteFramebuffer(t.fbo),We.delete(t))},u=1,d=1,P=n.pixelRatio??Math.min(window.devicePixelRatio||1,2),te=()=>Math.min(u,d)<560||matchMedia("(pointer: coarse)").matches,s=0,l=0,E=0,L=0,X=0,p=null,G=null,be=null,re=null,U=null,x=null,W=0,Y=null,I=null,R=null,O=n.seed??7,Z=Ee(n.cold??-9,...kt),z=Rt(1,1,O),v=null,B=null,oe=0,ne=0,De=!0,lt=!!n.mirror,Ie=!1,ct=n.focus??[.5,.5],qe=null,we=null,ze=null,Le=null,Ce=0,Oe=()=>v instanceof HTMLVideoElement?v:null,Wt=t=>typeof t.requestVideoFrameCallback=="function",J=!!n.still,ye=!0,Ke=!0,$=0,ae=-1,_e=!1,ie=0,ke=18,Q=-1,se=-1,Re=[],c=null,Fe=[0,0],Ne=!1,He=!1,ue=-1,Xe=0,le=0,ce=1,ee=!0;function Ye(t){if(ue>=0)return 260*ce;if(Q<0)return 0;let r=(t-Q)/1e3,o=(t-se)/1e3,i=c||o<6;if(J)return i?260:0;let h=900*Math.exp(-r/2.4),g=r<45?1:Math.max(0,1-(r-45)/20);return ce*Math.max(h+230*g,i?260:0,o<40?230:0)}function Ze(){let t=a.getBoundingClientRect();u=Math.max(1,t.width),d=Math.max(1,t.height);let r=Math.round(u*P),o=Math.round(d*P);(a.width!==r||a.height!==o)&&(a.width=r,a.height=o);let i=u/d,h=s/Math.max(1,l);(!p||Math.abs(Math.log(i/h))>.18)&&It(),ee=!0}function It(){let t=n.cells??Math.round(te()?Math.min(52e4,u*d*1.6):Ee(u*d*.72,3e5,9e5));s=Math.max(32,Math.min(K,Math.round(Math.sqrt(t*u/d)))),l=Math.max(32,Math.min(K,Math.round(t/s))),p&&(y(p[0]),y(p[1])),U&&(y(U[0]),y(U[1])),x&&(y(x[0]),y(x[1])),y(G),y(be),y(re),y(Y),y(I),y(R),p=[w(s,l,e.RGBA32F,!1),w(s,l,e.RGBA32F,!1)],U=[w(s,l,e.RG16F,!0),w(s,l,e.RG16F,!0)],G=w(s,l,e.RGBA16F,!1),be=w(s,l,e.RGBA16F,!1),re=w(s,l,e.RGBA16F,!0),x=[w(s,l,e.RG32F,!1),w(s,l,e.RG32F,!1)],W=0,Y=w(s,l,e.RGBA16F,!1),I=w(s,l,e.RGBA16F,!1),R=w(s,l,e.RGBA16F,!0),L=0,E=0,X=0,ce=Math.sqrt(s*l/52e4),_&&Je()}function Je(){!p||!G||(z=Rt(s,l,O,n.frame),ft(!0),Q=-1,L=0,ie=0,J&&(le=Math.round(5200*ce)))}function ft(t){let r=fe(q.init),o=new Float32Array(240),i=new Float32Array(60);z.seeds.forEach((g,k)=>{o.set([g.x,g.y,g.r,g.angle],k*4),i[k]=g.frame?1:0}),e.uniform4fv(r("uSeeds"),o),e.uniform1fv(r("uFrame"),i),e.uniform1i(r("uCount"),z.seeds.length),e.uniform2i(r("uN"),s,l);let h=jt(Z);e.uniform3f(r("uCold"),h.frame,h.middle,h.foot),ht(r),e.viewport(0,0,s,l),e.uniform1i(r("uKeep"),0),e.uniform1i(r("uPrev"),0),b(0,p[E].tex),e.uniform1i(r("uMode"),1),N(G),t&&(e.uniform1i(r("uMode"),0),e.uniform1i(r("uKeep"),L>0?1:0),b(0,p[E].tex),N(p[1-E]),E=1-E,Qe(0,0,!0))}function fe(t){return e.useProgram(t.prog),r=>{let o=t.u.get(r);return o===void 0&&(o=e.getUniformLocation(t.prog,r),t.u.set(r,o)),o}}function N(t){e.bindFramebuffer(e.FRAMEBUFFER,t?t.fbo:null),e.drawArrays(e.TRIANGLES,0,3)}function b(t,r){e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r)}function mt(t,r){if(!p||!G||t<=0)return;let o=fe(q.step);e.viewport(0,0,s,l),e.uniform1i(o("uS"),0),e.uniform1i(o("uA"),1),e.uniform2i(o("uN"),s,l),e.uniform1f(o("uStepSec"),r/t),e.uniform1f(o("uThaw"),Xe);let i=s/u,h=l/d;e.uniform1f(o("uRad"),Math.max(26,Math.min(u,d)*.05)*i),b(1,G.tex);for(let g=0;g<t;g++){if(c){let k=g/t,m=(g+1)/t,j=c.px+(c.x-c.px)*k,me=c.py+(c.y-c.py)*k,Be=c.px+(c.x-c.px)*m,Vt=c.py+(c.y-c.py)*m;e.uniform4f(o("uSeg"),j*i,(d-me)*h,Be*i,(d-Vt)*h),e.uniform1f(o("uPress"),1)}else e.uniform1f(o("uPress"),0);e.uniform1ui(o("uStep"),L++),b(0,p[E].tex),N(p[1-E]),E=1-E}c&&(c.px=c.x,c.py=c.y)}function ht(t){let r=n.frame;r?e.uniform4f(t("uBox"),r[0]*s,(1-r[3])*l,r[2]*s,(1-r[1])*l):e.uniform4f(t("uBox"),0,0,-1,-1)}function dt(t){if(!p||!G||!U||t<=0)return;let r=fe(q.film);e.viewport(0,0,s,l),e.uniform1i(r("uS"),0),e.uniform1i(r("uF"),1),e.uniform1i(r("uA"),2),e.uniform1f(r("uDt"),t),e.uniform1f(r("uThaw"),Xe),e.uniform1f(r("uMax"),Kt(Z)),ht(r),b(0,p[E].tex),b(1,U[X].tex),b(2,G.tex),N(U[1-X]),X=1-X}function Qe(t,r,o=!1){if(!p||!x)return;let i=fe(q.age);e.viewport(0,0,s,l),e.uniform1i(i("uS"),0),e.uniform1i(i("uG"),1),e.uniform2f(i("uClock"),t,r),e.uniform1i(i("uInit"),o?1:0),b(0,p[E].tex),b(1,x[W].tex),N(x[1-W]),W=1-W}function Ot(){if(!x||!Y||!I||!R)return;let t=fe(q.way);e.viewport(0,0,s,l),e.uniform1i(t("uG"),0),e.uniform2i(t("uN"),s,l),e.uniform1f(t("uAhead"),40*ce),e.uniform1i(t("uPass"),0),b(0,x[W].tex),N(Y),e.uniform1i(t("uPass"),1),e.uniform2i(t("uDir"),1,0),b(0,Y.tex),N(I),e.uniform1i(t("uPass"),2),e.uniform2i(t("uDir"),0,1),b(0,I.tex),N(R)}function Nt(){if(!p||!be||!re)return;let t=fe(q.blur);e.viewport(0,0,s,l),e.uniform1i(t("uS"),0),e.uniform2i(t("uN"),s,l),e.uniform2i(t("uDir"),1,0),e.uniform1i(t("uPass"),0),b(0,p[E].tex),N(be),e.uniform2i(t("uDir"),0,1),e.uniform1i(t("uPass"),1),b(0,be.tex),N(re)}function et(){if(!v)return;let t=Oe(),r=t?t.videoWidth:v.naturalWidth||v.width,o=t?t.videoHeight:v.naturalHeight||v.height;if(!r||!o)return;let i=v;if(!t&&Math.max(r,o)>K){let k=K/Math.max(r,o),m=document.createElement("canvas");m.width=Math.round(r*k),m.height=Math.round(o*k),m.getContext("2d").drawImage(v,0,0,m.width,m.height),i=m}let h=i===v?r:i.width,g=i===v?o:i.height;if(e.activeTexture(e.TEXTURE2),!B||h!==oe||g!==ne||De!==!t){B&&e.deleteTexture(B),B=e.createTexture(),e.bindTexture(e.TEXTURE_2D,B),oe=h,ne=g,De=!t,e.texStorage2D(e.TEXTURE_2D,Math.floor(Math.log2(Math.max(oe,ne)))+1,De?e.SRGB8_ALPHA8:e.RGBA8,oe,ne),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.MIRRORED_REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.MIRRORED_REPEAT),y(qe),y(we),y(ze),y(Le);let k=Math.max(8,Math.round(oe/4)),m=Math.max(8,Math.round(ne/4));qe=w(k,m,e.RGBA16F,!0),we=w(k,m,e.RGBA16F,!0);let j=Math.max(4,Math.round(oe/16)),me=Math.max(4,Math.round(ne/16));ze=w(j,me,e.RGBA16F,!0),Le=w(j,me,e.RGBA16F,!0)}e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,B),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texSubImage2D(e.TEXTURE_2D,0,0,0,e.RGBA,e.UNSIGNED_BYTE,i),e.generateMipmap(e.TEXTURE_2D),Ie=!1,_&&pt()}function pt(){if(!B||!qe||!we||!ze||!Le)return;let t=fe(q.soft);e.uniform1i(t("uSrc"),0);let r=(o,i,h,g,k,m,j)=>{e.viewport(0,0,i.w,i.h),e.uniform2f(t("uOut"),i.w,i.h),e.uniform2f(t("uDir"),h,g),e.uniform1f(t("uLod"),k),e.uniform1i(t("uDecode"),m?1:0),e.uniform1f(t("uSigma"),j),b(0,o),N(i)};r(B,qe,1,0,2,!De,2.6),r(qe.tex,we,0,1,0,!1,2.6),r(we.tex,ze,1.5,0,0,!1,3.2),r(ze.tex,Le,0,1.5,0,!1,3.2)}function Pe(t){if(!_||!B||!re||!U||!we||!Le||!R)return!1;Nt(),Ot();let r=fe(q.look),o=a.width,i=a.height;e.viewport(0,0,o,i);let h=Math.max(o/oe,i/ne),[g,k]=ct,m=oe*h,j=ne*h,me=(o-m)*g,Be=(i-j)*k;return e.uniform4f(r("uFit"),me,Be,m,j),e.uniform2f(r("uRes"),o,i),e.uniform1f(r("uScale"),o/u),e.uniform2f(r("uGrid"),s,l),Ne||(Fe=[u*.3,d*.2]),e.uniform2f(r("uLight"),Fe[0]*o/u,Fe[1]*i/d),e.uniform1f(r("uTime"),t/1e3%1e3),e.uniform1i(r("uDecode"),De?0:1),e.uniform1i(r("uMirror"),lt?1:0),e.uniform1f(r("uLit"),He||c?1:.35),e.uniform1i(r("uLook"),0),e.uniform1i(r("uSharp"),1),e.uniform1i(r("uSoft"),2),e.uniform1i(r("uGlow"),3),e.uniform1i(r("uFilm"),4),e.uniform1i(r("uWay"),5),b(0,re.tex),b(1,B),b(2,we.tex),b(3,Le.tex),b(4,U[X].tex),b(5,R.tex),N(null),!0}function tt(t){if($=0,!ye||!Ke)return;if(!_&&!Ht()){$=requestAnimationFrame(tt);return}let r=ae<0?1/60:Math.min(.1,(t-ae)/1e3);ae>=0&&(Re.push(t-ae),Re.length>40&&Re.shift()),ae=t;let o=Oe();o&&(Ie||!Wt(o)&&!o.paused)&&et(),Re.length>=40&&[...Re].sort((me,Be)=>me-Be)[20]>21&&ke>3&&(ke=Math.max(3,Math.floor(ke*.75)),Re.length=0);let i=0,h=r;if(le>0)i=Math.min(le,80),le-=i,h=i/260;else if(ue>=0){let m=(t-ue)/1e3;Xe=J?1:Math.min(1,m/.9)*.9,m>(J?0:1.8)?(ue=-1,Xe=0,O++,Je(),J||(Q=t),se=t):(ie+=Ye(t)*r,i=Math.min(Math.floor(ie),ke),ie-=i)}else ie+=Ye(t)*r,i=Math.min(Math.floor(ie),ke),ie=Math.min(ie-i,ke);mt(i,h),i>0&&Qe(L-i,L),i>0&&dt(i/(230*ce)*(le>0?2.5:1)),(i>0||ee||o)&&Pe(t)&&(ee=!1,n.onFrame?.(t),!_e&&le<=0&&(_e=!0,requestAnimationFrame(()=>requestAnimationFrame(m=>{ye&&(Q<0&&!J&&(Q=m),n.onReady?.(),T())})))),(le>0||ue>=0||Ye(t)>0||Q<0&&!J&&!_e||!!o&&!o.paused)&&B||!_?$=requestAnimationFrame(tt):ae=-1}function T(){ye&&Ke&&!$&&($=requestAnimationFrame(tt))}function Ht(){if(A&&Se.some(t=>!e.getProgramParameter(t.prog,A.COMPLETION_STATUS_KHR)))return!1;for(let t of Se)if(!e.getProgramParameter(t.prog,e.LINK_STATUS)){let r=e.getShaderInfoLog(t.fs)||e.getProgramInfoLog(t.prog)||"link failed";return xt(new Error(`frost: ${r}`)),!1}return _=!0,Je(),B&&pt(),!0}function xt(t){ye&&(n.onFail?.(t),Lt())}let gt=t=>{t.preventDefault(),xt(new Error("frost: WebGL context lost"))};a.addEventListener("webglcontextlost",gt);let vt=t=>{let r=a.getBoundingClientRect();return[t.clientX-r.left,t.clientY-r.top]},bt=t=>{if(t.button>0||c)return;let[r,o]=vt(t);c={id:t.pointerId,x:r,y:o,px:r,py:o},Fe=[r,o],Ne=!0,a.setPointerCapture?.(t.pointerId),se=performance.now(),t.preventDefault(),T()},wt=t=>{let[r,o]=vt(t);c&&c.id===t.pointerId&&(c.x=r,c.y=o),(t.pointerType==="mouse"||c)&&(Fe=[r,o],Ne=!0,He=t.pointerType==="mouse",ee=!0,T())},yt=()=>{He&&(He=!1,ee=!0,T())},Ve=t=>{!c||c.id!==t.pointerId||(c=null,se=performance.now(),T())};a.addEventListener("pointerdown",bt),a.addEventListener("pointermove",wt),a.addEventListener("pointerup",Ve),a.addEventListener("pointercancel",Ve),a.addEventListener("pointerleave",yt);let Et=()=>{document.hidden?(cancelAnimationFrame($),$=0,ae=-1):T()};document.addEventListener("visibilitychange",Et);let Tt=new ResizeObserver(()=>{Ze(),_e&&Pe(performance.now()),T()});Tt.observe(a),Ze();function Xt(t){let r=t;if(!r.requestVideoFrameCallback){t.addEventListener("play",T);return}let o=()=>{!ye||v!==t||(Ie=!0,T(),Ce=r.requestVideoFrameCallback(o))};Ce=r.requestVideoFrameCallback(o)}function Mt(){let t=Oe();t&&(t.removeEventListener("play",T),Ce&&t.cancelVideoFrameCallback?.(Ce),Ce=0)}function St(t,r={}){Mt(),v=t,lt=!!r.mirror,Ie=!0,ct=r.focus??[.5,.5];let o=Oe();o&&Xt(o),!o||o.readyState>=2?et():o.addEventListener("loadeddata",()=>{v===o&&(et(),ee=!0,T())},{once:!0}),ee=!0,T()}function Lt(){if(ye&&(ye=!1,cancelAnimationFrame($),Mt(),Tt.disconnect(),document.removeEventListener("visibilitychange",Et),a.removeEventListener("webglcontextlost",gt),a.removeEventListener("pointerdown",bt),a.removeEventListener("pointermove",wt),a.removeEventListener("pointerup",Ve),a.removeEventListener("pointercancel",Ve),a.removeEventListener("pointerleave",yt),!e.isContextLost())){for(let t of[...We])y(t);e.deleteTexture(B),e.deleteBuffer(ve),e.deleteVertexArray(ge);for(let t of Se)e.deleteProgram(t.prog);for(let t of f)e.deleteShader(t);e.getExtension("WEBGL_lose_context")?.loseContext()}}return n.source&&St(n.source,{mirror:n.mirror,focus:n.focus}),T(),{setSource:St,setCold(t){Z=Ee(t,...kt),_&&p&&ft(!1),se=performance.now(),T()},get cold(){return Z},thaw(){ue<0&&_&&(ue=performance.now(),se=ue,T())},touch(t,r=0){if(t===null){c?.id===-1&&(c=null),se=performance.now(),T();return}c&&c.id===-1?(c.x=t,c.y=r):c||(c={id:-1,x:t,y:r,px:t,py:r}),Fe=[t,r],Ne=!0,se=performance.now(),T()},setStill(t){t!==J&&(J=t,t&&Q>=0&&performance.now()-Q<8e3&&(le=Math.round(4e3*ce)),ee=!0,T())},setActive(t){Ke=t,t?(ee=!0,T()):(cancelAnimationFrame($),$=0,ae=-1)},setPixelRatio(t){P=t,Ze(),_e&&Pe(performance.now()),T()},get grid(){return[s,l]},get steps(){return L},advance(t){if(_){for(let r=0;r<t;r+=50){let o=Math.min(50,t-r);mt(o,o/260),Qe(L-o,L),dt(o/(230*ce))}Pe(performance.now())}},read(){if(!p)return null;let t=new Float32Array(s*l*4);return e.bindFramebuffer(e.FRAMEBUFFER,p[E].fbo),e.readPixels(0,0,s,l,e.RGBA,e.FLOAT,t),e.bindFramebuffer(e.FRAMEBUFFER,null),t},snapshot(t="image/png",r){return Pe(performance.now()),new Promise(o=>a.toBlob(o,t,r))},dispose:Lt}}async function Dt(n="user"){let a=await navigator.mediaDevices.getUserMedia({audio:!1,video:{facingMode:n,width:{ideal:1920},height:{ideal:1080}}}),e=document.createElement("video");e.muted=!0,e.playsInline=!0,e.srcObject=a;try{await e.play()}catch(f){throw a.getTracks().forEach(F=>F.stop()),f}let A=a.getVideoTracks()[0]?.getSettings().facingMode;return{video:e,mirror:(A??n)!=="environment",stop(){a.getTracks().forEach(f=>f.stop()),e.srcObject=null}}}function Ee(n,a,e){return Math.min(e,Math.max(a,n))}var Me=new URLSearchParams(location.search),D=document.querySelector("#frost"),pe=D.querySelector("canvas"),qt=D.querySelector(".fr-finger"),rt=D.querySelector(".fr-note"),nt=D.querySelector(".fr-cold input"),Ct=D.querySelector("output"),_t=[...D.querySelectorAll("[data-source]")],it=D.querySelector(".fr-flip"),at=matchMedia("(prefers-reduced-motion: reduce)"),ir=matchMedia("(max-width: 700px)").matches,$e=ir?[.5,.5]:[.5,.52],st=Number(Me.get("cold")??-9),Pt=n=>`${n<0?"\u2212":""}${Math.abs(n).toFixed(1)} \xB0C`,S=null,xe=null,Ge=null,Te=D.querySelector(".fr-photo");Me.has("photo")&&(D.querySelector(".fr-pic source")?.remove(),Te.src=Me.get("photo"));nt.value=String(st);Ct.textContent=Pt(st);function ut(n){for(let a of _t)a.setAttribute("aria-pressed",String(a.dataset.source===n))}function je(n){rt.textContent=n,n&&setTimeout(()=>{rt.textContent===n&&(rt.textContent="")},4e3)}function Ue(){xe?.stop(),xe=null,it.hidden=!0,Ge&&(URL.revokeObjectURL(Ge),Ge=null)}try{S=At({canvas:pe,cold:st,focus:$e,seed:Me.has("seed")?Number(Me.get("seed")):void 0,still:Me.has("still")||at.matches,onReady:()=>{D.dataset.gl="on"},onFail:()=>{D.dataset.gl="off",S=null,Ue()}}),Te.decode().then(()=>{S?.setSource(Te,{focus:$e}),Te.addEventListener("load",()=>{S&&!xe&&!Ge&&Te.complete&&S.setSource(Te,{focus:$e})})},()=>je("The photo didn't load"))}catch{D.dataset.gl="off"}at.addEventListener("change",()=>S?.setStill(at.matches));Me.has("debug")&&Object.assign(window,{frost:S});function Bt(){Ue(),S?.setSource(Te,{focus:$e}),ut("photo")}async function Gt(n){if(S)try{let a=await Dt(n);if(!S){a.stop();return}Ue(),xe=a,S.setSource(a.video,{mirror:a.mirror}),ut("camera"),navigator.mediaDevices.enumerateDevices?.().then(e=>{it.hidden=!xe||e.filter(A=>A.kind==="videoinput").length<2},()=>{})}catch{je("No camera, or it wasn't allowed")}}for(let n of _t)n.addEventListener("click",()=>{n.dataset.source==="photo"||xe?Bt():Gt("user")});it.addEventListener("click",()=>{Gt(xe?.mirror?"environment":"user")});D.querySelector(".fr-file input").addEventListener("change",n=>{let a=n.target.files?.[0];if(!a||!S)return;let e=URL.createObjectURL(a),A=f=>{Ue(),Ge=e,S.setSource(f),ut("")};if(a.type.startsWith("video/")){let f=document.createElement("video");f.muted=!0,f.loop=!0,f.playsInline=!0,f.src=e,f.play().then(()=>A(f),()=>{URL.revokeObjectURL(e),je("That video won't play here")})}else{let f=new Image;f.src=e,f.decode().then(()=>A(f),()=>{URL.revokeObjectURL(e),je("That file isn't a picture")})}});nt.addEventListener("input",()=>{let n=Number(nt.value);S?.setCold(n),Ct.textContent=Pt(n)});D.querySelector(".fr-thaw").addEventListener("click",()=>S?.thaw());var H=null;function zt(n,a){return H??={x:0,y:0,down:!1},H.x=Math.min(pe.clientWidth,Math.max(0,n)),H.y=Math.min(pe.clientHeight,Math.max(0,a)),qt.style.left=`${H.x}px`,qt.style.top=`${H.y}px`,H.down&&S?.touch(H.x,H.y),H}var ot={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};pe.addEventListener("keydown",n=>{if(!S)return;let a=H??zt(pe.clientWidth/2,pe.clientHeight/2);ot[n.key]?(n.preventDefault(),zt(a.x+ot[n.key][0],a.y+ot[n.key][1])):(n.key===" "||n.key==="Enter")&&!n.repeat&&(n.preventDefault(),a.down=!0,S.touch(a.x,a.y))});var Ut=()=>{H?.down&&(H.down=!1,S?.touch(null))};pe.addEventListener("keyup",n=>{(n.key===" "||n.key==="Enter")&&Ut()});pe.addEventListener("blur",Ut);D.querySelector(".fr-save").addEventListener("click",async()=>{let n=await S?.snapshot("image/jpeg",.92);if(!n)return;let a=document.createElement("a");a.href=URL.createObjectURL(n),a.download="frost.jpg",a.click(),setTimeout(()=>URL.revokeObjectURL(a.href),1e3)});addEventListener("pagehide",Ue);document.addEventListener("visibilitychange",()=>{document.hidden&&xe&&Bt()});

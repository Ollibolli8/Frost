var It={dx:.03,dt:1e-4,tau:2e-4,eps:.01,delta:.045,sym:6,latent:1.9,alpha:.9,gamma:10,melt:1,noise:.02,cool:0},Y={warm:12,fade:1.4,warmth:3,thaw:10,dry:.22,film:14,filmMelt:16},wt=[-20,-2];function Wt(n){let a=Fe((-n-2)/18,0,1);return{frame:.25-.65*a,middle:.5-.6*a,foot:.08}}function Ot(n){return .5+.45*Fe((-n-2)/18,0,1)}function Gt(n){let a=n>>>0;return()=>{a=a+1831565813>>>0;let e=Math.imul(a^a>>>15,1|a);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function yt(n,a,e){let p=Gt(e),l=[],Q=()=>p()*Math.PI/3,ce=(u,g)=>{for(let x=0;x<u;x++){let[be,Ge]=g((x+.5+(p()-.5)*.7)/u);l.push({x:be,y:Ge,r:2.5+p()*1.5,angle:Q(),frame:!0})}},D=Math.min(n,a);ce(Math.max(4,Math.round(n/(D*.085))),u=>[u*n,1.5]),ce(Math.max(2,Math.round(a/(D*.16))),u=>[1.5,(.06+u*.88)*a]),ce(Math.max(2,Math.round(a/(D*.18))),u=>[n-1.5,(.1+u*.82)*a]),ce(Math.max(2,Math.round(n/(D*.24))),u=>[(.12+u*.8)*n,a-1.5]);for(let u=0;u<3;u++){let g=p()*Math.PI*2,x=.28+p()*.12;l.push({x:n*(.5+Math.cos(g)*x),y:a*(.5+Math.sin(g)*x*.9),r:2,angle:Q(),frame:!1})}let P=p()<.5,ee=n*(.16+p()*.08),S=.32+p()*.2,te=n*(P?.16:.84),re=a*(.74+p()*.08),oe={ax:te,ay:re,bx:te+(P?1:-1)*ee*Math.cos(S),by:re-ee*Math.sin(S),angle:S},L=Math.min(60-l.length,Math.max(4,Math.round(ee/9)));for(let u=0;u<L;u++){let g=(u+.5+(p()-.5)*.5)/L;l.push({x:te+(oe.bx-te)*g,y:re+(oe.by-re)*g,r:1.6+p(),angle:S+(p()-.5)*.3,frame:!1})}return{seeds:l.slice(0,60),scratch:oe}}var Nt=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,xe=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
`,_=It,E=n=>Number.isInteger(n)?n.toFixed(1):String(n),Bt=xe+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uA;    // cos \u03B80, sin \u03B80 (the crystal's turn), pinned (a seed on the frame), the glass's temperature
uniform ivec2 uN;
uniform uint uStep;
uniform float uStepSec;  // real seconds this step stands for
uniform vec4 uSeg;       // the finger's path over this step, a to b, in cells
uniform float uRad;      // its radius, cells
uniform float uPress;
uniform float uThaw;     // warmth everywhere (thawing the whole window)
const float DX = ${E(_.dx)}, DT = ${E(_.dt)}, TAU = ${E(_.tau)}, EB = ${E(_.eps)}, DELTA = ${E(_.delta)};
const float K = ${E(_.latent)}, ALPHA = ${E(_.alpha)}, GAMMA = ${E(_.gamma)}, TM = ${E(_.melt)}, NOISE = ${E(_.noise)}, COOL = ${E(_.cool)};
const float RISE = ${E(Y.warm)}, FADE = ${E(Y.fade)}, WMAX = ${E(Y.warmth)}, THAW = ${E(Y.thaw)}, DRY = ${E(Y.dry)};

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
}`,Ht=xe+`
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
}`,Xt=xe+`
uniform sampler2D uS;    // p, T, W, water
uniform sampler2D uF;    // the film before: thickness, wet
uniform sampler2D uA;    // the glass's temperature in .w
uniform float uDt;       // seconds of the ice's time since the last
uniform float uThaw;
uniform float uMax;      // how thick it grows at this cold
const float GROW = ${E(Y.film)}, MELT = ${E(Y.filmMelt)}, DRY = ${E(Y.dry)};
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
}`,Vt=xe+`
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
}`,$t=xe+`
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
}`,jt=xe+`
uniform sampler2D uLook;   // p, thickness, water, warmth (grid)
uniform sampler2D uFilm;   // the frost film, the wet it left (grid)
uniform sampler2D uSharp;  // the photo (sRGB, mipmapped) or a video frame
uniform sampler2D uSoft;   // the photo out of focus
uniform sampler2D uGlow;   // the photo scattered
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
  vec3 col = direct;
  col += back * tint * (filmOp * 0.55 * (0.85 + 0.3 * hash(floor(hp * 0.5))) + iceOp * (0.6 + 0.9 * th) * sugar);
  col += back * tint * side * 0.95;
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
}`;function Et(n){let a=n.canvas,e=a.getContext("webgl2",{antialias:!1,alpha:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!e)throw new Error("no WebGL 2");if(!e.getExtension("EXT_color_buffer_float"))throw new Error("no float render targets");let p=e.getExtension("KHR_parallel_shader_compile"),l=[],Q=(t,r)=>{let o=e.createShader(t);return e.shaderSource(o,r),e.compileShader(o),l.push(o),o},ce=Q(e.VERTEX_SHADER,Nt),D=t=>{let r=e.createProgram(),o=Q(e.FRAGMENT_SHADER,t);return e.attachShader(r,ce),e.attachShader(r,o),e.bindAttribLocation(r,0,"p"),e.linkProgram(r),{prog:r,fs:o,u:new Map}},P={init:D(Ht),step:D(Bt),film:D(Xt),blur:D(Vt),soft:D($t),look:D(jt)},ee=Object.values(P),S=!1,te=e.createVertexArray();e.bindVertexArray(te);let re=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,re),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let ve=e.getParameter(e.MAX_TEXTURE_SIZE),oe=new Set,L=(t,r,o,i)=>{let f=e.createTexture();e.bindTexture(e.TEXTURE_2D,f),e.texStorage2D(e.TEXTURE_2D,1,o,t,r);let d=i?e.LINEAR:e.NEAREST;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,d),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,d),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let y=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,y),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,f,0),e.bindFramebuffer(e.FRAMEBUFFER,null);let c={tex:f,fbo:y,w:t,h:r};return oe.add(c),c},u=t=>{t&&(e.deleteTexture(t.tex),e.deleteFramebuffer(t.fbo),oe.delete(t))},g=1,x=1,be=n.pixelRatio??Math.min(window.devicePixelRatio||1,2),Ge=()=>Math.min(g,x)<560||matchMedia("(pointer: coarse)").matches,m=0,h=0,k=0,we=0,le=0,w=null,O=null,ye=null,fe=null,q=null,Ne=n.seed??7,_e=Fe(n.cold??-9,...wt),Be=yt(1,1,Ne),R=null,F=null,G=0,N=0,Ee=!0,ot=!!n.mirror,Pe=!1,nt=n.focus??[.5,.5],Te=null,ne=null,Me=null,me=null,Se=0,Ce=()=>R instanceof HTMLVideoElement?R:null,_t=t=>typeof t.requestVideoFrameCallback=="function",z=!!n.still,ae=!0,He=!0,C=0,B=-1,Le=!1,H=0,he=18,I=-1,X=-1,de=[],s=null,pe=[0,0],Ue=!1,qe=!1,V=-1,ze=0,$=0,ie=1,W=!0;function Xe(t){if(V>=0)return 260*ie;if(I<0)return 0;let r=(t-I)/1e3,o=(t-X)/1e3,i=s||o<6;if(z)return i?260:0;let f=900*Math.exp(-r/2.4),d=r<45?1:Math.max(0,1-(r-45)/20);return ie*Math.max(f+230*d,i?260:0,o<40?230:0)}function Ve(){let t=a.getBoundingClientRect();g=Math.max(1,t.width),x=Math.max(1,t.height);let r=Math.round(g*be),o=Math.round(x*be);(a.width!==r||a.height!==o)&&(a.width=r,a.height=o);let i=g/x,f=m/Math.max(1,h);(!w||Math.abs(Math.log(i/f))>.18)&&Pt(),W=!0}function Pt(){let t=n.cells??Math.round(Ge()?Math.min(52e4,g*x*1.6):Fe(g*x*.72,3e5,9e5));m=Math.max(32,Math.min(ve,Math.round(Math.sqrt(t*g/x)))),h=Math.max(32,Math.min(ve,Math.round(t/m))),w&&(u(w[0]),u(w[1])),q&&(u(q[0]),u(q[1])),u(O),u(ye),u(fe),w=[L(m,h,e.RGBA32F,!1),L(m,h,e.RGBA32F,!1)],q=[L(m,h,e.RG16F,!0),L(m,h,e.RG16F,!0)],O=L(m,h,e.RGBA16F,!1),ye=L(m,h,e.RGBA16F,!1),fe=L(m,h,e.RGBA16F,!0),we=0,k=0,le=0,ie=Math.sqrt(m*h/52e4),S&&$e()}function $e(){!w||!O||(Be=yt(m,h,Ne),at(!0),I=-1,we=0,H=0,z&&($=Math.round(5200*ie)))}function at(t){let r=ge(P.init),o=new Float32Array(240),i=new Float32Array(60);Be.seeds.forEach((d,y)=>{o.set([d.x,d.y,d.r,d.angle],y*4),i[y]=d.frame?1:0}),e.uniform4fv(r("uSeeds"),o),e.uniform1fv(r("uFrame"),i),e.uniform1i(r("uCount"),Be.seeds.length),e.uniform2i(r("uN"),m,h);let f=Wt(_e);e.uniform3f(r("uCold"),f.frame,f.middle,f.foot),e.viewport(0,0,m,h),e.uniform1i(r("uKeep"),0),e.uniform1i(r("uPrev"),0),T(0,w[k].tex),e.uniform1i(r("uMode"),1),j(O),t&&(e.uniform1i(r("uMode"),0),e.uniform1i(r("uKeep"),we>0?1:0),T(0,w[k].tex),j(w[1-k]),k=1-k)}function ge(t){return e.useProgram(t.prog),r=>{let o=t.u.get(r);return o===void 0&&(o=e.getUniformLocation(t.prog,r),t.u.set(r,o)),o}}function j(t){e.bindFramebuffer(e.FRAMEBUFFER,t?t.fbo:null),e.drawArrays(e.TRIANGLES,0,3)}function T(t,r){e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r)}function it(t,r){if(!w||!O||t<=0)return;let o=ge(P.step);e.viewport(0,0,m,h),e.uniform1i(o("uS"),0),e.uniform1i(o("uA"),1),e.uniform2i(o("uN"),m,h),e.uniform1f(o("uStepSec"),r/t),e.uniform1f(o("uThaw"),ze);let i=m/g,f=h/x;e.uniform1f(o("uRad"),Math.max(26,Math.min(g,x)*.05)*i),T(1,O.tex);for(let d=0;d<t;d++){if(s){let y=d/t,c=(d+1)/t,U=s.px+(s.x-s.px)*y,K=s.py+(s.y-s.py)*y,ke=s.px+(s.x-s.px)*c,zt=s.py+(s.y-s.py)*c;e.uniform4f(o("uSeg"),U*i,(x-K)*f,ke*i,(x-zt)*f),e.uniform1f(o("uPress"),1)}else e.uniform1f(o("uPress"),0);e.uniform1ui(o("uStep"),we++),T(0,w[k].tex),j(w[1-k]),k=1-k}s&&(s.px=s.x,s.py=s.y)}function st(t){if(!w||!O||!q||t<=0)return;let r=ge(P.film);e.viewport(0,0,m,h),e.uniform1i(r("uS"),0),e.uniform1i(r("uF"),1),e.uniform1i(r("uA"),2),e.uniform1f(r("uDt"),t),e.uniform1f(r("uThaw"),ze),e.uniform1f(r("uMax"),Ot(_e)),T(0,w[k].tex),T(1,q[le].tex),T(2,O.tex),j(q[1-le]),le=1-le}function Ct(){if(!w||!ye||!fe)return;let t=ge(P.blur);e.viewport(0,0,m,h),e.uniform1i(t("uS"),0),e.uniform2i(t("uN"),m,h),e.uniform2i(t("uDir"),1,0),e.uniform1i(t("uPass"),0),T(0,w[k].tex),j(ye),e.uniform2i(t("uDir"),0,1),e.uniform1i(t("uPass"),1),T(0,ye.tex),j(fe)}function je(){if(!R)return;let t=Ce(),r=t?t.videoWidth:R.naturalWidth||R.width,o=t?t.videoHeight:R.naturalHeight||R.height;if(!r||!o)return;let i=R;if(!t&&Math.max(r,o)>ve){let y=ve/Math.max(r,o),c=document.createElement("canvas");c.width=Math.round(r*y),c.height=Math.round(o*y),c.getContext("2d").drawImage(R,0,0,c.width,c.height),i=c}let f=i===R?r:i.width,d=i===R?o:i.height;if(e.activeTexture(e.TEXTURE2),!F||f!==G||d!==N||Ee!==!t){F&&e.deleteTexture(F),F=e.createTexture(),e.bindTexture(e.TEXTURE_2D,F),G=f,N=d,Ee=!t,e.texStorage2D(e.TEXTURE_2D,Math.floor(Math.log2(Math.max(G,N)))+1,Ee?e.SRGB8_ALPHA8:e.RGBA8,G,N),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.MIRRORED_REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.MIRRORED_REPEAT),u(Te),u(ne),u(Me),u(me);let y=Math.max(8,Math.round(G/4)),c=Math.max(8,Math.round(N/4));Te=L(y,c,e.RGBA16F,!0),ne=L(y,c,e.RGBA16F,!0);let U=Math.max(4,Math.round(G/16)),K=Math.max(4,Math.round(N/16));Me=L(U,K,e.RGBA16F,!0),me=L(U,K,e.RGBA16F,!0)}e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,F),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texSubImage2D(e.TEXTURE_2D,0,0,0,e.RGBA,e.UNSIGNED_BYTE,i),e.generateMipmap(e.TEXTURE_2D),Pe=!1,S&&ut()}function ut(){if(!F||!Te||!ne||!Me||!me)return;let t=ge(P.soft);e.uniform1i(t("uSrc"),0);let r=(o,i,f,d,y,c,U)=>{e.viewport(0,0,i.w,i.h),e.uniform2f(t("uOut"),i.w,i.h),e.uniform2f(t("uDir"),f,d),e.uniform1f(t("uLod"),y),e.uniform1i(t("uDecode"),c?1:0),e.uniform1f(t("uSigma"),U),T(0,o),j(i)};r(F,Te,1,0,2,!Ee,2.6),r(Te.tex,ne,0,1,0,!1,2.6),r(ne.tex,Me,1.5,0,0,!1,3.2),r(Me.tex,me,0,1.5,0,!1,3.2)}function Re(t){if(!S||!F||!fe||!q||!ne||!me)return!1;Ct();let r=ge(P.look),o=a.width,i=a.height;e.viewport(0,0,o,i);let f=Math.max(o/G,i/N),[d,y]=nt,c=G*f,U=N*f,K=(o-c)*d,ke=(i-U)*y;return e.uniform4f(r("uFit"),K,ke,c,U),e.uniform2f(r("uRes"),o,i),e.uniform1f(r("uScale"),o/g),e.uniform2f(r("uGrid"),m,h),Ue||(pe=[g*.3,x*.2]),e.uniform2f(r("uLight"),pe[0]*o/g,pe[1]*i/x),e.uniform1f(r("uTime"),t/1e3%1e3),e.uniform1i(r("uDecode"),Ee?0:1),e.uniform1i(r("uMirror"),ot?1:0),e.uniform1f(r("uLit"),qe||s?1:.35),e.uniform1i(r("uLook"),0),e.uniform1i(r("uSharp"),1),e.uniform1i(r("uSoft"),2),e.uniform1i(r("uGlow"),3),e.uniform1i(r("uFilm"),4),T(0,fe.tex),T(1,F),T(2,ne.tex),T(3,me.tex),T(4,q[le].tex),j(null),!0}function Ke(t){if(C=0,!ae||!He)return;if(!S&&!Ut()){C=requestAnimationFrame(Ke);return}let r=B<0?1/60:Math.min(.1,(t-B)/1e3);B>=0&&(de.push(t-B),de.length>40&&de.shift()),B=t;let o=Ce();o&&(Pe||!_t(o)&&!o.paused)&&je(),de.length>=40&&[...de].sort((K,ke)=>K-ke)[20]>21&&he>3&&(he=Math.max(3,Math.floor(he*.75)),de.length=0);let i=0,f=r;if($>0)i=Math.min($,80),$-=i,f=i/260;else if(V>=0){let c=(t-V)/1e3;ze=z?1:Math.min(1,c/.9)*.9,c>(z?0:1.8)?(V=-1,ze=0,Ne++,$e(),z||(I=t),X=t):(H+=Xe(t)*r,i=Math.min(Math.floor(H),he),H-=i)}else H+=Xe(t)*r,i=Math.min(Math.floor(H),he),H=Math.min(H-i,he);it(i,f),i>0&&st(i/(230*ie)*($>0?2.5:1)),(i>0||W||o)&&Re(t)&&(W=!1,n.onFrame?.(t),!Le&&$<=0&&(Le=!0,requestAnimationFrame(()=>requestAnimationFrame(c=>{ae&&(I<0&&!z&&(I=c),n.onReady?.(),v())})))),($>0||V>=0||Xe(t)>0||I<0&&!z&&!Le||!!o&&!o.paused)&&F||!S?C=requestAnimationFrame(Ke):B=-1}function v(){ae&&He&&!C&&(C=requestAnimationFrame(Ke))}function Ut(){if(p&&ee.some(t=>!e.getProgramParameter(t.prog,p.COMPLETION_STATUS_KHR)))return!1;for(let t of ee)if(!e.getProgramParameter(t.prog,e.LINK_STATUS)){let r=e.getShaderInfoLog(t.fs)||e.getProgramInfoLog(t.prog)||"link failed";return ct(new Error(`frost: ${r}`)),!1}return S=!0,$e(),F&&ut(),!0}function ct(t){ae&&(n.onFail?.(t),bt())}let lt=t=>{t.preventDefault(),ct(new Error("frost: WebGL context lost"))};a.addEventListener("webglcontextlost",lt);let ft=t=>{let r=a.getBoundingClientRect();return[t.clientX-r.left,t.clientY-r.top]},mt=t=>{if(t.button>0||s)return;let[r,o]=ft(t);s={id:t.pointerId,x:r,y:o,px:r,py:o},pe=[r,o],Ue=!0,a.setPointerCapture?.(t.pointerId),X=performance.now(),t.preventDefault(),v()},ht=t=>{let[r,o]=ft(t);s&&s.id===t.pointerId&&(s.x=r,s.y=o),(t.pointerType==="mouse"||s)&&(pe=[r,o],Ue=!0,qe=t.pointerType==="mouse",W=!0,v())},dt=()=>{qe&&(qe=!1,W=!0,v())},Ie=t=>{!s||s.id!==t.pointerId||(s=null,X=performance.now(),v())};a.addEventListener("pointerdown",mt),a.addEventListener("pointermove",ht),a.addEventListener("pointerup",Ie),a.addEventListener("pointercancel",Ie),a.addEventListener("pointerleave",dt);let pt=()=>{document.hidden?(cancelAnimationFrame(C),C=0,B=-1):v()};document.addEventListener("visibilitychange",pt);let gt=new ResizeObserver(()=>{Ve(),Le&&Re(performance.now()),v()});gt.observe(a),Ve();function qt(t){let r=t;if(!r.requestVideoFrameCallback){t.addEventListener("play",v);return}let o=()=>{!ae||R!==t||(Pe=!0,v(),Se=r.requestVideoFrameCallback(o))};Se=r.requestVideoFrameCallback(o)}function xt(){let t=Ce();t&&(t.removeEventListener("play",v),Se&&t.cancelVideoFrameCallback?.(Se),Se=0)}function vt(t,r={}){xt(),R=t,ot=!!r.mirror,Pe=!0,nt=r.focus??[.5,.5];let o=Ce();o&&qt(o),!o||o.readyState>=2?je():o.addEventListener("loadeddata",()=>{R===o&&(je(),W=!0,v())},{once:!0}),W=!0,v()}function bt(){if(ae&&(ae=!1,cancelAnimationFrame(C),xt(),gt.disconnect(),document.removeEventListener("visibilitychange",pt),a.removeEventListener("webglcontextlost",lt),a.removeEventListener("pointerdown",mt),a.removeEventListener("pointermove",ht),a.removeEventListener("pointerup",Ie),a.removeEventListener("pointercancel",Ie),a.removeEventListener("pointerleave",dt),!e.isContextLost())){for(let t of[...oe])u(t);e.deleteTexture(F),e.deleteBuffer(re),e.deleteVertexArray(te);for(let t of ee)e.deleteProgram(t.prog);for(let t of l)e.deleteShader(t);e.getExtension("WEBGL_lose_context")?.loseContext()}}return n.source&&vt(n.source,{mirror:n.mirror,focus:n.focus}),v(),{setSource:vt,setCold(t){_e=Fe(t,...wt),S&&w&&at(!1),X=performance.now(),v()},get cold(){return _e},thaw(){V<0&&S&&(V=performance.now(),X=V,v())},touch(t,r=0){if(t===null){s?.id===-1&&(s=null),X=performance.now(),v();return}s&&s.id===-1?(s.x=t,s.y=r):s||(s={id:-1,x:t,y:r,px:t,py:r}),pe=[t,r],Ue=!0,X=performance.now(),v()},setStill(t){t!==z&&(z=t,t&&I>=0&&performance.now()-I<8e3&&($=Math.round(4e3*ie)),W=!0,v())},setActive(t){He=t,t?(W=!0,v()):(cancelAnimationFrame(C),C=0,B=-1)},setPixelRatio(t){be=t,Ve(),Le&&Re(performance.now()),v()},get grid(){return[m,h]},get steps(){return we},advance(t){if(S){for(let r=0;r<t;r+=50){let o=Math.min(50,t-r);it(o,o/260),st(o/(230*ie))}Re(performance.now())}},read(){if(!w)return null;let t=new Float32Array(m*h*4);return e.bindFramebuffer(e.FRAMEBUFFER,w[k].fbo),e.readPixels(0,0,m,h,e.RGBA,e.FLOAT,t),e.bindFramebuffer(e.FRAMEBUFFER,null),t},snapshot(t="image/png",r){return Re(performance.now()),new Promise(o=>a.toBlob(o,t,r))},dispose:bt}}async function Tt(n="user"){let a=await navigator.mediaDevices.getUserMedia({audio:!1,video:{facingMode:n,width:{ideal:1920},height:{ideal:1080}}}),e=document.createElement("video");e.muted=!0,e.playsInline=!0,e.srcObject=a;try{await e.play()}catch(l){throw a.getTracks().forEach(Q=>Q.stop()),l}let p=a.getVideoTracks()[0]?.getSettings().facingMode;return{video:e,mirror:(p??n)!=="environment",stop(){a.getTracks().forEach(l=>l.stop()),e.srcObject=null}}}function Fe(n,a,e){return Math.min(e,Math.max(a,n))}var ue=new URLSearchParams(location.search),M=document.querySelector("#frost"),Z=M.querySelector("canvas"),Mt=M.querySelector(".fr-finger"),Ye=M.querySelector(".fr-note"),Je=M.querySelector(".fr-cold input"),Lt=M.querySelector("output"),Rt=[...M.querySelectorAll("[data-source]")],et=M.querySelector(".fr-flip"),Qe=matchMedia("(prefers-reduced-motion: reduce)"),Kt=matchMedia("(max-width: 700px)").matches,We=Kt?[.5,.5]:[.5,.52],tt=Number(ue.get("cold")??-9),kt=n=>`${n<0?"\u2212":""}${Math.abs(n).toFixed(1)} \xB0C`,b=null,J=null,Ae=null,se=M.querySelector(".fr-photo");ue.has("photo")&&(M.querySelector(".fr-pic source")?.remove(),se.src=ue.get("photo"));Je.value=String(tt);Lt.textContent=kt(tt);function rt(n){for(let a of Rt)a.setAttribute("aria-pressed",String(a.dataset.source===n))}function Oe(n){Ye.textContent=n,n&&setTimeout(()=>{Ye.textContent===n&&(Ye.textContent="")},4e3)}function De(){J?.stop(),J=null,et.hidden=!0,Ae&&(URL.revokeObjectURL(Ae),Ae=null)}try{b=Et({canvas:Z,cold:tt,focus:We,seed:ue.has("seed")?Number(ue.get("seed")):void 0,still:ue.has("still")||Qe.matches,onReady:()=>{M.dataset.gl="on"},onFail:()=>{M.dataset.gl="off",b=null,De()}}),se.decode().then(()=>{b?.setSource(se,{focus:We}),se.addEventListener("load",()=>{b&&!J&&!Ae&&se.complete&&b.setSource(se,{focus:We})})},()=>Oe("The photo didn't load"))}catch{M.dataset.gl="off"}Qe.addEventListener("change",()=>b?.setStill(Qe.matches));ue.has("debug")&&Object.assign(window,{frost:b});function Ft(){De(),b?.setSource(se,{focus:We}),rt("photo")}async function At(n){if(b)try{let a=await Tt(n);if(!b){a.stop();return}De(),J=a,b.setSource(a.video,{mirror:a.mirror}),rt("camera"),navigator.mediaDevices.enumerateDevices?.().then(e=>{et.hidden=!J||e.filter(p=>p.kind==="videoinput").length<2},()=>{})}catch{Oe("No camera, or it wasn't allowed")}}for(let n of Rt)n.addEventListener("click",()=>{n.dataset.source==="photo"||J?Ft():At("user")});et.addEventListener("click",()=>{At(J?.mirror?"environment":"user")});M.querySelector(".fr-file input").addEventListener("change",n=>{let a=n.target.files?.[0];if(!a||!b)return;let e=URL.createObjectURL(a),p=l=>{De(),Ae=e,b.setSource(l),rt("")};if(a.type.startsWith("video/")){let l=document.createElement("video");l.muted=!0,l.loop=!0,l.playsInline=!0,l.src=e,l.play().then(()=>p(l),()=>{URL.revokeObjectURL(e),Oe("That video won't play here")})}else{let l=new Image;l.src=e,l.decode().then(()=>p(l),()=>{URL.revokeObjectURL(e),Oe("That file isn't a picture")})}});Je.addEventListener("input",()=>{let n=Number(Je.value);b?.setCold(n),Lt.textContent=kt(n)});M.querySelector(".fr-thaw").addEventListener("click",()=>b?.thaw());var A=null;function St(n,a){return A??={x:0,y:0,down:!1},A.x=Math.min(Z.clientWidth,Math.max(0,n)),A.y=Math.min(Z.clientHeight,Math.max(0,a)),Mt.style.left=`${A.x}px`,Mt.style.top=`${A.y}px`,A.down&&b?.touch(A.x,A.y),A}var Ze={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};Z.addEventListener("keydown",n=>{if(!b)return;let a=A??St(Z.clientWidth/2,Z.clientHeight/2);Ze[n.key]?(n.preventDefault(),St(a.x+Ze[n.key][0],a.y+Ze[n.key][1])):(n.key===" "||n.key==="Enter")&&!n.repeat&&(n.preventDefault(),a.down=!0,b.touch(a.x,a.y))});var Dt=()=>{A?.down&&(A.down=!1,b?.touch(null))};Z.addEventListener("keyup",n=>{(n.key===" "||n.key==="Enter")&&Dt()});Z.addEventListener("blur",Dt);M.querySelector(".fr-save").addEventListener("click",async()=>{let n=await b?.snapshot("image/jpeg",.92);if(!n)return;let a=document.createElement("a");a.href=URL.createObjectURL(n),a.download="frost.jpg",a.click(),setTimeout(()=>URL.revokeObjectURL(a.href),1e3)});addEventListener("pagehide",De);document.addEventListener("visibilitychange",()=>{document.hidden&&J&&Ft()});

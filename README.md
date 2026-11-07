# Frost

A window freezing over. Ice ferns grow in from its frame and from a scratch in the glass, and the glass fogs between
them. Hold a finger on it, or draw: it melts clear, and the ice grows back in from the edge. Behind the glass is
Nyhavn on a snowy evening, or your own photo, video or camera.

**[Live demo](https://ollibolli8.github.io/Frost/)** · Maquette 07 on [work.draindk.tech](https://work.draindk.tech/lab/frost/)

One TypeScript file, no dependencies: WebGL 2 and eight fragment shaders, about 34 KB minified (13 KB gzipped).

## How it works

- **The ice** is Kobayashi's phase field for a growing crystal (R. Kobayashi, *Physica D* 63, 410, 1993), stepped
  on the GPU: each cell of a grid holds how much of it is ice (*p*) and its temperature (*T*). The ice grows where the
  glass is below the melting point, fastest where it is coldest, and freezing gives off latent heat that slows the
  growth round it, so the edge breaks up into arms and the arms into side branches. Its edge prefers six directions,
  ε = ε̄(1 + δ cos 6(θ − θ₀)), the sixfold of ice, with θ₀ each crystal's own turn; the shader takes the sixfold terms
  from the edge's normal as a complex number raised to the sixth power, with no trig. The constants (τ 2·10⁻⁴,
  ε̄ 0.01, δ 0.045, K 2.2, and a little noise at the edge, 0.04) grow the ferns: thin stems with dense side
  branches. The stencil is the 13 cells of a
  radius-2 cross and its diagonals, in 32-bit floats (a step moves *p* by less than half precision holds).
- **A cell to a pixel**: a fern's needles are a few cells across, so the grid is about one cell to a CSS pixel (up
  to 900,000 cells on a desktop; on a phone about 1.6 to a CSS pixel, up to 520,000, so its smaller window still
  holds fine ferns). A finer grid takes more steps to cover the same share of the
  window, so the steps a second scale with it and every screen sees the same window freeze.
- **Where it starts**: seeds along the frame (densest at its foot, where cold air runs down the glass), a row of
  nuclei along a scratch high on one side, and three specks of dust, each crystal turned its own way. The glass is
  coldest at its frame and its foot and warmest in its middle (`coldField`), so the ferns reach in from the edges and
  the middle stays clearest. The latent heat stays in the glass, so the ice stops by itself once it has covered as much
  as the cold allows; the dial (−20 to −2 °C) sets how far.
- **The fog**: between the ferns a film of hoar forms over the dry glass, unevenly, in drifts, thinner in the warm
  middle and stopping short of each fern, which has taken the vapour round it. It softens and lifts the street behind
  it.
- **A finger**: a finger, a pen or the mouse held on the glass warms it (*W*). The warmth spreads a little and fades
  once it lets go. Glass warmed past the melting point by it melts the ice through and the fog off, into water that
  beads on the glass and dries over a few seconds. Melting takes the latent heat back, so the spot is left colder
  than the glass round it: once it is dry the ice grows back in from its edge and the fog forms again. Thaw warms the
  whole window, and a new one freezes over.
- **Time**: the window freezes as a time-lapse (about 900 steps a second at first, falling to 230), creeps on, and
  settles after a minute untouched; then nothing is stepped or drawn until a finger comes. A run of slow frames takes
  fewer steps a frame, so the ice grows slower and the page stays smooth. Reduced motion opens the window already
  frosted (stepped there behind the photo), and the ice moves only where it is warmed.
- **The look**: through clear glass the street is sharp, through the fog softened, through the ice scattered. The ice
  is lit by the street's own light behind it (the photo blurred wide), so it glows round the lamps and is dark silver
  where the street is dark; its edge is sharp at any size (`fwidth`), a crystal's side catches the light, its
  thickness (*p* blurred: thickest down a fern's stem) bends the street behind it and whitens it, and its surface has
  the grain of hoar. A mouse over the glass is a lamp in the room: a facet glints as it moves. Each bead of water is
  a small lens that turns the street over.
- **The needles**: each cell keeps the moment it froze (to a fraction of a step), so the ice knows the way it grew:
  the slope of that time, smoothed across a few cells and carried a little past the edge. Fine noise is smeared along
  that way, 14 samples each side (line integral convolution), so a fern is drawn as a feather of needles finer than
  the grid, ragged at its tips. The needles brighten and dim the light the ice scatters, and the mouse's lamp runs
  along them as along brushed metal.
- **Pictures**: a photo is stored as sRGB, so the GPU filters it in linear light; a video or a camera goes up frame
  by frame as the browser hands it over (`requestVideoFrameCallback`) and is decoded in the shader. A front camera is
  drawn as a mirror shows you.

Without WebGL 2 or float render targets `createFrost` throws; a lost context or a shader that won't link calls
`onFail`: either way the page shows its still. The programs build in the background where the browser can
(`KHR_parallel_shader_compile`, asked for before they link), so the page keeps moving while they do.

## Use it

```ts
import { createFrost, openCamera } from "./src/frost";

const frost = createFrost({
  canvas: document.querySelector("canvas"),
  source: document.querySelector("img"),   // a photo, a playing video, a canvas
  focus: [0.5, 0.5],                       // its crop, as CSS object-position (lines up with an <img> under it)
  cold: -9,                                // the glass, °C
  still: matchMedia("(prefers-reduced-motion: reduce)").matches,
  onReady: () => { /* the first frame is on the canvas */ },
  onFail: () => { /* show a still */ },
});

const camera = await openCamera();         // the front camera, muted and playing
frost.setSource(camera.video, { mirror: camera.mirror });
```

`setCold(c)` (−20 to −2 °C), `thaw()`, `touch(x, y)` and `touch(null)` (a finger for keys and tests, in CSS px of
the canvas), `setStill(s)`, `setActive(a)` (nothing stepped or drawn while off screen), `setPixelRatio(p)`,
`snapshot(type)` (the frame as a file) and `dispose()`. `advance(n)` takes n steps at once and `read()` returns the
grid (*p*, *T*, *W* and the water for each cell), for stills and tests. Without a canvas, `anisotropy(gx, gy, θ₀)` is
the shader's ε and dε/dθ, `seeds(w, h, seed)` where the ice starts, `coldField(c)` the glass's temperature and
`filmAt(c)` how thick the fog grows.

## Build the demo

```sh
npm install
npm run build   # docs/ (GitHub Pages)
npm run dev     # build and serve
npm run check   # types
npm test        # the sixfold anisotropy, where the ice starts, the glass's temperature, and a crystal grown on the CPU
```

`?cold=-15`, `?seed=8` and `?still` set how it starts; `?photo=` another picture in the folder; `?debug` puts the
window on `window.frost`.

## Licence

MIT, Oliver Kure Olsen, 2026, for the code. The photo behind the glass (`demo/public/nyhavn.webp`, and
`nyhavn-tall.webp`, a band of it for phones) is [Evening with snow in Nyhavn](https://commons.wikimedia.org/wiki/File:Evening_with_snow_in_Nyhavn_10.jpg)
by Leif Jørgensen, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). It is cropped here, and the
posters and social card are frames of the frost over it, so they are under CC BY-SA 4.0 too, not the MIT licence.

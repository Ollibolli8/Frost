import { createFrost, openCamera, type Frost } from "../src/frost";
import "./style.css";

// ?photo=<file> another picture from this folder; ?cold= the glass's temperature (°C); ?seed= another window;
// ?still: no time-lapse (for stills of the demo); ?debug puts the window on window.frost
const q = new URLSearchParams(location.search);
const host = document.querySelector<HTMLElement>("#frost")!;
const canvas = host.querySelector("canvas")!;
const ring = host.querySelector<HTMLElement>(".fr-finger")!;
const note = host.querySelector<HTMLElement>(".fr-note")!;
const range = host.querySelector<HTMLInputElement>(".fr-cold input")!;
const shown = host.querySelector("output")!;
const buttons = [...host.querySelectorAll<HTMLButtonElement>("[data-source]")];
const flip = host.querySelector<HTMLButtonElement>(".fr-flip")!;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
// the quay's middle on wide screens; the tall picture is cut round the corner house already
const tall = matchMedia("(max-width: 700px)").matches;
const focus: [number, number] = tall ? [0.5, 0.5] : [0.5, 0.52];
const cold0 = Number(q.get("cold") ?? -9);
const degrees = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} °C`;

let frost: Frost | null = null;
let camera: Awaited<ReturnType<typeof openCamera>> | null = null;
let file: string | null = null;

// the photo the page shows while the window loads is the one behind the glass
const photo = host.querySelector<HTMLImageElement>(".fr-photo")!;
if (q.has("photo")) { host.querySelector(".fr-pic source")?.remove(); photo.src = q.get("photo")!; }
range.value = String(cold0); shown.textContent = degrees(cold0);

function press(which: string) { for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.source === which)); }
function say(text: string) { note.textContent = text; if (text) setTimeout(() => { if (note.textContent === text) note.textContent = ""; }, 4000); }
function letGo() { camera?.stop(); camera = null; flip.hidden = true; if (file) { URL.revokeObjectURL(file); file = null; } }

try {
  frost = createFrost({
    canvas, cold: cold0, focus, seed: q.has("seed") ? Number(q.get("seed")) : undefined, still: q.has("still") || reduce.matches,
    onReady: () => { host.dataset.gl = "on"; },
    onFail: () => { host.dataset.gl = "off"; frost = null; letGo(); },
  });
  photo.decode().then(() => {
    frost?.setSource(photo, { focus });
    // past the phone width the other picture loads: it is the one behind the glass from then on
    photo.addEventListener("load", () => { if (frost && !camera && !file && photo.complete) frost.setSource(photo, { focus }); });
  }, () => say("The photo didn't load"));
} catch {
  host.dataset.gl = "off";
}
reduce.addEventListener("change", () => frost?.setStill(reduce.matches));
if (q.has("debug")) Object.assign(window, { frost });

function showPhoto() { letGo(); frost?.setSource(photo, { focus }); press("photo"); }
async function useCamera(facing: "user" | "environment") {
  if (!frost) return;
  try {
    const next = await openCamera(facing);
    if (!frost) { next.stop(); return; }
    letGo(); camera = next;
    frost.setSource(next.video, { mirror: next.mirror });
    press("camera");
    // a phone has a camera on each side: then Flip turns it round
    navigator.mediaDevices.enumerateDevices?.().then(d => { flip.hidden = !camera || d.filter(x => x.kind === "videoinput").length < 2; }, () => {});
  } catch { say("No camera, or it wasn't allowed"); }
}
// Nyhavn; Camera (pressed again, back to the photo)
for (const b of buttons) b.addEventListener("click", () => {
  if (b.dataset.source === "photo" || camera) showPhoto();
  else void useCamera("user");
});
flip.addEventListener("click", () => void useCamera(camera?.mirror ? "environment" : "user"));

host.querySelector<HTMLInputElement>(".fr-file input")!.addEventListener("change", e => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f || !frost) return;
  const url = URL.createObjectURL(f);
  const done = (el: HTMLImageElement | HTMLVideoElement) => { letGo(); file = url; frost!.setSource(el); press(""); };
  if (f.type.startsWith("video/")) {
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.src = url;
    v.play().then(() => done(v), () => { URL.revokeObjectURL(url); say("That video won't play here"); });
  } else {
    const img = new Image(); img.src = url;
    img.decode().then(() => done(img), () => { URL.revokeObjectURL(url); say("That file isn't a picture"); });
  }
});

range.addEventListener("input", () => { const c = Number(range.value); frost?.setCold(c); shown.textContent = degrees(c); });
host.querySelector(".fr-thaw")!.addEventListener("click", () => frost?.thaw());

// the keyboard's finger: Space or Enter holds it on the glass, the arrows move it; its place shows as a ring
let key: { x: number; y: number; down: boolean } | null = null;
function place(x: number, y: number) {
  key ??= { x: 0, y: 0, down: false };
  key.x = Math.min(canvas.clientWidth, Math.max(0, x)); key.y = Math.min(canvas.clientHeight, Math.max(0, y));
  ring.style.left = `${key.x}px`; ring.style.top = `${key.y}px`;
  if (key.down) frost?.touch(key.x, key.y);
  return key;
}
const MOVE: Record<string, [number, number]> = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
canvas.addEventListener("keydown", e => {
  if (!frost) return;
  const k = key ?? place(canvas.clientWidth / 2, canvas.clientHeight / 2);
  if (MOVE[e.key]) { e.preventDefault(); place(k.x + MOVE[e.key][0], k.y + MOVE[e.key][1]); }
  else if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); k.down = true; frost.touch(k.x, k.y); }
});
const lift = () => { if (key?.down) { key.down = false; frost?.touch(null); } };
canvas.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") lift(); });
canvas.addEventListener("blur", lift);

host.querySelector(".fr-save")!.addEventListener("click", async () => {
  const blob = await frost?.snapshot("image/jpeg", 0.92);
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "frost.jpg"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

addEventListener("pagehide", letGo);
// the camera goes off with the page out of sight, and the photo comes back
document.addEventListener("visibilitychange", () => { if (document.hidden && camera) showPhoto(); });

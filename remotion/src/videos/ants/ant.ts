// Our own cast for the zombie-ant short, drawn with the toon.ts Pen in the same flat style as the bridge cast:
// bean heads with the shared face library, plum variable-width ink, stick legs, painted crescents, no blush.
// Ant cards are side views on a 1000 x 600 design canvas, feet on y = 575, body facing screen right.
// Effects (spores, fungus threads, stalk, strings, magnifier, fossil marks) are unlit cards.
import { Pen, INK, Expr, headBlob, blobPts, thickAngle, faceFront, taper, mix, shade } from "./toon";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const DEF_LIGHT = rad(-120);

export type AntLook = { head: string; thorax: string; gaster: string; stripe: string; leg: string; zombie?: number };
/** carpenter ant (Camponotus): warm chestnut head, darker thorax and abdomen */
export const WORKER: AntLook = { head: "#e39a5a", thorax: "#c06a3a", gaster: "#9c4d30", stripe: "#7a3826", leg: "#3a2120" };
export const WORKERS: AntLook[] = [
  WORKER,
  { head: "#e8a566", thorax: "#c97541", gaster: "#a65634", stripe: "#7e3b27", leg: "#3a2120" },
  { head: "#d98f50", thorax: "#b86236", gaster: "#94482d", stripe: "#713322", leg: "#3a2120" },
];
/** infected: pale olive-grey, fuzz patches; zombie 0..1 blends from the worker */
export const zombieOf = (o: AntLook, k: number): AntLook => ({
  head: mix(o.head, "#c4b99a", k), thorax: mix(o.thorax, "#9d9877", k), gaster: mix(o.gaster, "#8b8a6c", k),
  stripe: mix(o.stripe, "#6c6a52", k), leg: mix(o.leg, "#4a4636", k), zombie: k,
});

export type AntOpts = {
  phase?: number;      // walk cycle 0..1 (tripod gait)
  mode?: "walk" | "stand" | "shake" | "grip" | "dead" | "puppet";
  expr?: Expr; blink?: number; look?: number; light?: number; seed?: number;
  threads?: number;    // fungus net over the body 0..1 (x-ray beat)
  brain?: boolean;     // draw the untouched brain inside the head (x-ray beat)
  stalk?: number;      // stalk out of the head 0..1
  pose?: number;       // puppet: string pull 0..1
};

const SOLE = 575;
/** leg polyline: hip -> knee (raised) -> foot */
const legPts = (hip: P2, foot: P2, up: number): P2[] => {
  // knee raised above the hip and pushed outward along the leg's reach (ant legs splay like a tent)
  const kx = hip[0] + (foot[0] - hip[0]) * 0.55, ky = hip[1] - up;
  return [hip, [kx, ky], foot];
};

export const antSide = (p: Pen, o: AntLook, opts: AntOpts = {}) => {
  const { phase = 0, mode = "walk", expr = "neutral", blink = 0, look = 0, light = DEF_LIGHT, seed = 3, threads = 0, brain = false, stalk = 0, pose = 0 } = opts;
  const two = Math.PI * 2, thick = thickAngle(light), ol = 11;
  const z = o.zombie ?? 0;
  // body bob with the gait; grip/dead: the body hangs a little lower (jaws locked, legs splayed)
  const bob = mode === "walk" ? 5 * Math.sin(two * phase * 2) : mode === "shake" ? 6 * Math.sin(phase * 47) : 0;
  const by = 380 + bob + (mode === "dead" ? 18 : 0);
  const tilt = mode === "shake" ? rad(5 * Math.sin(phase * 31)) : 0;
  p.rot = tilt ? [tilt, 520, by] : null;
  // ---- far legs (behind the body) ----
  const hips: P2[] = [[495, by + 30], [545, by + 36], [595, by + 30]];
  const reach = [-200, -40, 235];
  const legFoot = (i: number, far: boolean): P2 => {
    if (mode === "dead" || mode === "grip") return [hips[i][0] + reach[i] * 1.25 + (far ? 25 : 0), SOLE - 40 - (far ? 10 : 0)];
    if (mode === "puppet") { const a = Math.sin(two * (pose + i * 0.33 + (far ? 0.5 : 0))); return [hips[i][0] + reach[i] + 40 * a, SOLE - 30 - 60 * Math.max(0, a)]; }
    const g = (i % 2 === 0) !== far ? 0 : 0.5, c = (((phase + g) % 1) + 1) % 1;
    const stride = mode === "walk" ? 90 : 0;
    if (c < 0.5) return [hips[i][0] + reach[i] + stride / 2 - stride * (c / 0.5), SOLE];
    const s = (c - 0.5) / 0.5;
    return [hips[i][0] + reach[i] - stride / 2 + stride * s, SOLE - 34 * Math.sin(Math.PI * s)];
  };
  const legW = 15, farCol = mix(o.leg, "#8c7a86", 0.25);
  for (let i = 0; i < 3; i++) p.line(legPts([hips[i][0] + 12, hips[i][1] - 6], legFoot(i, true), 75), farCol, legW * 0.8, true);
  // ---- antenna (far) ----
  const hx = 735, hy = by - 95;
  const antenna = (dx: number, w: number, col: string, wig: number) => {
    const base: P2 = [hx + 30 + dx, hy - 85], elbow: P2 = [hx + 45 + dx + 8 * wig, hy - 200], tip: P2 = [hx + 150 + dx + 10 * wig, hy - 190 + 8 * wig];
    p.line([base, elbow, tip], col, w, true);
    p.dot(tip[0], tip[1], w * 0.9 + 4, INK);
  };
  const wig = mode === "dead" ? 0 : Math.sin(two * phase + seed);
  antenna(-22, 11, farCol, -wig);
  // ---- gaster (abdomen) with stripes ----
  const gast = blobPts(300, by + 5, { a: 165, b: 118, nTop: 2.1, nBot: 2.4, egg: 0.04, asym: -0.05, rot: rad(-8), noise: 0.006, seed: seed + 5 }, 64);
  p.gradFill(gast, o.gaster, shade(o.gaster, 0.72), light, 0.35);
  p.clip(gast, () => {
    for (const k of [-1, 0, 1]) p.arc(300 + k * 62, by + 5, 40, 130, 70, 110, 10, o.stripe);
    p.ell(250, by - 50, 70, 30, mix(o.gaster, "#ffffff", 0.18), 0, 0, 360, rad(-12));
  });
  p.inkRing(gast, ol, thick);
  // petiole + thorax
  p.ell(468, by + 6, 26, 30, o.thorax, ol);
  const thor = blobPts(555, by - 8, { a: 92, b: 62, nTop: 2.2, nBot: 2.4, egg: 0, asym: 0.04, rot: rad(-18), noise: 0.006, seed: seed + 9 }, 56);
  p.gradFill(thor, o.thorax, shade(o.thorax, 0.74), light, 0.3);
  p.inkRing(thor, ol, thick);
  // ---- near legs ----
  for (let i = 0; i < 3; i++) p.line(legPts(hips[i], legFoot(i, false), 85), o.leg, legW, true);
  for (let i = 0; i < 3; i++) { const f = legFoot(i, false); p.dot(f[0] + 6, f[1] - 2, 11, INK); }
  // ---- head (bean, face toward screen right, 3/4) ----
  const H = { ...headBlob(seed, 112, 1), asym: 0.1 };
  const hp = blobPts(hx, hy, H, 72);
  p.shadedFill(hp, o.head, shade(o.head, 0.86), light, H.a, 0.4);
  if (z > 0.3) {
    // fuzz patches: pale fungal felt on the head
    p.clip(hp, () => { for (let k = 0; k < 5; k++) p.ell(hx - 60 + 30 * k, hy - 70 + 25 * Math.sin(k * 2.1), 24, 18, mix(o.head, "#f3ecd2", 0.75 * z), 0); });
  }
  p.inkRing(hp, ol, thick);
  if (brain) {
    // the brain stays clean: a pink bean at the back of the head, behind the face
    p.ell(hx - 52, hy - 48, 40, 28, "#f2a6b6", 6);
    p.arc(hx - 62, hy - 50, 14, 10, 200, 340, 4, "#c4687e"); p.arc(hx - 40, hy - 44, 12, 10, 180, 330, 4, "#c4687e");
  }
  faceFront(p, hx + 14, hy + 8, 2 * H.a, expr, 1, look, blink, false, o.head);
  // mandibles at the front-bottom of the head
  const mj = mode === "grip" || mode === "dead" ? 0 : 6 * Math.sin(two * phase * 3);
  p.poly([[hx + 92, hy + 42], [hx + 140, hy + 58 + mj], [hx + 102, hy + 66]], shade(o.head, 0.7), 8);
  antenna(10, 13, o.leg, wig);
  // ---- fungus threads over the whole body (x-ray beat) ----
  if (threads > 0) {
    const g = p.g; g.save(); g.globalAlpha = Math.min(1, threads * 1.2);
    const pts: P2[] = [];
    for (let k = 0; k < 46; k++) {
      const u = rnd(seed + 40, k), v = rnd(seed + 41, k), part = k % 3;
      const c: P2 = part === 0 ? [300 + (u - 0.5) * 260, by + (v - 0.5) * 170] : part === 1 ? [555 + (u - 0.5) * 140, by - 8 + (v - 0.5) * 90] : [480 + (u - 0.5) * 220, SOLE - 60 - v * 90];
      if (rnd(seed + 42, k) < threads) pts.push(c);
    }
    for (let a = 0; a < pts.length; a++) {
      let best = -1, bd = 1e9;
      for (let b = 0; b < a; b++) { const d = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]); if (d < bd) { bd = d; best = b; } }
      if (best >= 0 && bd < 180) p.stroke([pts[a], [(pts[a][0] + pts[best][0]) / 2 + 12, (pts[a][1] + pts[best][1]) / 2 - 10], pts[best]], 7, "#f6e9a8");
      p.dot(pts[a][0], pts[a][1], 9, "#fff6c9");
    }
    g.restore();
  }
  // ---- stalk out of the back of the head (after death) ----
  if (stalk > 0) {
    const L = 360 * stalk, base: P2 = [hx - 40, hy - 90];
    const top: P2 = [base[0] - 30 * stalk, base[1] - L];
    p.line([base, [base[0] + 18, base[1] - L * 0.5], top], "#e9dcae", 18 + 8 * stalk, true);
    if (stalk > 0.6) { const k = (stalk - 0.6) / 0.4; p.ell(top[0] + 4, top[1] + 30, 26 * k + 6, 42 * k + 6, "#d7b56a", 8); }
  }
  p.rot = null;
};

// ---------------- props and effects ----------------
/** spore: small pale bead with a soft halo (cw 200) */
export const fxSpore = (p: Pen, glow = 1) => {
  const g = p.g, gr = g.createRadialGradient(100, 100, 0, 100, 100, 95);
  gr.addColorStop(0, `rgba(255,248,205,${0.85 * glow})`); gr.addColorStop(1, "rgba(255,248,205,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
  p.ell(100, 100, 30, 34, "#f4e7b2", 7);
  p.ell(92, 90, 9, 10, "#fffbe6", 0);
};
/** ground fuzz where the spore lands / a little puff (cw 400) */
export const fxPuff = (p: Pen, t: number) => {
  const e = 1 - (1 - t) ** 2;
  for (let i = 0; i < 7; i++) {
    const a = rad(i * 51 + 10), r = 40 + 120 * e;
    p.ell(200 + r * Math.cos(a), 220 + 0.55 * r * Math.sin(a) - 30 * e, 30 * (1 - t) + 6, 26 * (1 - t) + 6, "#efe6c4", 6 * (1 - t) + 2);
  }
};
/** marionette control bar with strings down to six points (cw 1000 x 1000): the cross is at the top */
export const fxPuppetBar = (p: Pen, sway: number, pts: P2[]) => {
  const cx = 500 + 30 * sway, cy = 110;
  for (const q of pts) p.stroke([[cx + (q[0] - 500) * 0.45, cy + 12], q], 4, "#f6f1e3");
  p.poly([[cx - 260, cy - 16], [cx + 260, cy - 16], [cx + 260, cy + 16], [cx - 260, cy + 16]], "#b57a45", 10);
  p.poly([[cx - 16, cy - 120], [cx + 16, cy - 120], [cx + 16, cy + 120], [cx - 16, cy + 120]], "#c58a52", 10);
  for (const s of [-1, 1]) p.ell(cx + s * 260, cy, 20, 20, "#8a5530", 8);
};
/** a researcher's face peering through a magnifying glass (cw 1000 x 1000): our own design, safari hat, glasses */
export const fxResearcher = (p: Pen, expr: Expr, blink: number, light = DEF_LIGHT) => {
  const H = { ...headBlob(17, 300, 0), asym: 0.02 };
  const hp = blobPts(470, 560, H, 96);
  p.shadedFill(hp, "#f2c7a0", shade("#f2c7a0", 0.9), light, H.a, 0.4);
  p.inkRing(hp, 22, thickAngle(light));
  // hat: brim + crown
  p.poly([[110, 330], [840, 330], [800, 380], [150, 380]], "#c9a86a", 20);
  p.poly([[230, 330], [270, 150], [680, 150], [720, 330]], "#d8b878", 20);
  p.band([[245, 290], [705, 290]], "#7a5a32", 34, 6);
  faceFront(p, 470, 600, 2 * H.a, expr, 0, 0, blink, false, "#f2c7a0");
  // magnifier in front of the right side of the face
  p.line([[760, 760], [940, 960]], "#5b3b28", 46, true);
  const g = p.g; g.save(); g.globalAlpha = 0.28; p.ell(650, 600, 190, 190, "#cfe8ff", 0); g.restore();
  p.ell(650, 600, 190, 190, null, 30);
  p.arc(600, 540, 110, 110, 200, 250, 16, "#ffffff");
};
/** fossil slab texture: grey shale with a leaf imprint and paired death-grip scars along the veins (cw 1600 x 1000) */
export const fossilSlab = (g: CanvasRenderingContext2D, marks: number) => {
  const W = 1600, Hh = 1000;
  g.fillStyle = "#b9b2a4"; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 260; i++) {
    const x = rnd(1, i) * W, y = rnd(2, i) * Hh, r = 20 + 90 * rnd(3, i);
    g.fillStyle = `rgba(${rnd(4, i) < 0.5 ? "70,66,60" : "190,184,172"},${0.05 + 0.07 * rnd(5, i)})`;
    g.beginPath(); g.ellipse(x, y, r, r * 0.35, 0.1, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 9; i++) { g.strokeStyle = "rgba(60,56,52,0.25)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 100 + i * 105); g.lineTo(W, 120 + i * 105 + 20 * Math.sin(i)); g.stroke(); }
  // leaf imprint
  const lx = 800, ly = 500, L = 620, Wd = 300;
  g.save(); g.translate(lx, ly); g.rotate(-0.12);
  g.beginPath(); g.moveTo(-L, 0);
  g.bezierCurveTo(-L * 0.6, -Wd, L * 0.5, -Wd * 0.95, L, 0); g.bezierCurveTo(L * 0.5, Wd * 0.95, -L * 0.6, Wd, -L, 0); g.closePath();
  g.fillStyle = "#5d574d"; g.fill(); g.lineWidth = 14; g.strokeStyle = "#2f2b26"; g.stroke();
  g.strokeStyle = "#8a8272"; g.lineWidth = 11; g.beginPath(); g.moveTo(-L - 60, 0); g.lineTo(L * 0.95, 0); g.stroke();
  const veins: [number, number, number][] = [];
  for (let k = 0; k < 11; k++) for (const s of [-1, 1]) {
    const x0 = -L * 0.8 + k * (L * 1.55 / 10), len = Wd * (0.95 - 0.5 * Math.abs(x0 / L));
    g.lineWidth = 5; g.beginPath(); g.moveTo(x0, 0); g.quadraticCurveTo(x0 + 70, s * len * 0.5, x0 + 140, s * len * 0.9); g.stroke();
    veins.push([x0, s, len]);
  }
  // 29 paired scars on 11 secondary veins (Hughes, Wappler & Labandeira 2011): dumbbell marks across the vein
  for (let i = 0; i < Math.min(29, marks); i++) {
    const [x0, s, len] = veins[(i * 7) % veins.length], u = 0.25 + 0.6 * rnd(9, i);
    const x = x0 + 140 * u * 0.9, y = s * len * 0.9 * u;
    g.fillStyle = "#3b3833";
    for (const d of [-1, 1]) { g.beginPath(); g.ellipse(x + d * 11, y - d * 5, 9, 6, 0.4, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = "#e9dfc8"; g.lineWidth = 5; g.beginPath(); g.ellipse(x, y, 28, 16, 0.4, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
};
/** falling spore rain under the stalk (cw 400 x 800): tiny pale dots streaking down */
export const fxRain = (p: Pen, t: number) => {
  for (let i = 0; i < 26; i++) {
    const x = 60 + 280 * rnd(70, i), y = ((rnd(71, i) + t * (0.6 + 0.4 * rnd(72, i))) % 1) * 780 + 10;
    p.ell(x, y, 7, 9, "#fff2be", 3);
  }
};
/** tiny compass rose without letters: red needle tip points north (cw 400) */
export const fxCompass = (p: Pen, swing: number) => {
  p.ell(200, 200, 170, 170, "#f4efe2", 14);
  for (let k = 0; k < 8; k++) { const a = rad(k * 45); p.stroke([[200 + 135 * Math.cos(a), 200 + 135 * Math.sin(a)], [200 + 155 * Math.cos(a), 200 + 155 * Math.sin(a)]], 8); }
  const a = rad(-90 + 12 * swing);
  const tip: P2 = [200 + 120 * Math.cos(a), 200 + 120 * Math.sin(a)], tail: P2 = [200 - 120 * Math.cos(a), 200 - 120 * Math.sin(a)];
  const n: P2 = [-Math.sin(a) * 26, Math.cos(a) * 26];
  p.poly([tip, [200 + n[0], 200 + n[1]], [200 - n[0], 200 - n[1]]], "#e2453c", 8);
  p.poly([tail, [200 + n[0], 200 + n[1]], [200 - n[0], 200 - n[1]]], "#3f6fb5", 8);
  p.dot(200, 200, 16);
};
/** midday sun icon pulse (cw 400): a fat cartoon sun */
export const fxSun = (p: Pen, t: number) => {
  for (let k = 0; k < 12; k++) {
    const a = rad(k * 30 + 10 * t), r0 = 120, r1 = 175 + 10 * Math.sin(t * 6 + k);
    p.poly([[200 + r0 * Math.cos(a - 0.12), 200 + r0 * Math.sin(a - 0.12)], [200 + r1 * Math.cos(a), 200 + r1 * Math.sin(a)], [200 + r0 * Math.cos(a + 0.12), 200 + r0 * Math.sin(a + 0.12)]], "#ffd34d", 8);
  }
  p.ell(200, 200, 105, 105, "#ffe27a", 10);
};
export { taper };

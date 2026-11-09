// Timeline of the zombie-ant short: shots timed to the voice (shorts/zombie-ameisen/voice/words.json), the story
// motion of the hero ant, and the camera grammar of the bridge short (smootherstep glides 18-40 f, cuts on big
// reframes, every hold creeps in, 7-frame flip kicks on impacts).
// World scale: the ants are drawn ~2.2 m long, so the forest is built ~220x real size (a 25 cm leaf height = 55 m).
export const FPS = 30;
export const TOTAL = 2085;
export const D0 = 0; // ground height (build.ts imports it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- places ----------------
/** the infected sapling: stem foot, stem top, and the leaf the ant bites (midrib along +x from the stem) */
export const KEY: V3 = [14, 0, 34];
export const LEAF_Y = 50; // bite height (real 25 cm)
export const LEAF_X0 = KEY[0] + 1.0, LEAF_LEN = 24;
/** the bite spot on the underside of the leaf midrib */
export const BITE: V3 = [KEY[0] + 9.5, LEAF_Y - 0.55, KEY[2]];
/** canopy branch (the colony's highway): along z at x = CX, top at CY + CR */
export const CX = -26, CY = 230, CR = 3.2;
export const BRANCH_TOP = CY + CR;
/** the low twig over the floor trail (shot 6): a bent stick from the ground up to TWIG_H and down again */
export const TWIG_X = 26, TWIG_H = 7;
export const twigY = (z: number) => TWIG_H * Math.max(0, 1 - (z / 46) ** 2) ** 0.6;
/** fossil slab far away from the forest (golden shot) */
export const FOSSIL: V3 = [-1600, 0, 0];
export const SLAB = { w: 96, d: 60, h: 3 };
/** graveyard: saplings around the key one; each has dead ants under its leaves (cast.ts) */
export const GRAVES: { x: number; z: number; h: number; yaw: number }[] = [
  { x: KEY[0], z: KEY[2], h: LEAF_Y + 3, yaw: 0 },
  { x: -6, z: 52, h: 46, yaw: 1.9 }, { x: 50, z: 50, h: 58, yaw: -0.6 }, { x: 4, z: 74, h: 40, yaw: 2.6 },
  { x: 40, z: 30, h: 44, yaw: -1.4 }, { x: -18, z: 30, h: 52, yaw: 0.9 }, { x: 22, z: 86, h: 50, yaw: 2.2 },
  { x: -30, z: 70, h: 38, yaw: -2.4 }, { x: 52, z: 70, h: 48, yaw: 0.4 },
];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "floor" | "canopy" | "fossil";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 91, light: "day", place: "floor" },              // hook: a zombie ant shambles down the trail
  { id: 2, a: 91, b: 160, light: "day", place: "floor" },            // "seit 48 Millionen Jahren": the giant forest
  { id: 3, a: 160, b: 327, light: "day", place: "canopy" },          // Rossameisen on the canopy highway
  { id: 4, a: 327, b: 398, light: "day", place: "floor" },           // "Diese hier schon" + the spore
  { id: 5, a: 398, b: 545, light: "day", place: "floor" },           // fungus in every muscle, not in the brain
  { id: 6, a: 545, b: 645, light: "day", place: "floor" },           // leaves the trail, shakes, falls off the twig
  { id: 7, a: 645, b: 785, light: "day", place: "floor" },           // climbs: 25 cm, north side
  { id: 8, a: 785, b: 920, light: "day", place: "floor", sunAz: 160, sunEl: 84 }, // noon bite, never lets go
  { id: 9, a: 920, b: 1057, light: "day", place: "floor" },          // luckily: humans are not on the list
  { id: 10, a: 1057, b: 1300, light: "golden", place: "fossil" },    // Messel leaf, 48 Ma, 29 bites
  { id: 11, a: 1300, b: 1560, light: "day", place: "floor" },        // the marionette
  { id: 12, a: 1560, b: 1700, light: "day", place: "floor", sunAz: 120, sunEl: 60 }, // the stalk, spores rain
  { id: 13, a: 1700, b: 1850, light: "day", place: "floor" },        // 2200 dead, 2 alive
  { id: 14, a: 1850, b: TOTAL, light: "golden", place: "canopy", sunAz: 105, sunEl: 16 },   // stay up, never go to the graveyard
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 10: 8, 11: 8, 14: 10 };
export const FLASH_AT = 91;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story motion ----------------
const T = (f: number) => f / FPS;
/** hook zombie: shambling down the trail toward +z */
export const zombieZ = (t: number) => -14 + 1.1 * t;
/** canopy column: marching toward +z along the branch */
export const columnZ = (t: number) => -40 + 3.0 * t;
/** shot 4: hero walking the floor trail toward +z; steps on the spore at SPORE_T */
export const SPORE_T = 12.5, SPORE_Z = 10;
export const heroFloorZ = (t: number) => SPORE_Z + 2.4 * (t - SPORE_T);
/** shot 6: on the twig, then off the trail, shakes, falls */
export const LEAVE_T = 18.42, SHAKE_T = 19.64, FALL_T = 20.46;
export const twigHero = (t: number): { x: number; z: number; y: number; mode: "walk" | "shake" | "fall"; tilt: number } => {
  const z0 = -8 + 2.4 * (Math.min(t, LEAVE_T) - 15.5);
  if (t < LEAVE_T) return { x: TWIG_X, z: z0, y: twigY(z0), mode: "walk", tilt: 0 };
  const u = Math.min(t, SHAKE_T) - LEAVE_T;
  const z = z0 + 1.6 * u, x = TWIG_X + 0.75 * smooth(u / 0.8); // wanders to the edge of the stick
  if (t < FALL_T) return { x, z, y: twigY(z), mode: t < SHAKE_T ? "walk" : "shake", tilt: 0 };
  const tf = t - FALL_T, y = Math.max(0, twigY(z) + 1.2 * tf - 4.9 * tf * tf * 1.2);
  return { x: x + 1.1 * Math.min(tf, 0.9), z, y, mode: "fall", tilt: Math.min(2.6, tf * 5) };
};
/** shot 7: climbing the key stem from CLIMB_T, arrives under the leaf at GRIP_T */
export const CLIMB_T = 21.7, ARRIVE_T = 23.3;
export const climbY = (t: number) => (LEAF_Y - 2.2) * smooth((t - CLIMB_T + 0.2) / (ARRIVE_T - CLIMB_T + 0.4));
export const BITE_T = 27.28, LETGO_T = 29.4;
export const STALK_T = 53.2, RAIN_T = 54.6;
export const PUPPET_T = 46.4;
/** reaction lead (reference): changes land 0-3 f before the word onset */
export const LEAD = 2 / FPS;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

// shot 1: low 3/4 front of the shambling zombie, pushing in; closer on "Zombieapokalypse"
const S1a = (f: number) => { const z = zombieZ(T(f)); return dolly([4.2, 1.1, z + 4.6], [0, 0.85, z], pushK(f, 0, 0.0025), { fov: 40, roll: -0.03 }); };
const S1b = (f: number) => { const z = zombieZ(T(f)); return dolly([3.0, 1.15, z + 3.8], [0, 1.05, z + 0.3], pushK(f, 55, 0.003), { fov: 38, roll: 0.04 }); };
// shot 2: the giant forest: low on the floor looking up past the saplings at the trunks and the canopy
const S2a = (f: number) => zoom([-8, 2.5, -30], [10, 60, 70], 50, pushK(f, 91, 0.002));
// shot 3: canopy highway: 3/4 side of the column, then a high wide off the branch looking down ("hoch oben"), then the
// column again close ("nur selten auf den Boden")
const S3a = (f: number) => { const z = columnZ(T(f)); return dolly([CX + 9, BRANCH_TOP + 3.0, z + 8], [CX, BRANCH_TOP + 0.9, z], pushK(f, 160, 0.0025), { fov: 42 }); };
const S3b = (f: number) => { const z = columnZ(T(f)); return dolly([CX + 16, BRANCH_TOP + 9, z + 2], [CX - 10, BRANCH_TOP - 70, z - 26], pushK(f, 222, 0.002), { fov: 50, roll: -0.04 }); };
const S3c = (f: number) => { const z = columnZ(T(f)); return dolly([CX + 4.2, BRANCH_TOP + 1.6, z + 4.5], [CX, BRANCH_TOP + 1.0, z + 0.5], pushK(f, 290, 0.003), { fov: 38, roll: 0.03 }); };
// shot 4: the hero alone on the floor trail; low lens at spore height on "Spore"
const S4a = (f: number) => { const z = heroFloorZ(T(f)); return dolly([7, 1.6, z + 5], [0, 0.9, z], pushK(f, 327, 0.0025), { fov: 40 }); };
const S4b = (f: number) => dolly([4.6, 0.9, SPORE_Z + 3.4], [0.1, 0.45, SPORE_Z + 0.2], pushK(f, 360, 0.002, 0.006, 30), { fov: 38, roll: -0.04 });
// shot 5: x-ray close-up of the hero (stands still, side on), push in on "Gehirn"
const HERO5: V3 = [0, 0, 18];
const S5a = (f: number) => dolly([0.4, 1.3, HERO5[2] + 5.2], [0.1, 0.95, HERO5[2]], pushK(f, 398, 0.002), { fov: 38 });
const S5b = (f: number) => dolly([1.0, 1.55, HERO5[2] + 3.0], [0.9, 1.45, HERO5[2]], pushK(f, 500, 0.002, 0.006, 30), { fov: 36, roll: 0.04 });
// shot 6: the twig: side view following the hero; wider when she falls
const S6a = (f: number) => { const h = twigHero(T(f)); return dolly([TWIG_X + 9, TWIG_H + 2.2, h.z + 2], [TWIG_X, TWIG_H, h.z], pushK(f, 545, 0.0025), { fov: 42 }); };
const S6b = (f: number) => { const h = twigHero(Math.min(T(f), 20.3)); return dolly([TWIG_X + 7, TWIG_H + 1.2, h.z + 1.2], [TWIG_X + 0.6, TWIG_H + 0.6, h.z], pushK(f, 586, 0.003), { fov: 38, roll: 0.04 }); };
const S6c = (f: number) => { const h = twigHero(20.3); return dolly([TWIG_X + 14, 6, h.z + 6], [TWIG_X + 1, 3.0, h.z], pushK(f, 612, 0.002), { fov: 44, roll: -0.03 }); };
// shot 7: climbing the stem: the lens rides up with her, then a wide of the whole sapling ("Genau fünfundzwanzig Zentimeter")
const S7a = (f: number) => { const y = climbY(T(f)); return dolly([KEY[0] + 5, y + 2.5, KEY[2] + 6.5], [KEY[0], y + 1.3, KEY[2]], pushK(f, 645, 0.002), { fov: 42 }); };
const S7b = (f: number) => zoom([KEY[0] + 46, 22, KEY[2] + 52], [KEY[0] + 4, 30, KEY[2]], 46, pushK(f, 693, 0.002));
const S7c = (f: number) => dolly([BITE[0] - 3, LEAF_Y - 5.5, BITE[2] + 7.5], [BITE[0], LEAF_Y - 1.4, BITE[2]], pushK(f, 752, 0.003), { fov: 40, roll: 0.03 });
// shot 8: under the leaf at noon, looking up at the hanging ant; punch on the bite; slow creep while she never lets go
const S8a = (f: number) => dolly([BITE[0] - 4.5, LEAF_Y - 6.0, BITE[2] + 5.5], [BITE[0], LEAF_Y - 1.2, BITE[2]], pushK(f, 785, 0.002), { fov: 44, roll: -0.03 });
const S8b = (f: number) => dolly([BITE[0] - 2.0, LEAF_Y - 3.0, BITE[2] + 3.4], [BITE[0], LEAF_Y - 1.0, BITE[2]], pushK(f, 816, 0.0025, 0.006, 30), { fov: 38, roll: 0.04 });
const S8c = (f: number) => dolly([BITE[0] - 3.2, LEAF_Y - 3.4, BITE[2] + 4.2], [BITE[0], LEAF_Y - 1.1, BITE[2]], pushK(f, 868, 0.0018), { fov: 40 });
// shot 9: the researcher's face looms behind the hanging ant
const S9a = (f: number) => dolly([BITE[0] - 1.5, LEAF_Y - 2.4, BITE[2] - 6], [BITE[0] + 6, LEAF_Y + 1.5, BITE[2] + 28], pushK(f, 920, 0.0015), { fov: 48 });
const S9b = (f: number) => dolly([BITE[0] - 1.2, LEAF_Y - 2.1, BITE[2] - 5.2], [BITE[0] + 6, LEAF_Y + 1.5, BITE[2] + 28], pushK(f, 995, 0.002, 0.005, 26), { fov: 46, roll: 0.035 });
// shot 10: fossil slab, golden: low across the slab -> close on the scars -> crane up over the whole leaf on "29"
const FS = FOSSIL;
const S10a = (f: number) => dolly([FS[0] - 30, 40, FS[2] + 48], [FS[0] + 2, SLAB.h, FS[2] + 2], pushK(f, 1053, 0.002), { fov: 42, roll: -0.03 });
const S10b = (f: number) => dolly([FS[0] + 2, 26, FS[2] + 20], [FS[0] + 6, SLAB.h, FS[2] - 2], pushK(f, 1180, 0.003, 0.006, 32), { fov: 40, roll: 0.03 });
const S10c = (f: number) => dolly([FS[0] + 2, 92, FS[2] + 34], [FS[0], SLAB.h, FS[2] - 2], pushK(f, 1250, 0.0015), { fov: 46 });
// shot 11: the marionette: MS of the puppet ant with the cross above
const PUPPET: V3 = [-4, 0, -40];
const S11a = (f: number) => dolly([PUPPET[0] + 1.0, 1.6, PUPPET[2] + 9.0], [PUPPET[0], 1.7, PUPPET[2]], pushK(f, 1296, 0.002), { fov: 44 });
const S11b = (f: number) => dolly([PUPPET[0] + 2.4, 2.0, PUPPET[2] + 8.2], [PUPPET[0], 2.1, PUPPET[2]], pushK(f, 1398, 0.0025, 0.006, 30), { fov: 44, roll: 0.04 });
const S11c = (f: number) => dolly([PUPPET[0] - 1.2, 1.9, PUPPET[2] + 7.4], [PUPPET[0], 2.0, PUPPET[2]], pushK(f, 1486, 0.0025), { fov: 44, roll: -0.04 });
// shot 12: the dead ant under the leaf, the stalk; tilt down with the spore rain to the trail
const S12a = (f: number) => dolly([BITE[0] - 3.4, LEAF_Y - 3.6, BITE[2] + 4.4], [BITE[0], LEAF_Y - 1.2, BITE[2]], pushK(f, 1556, 0.0025), { fov: 40 });
const S12b = (f: number) => dolly([BITE[0] - 12, LEAF_Y - 14, BITE[2] + 16], [BITE[0], LEAF_Y - 22, BITE[2]], pushK(f, 1640, 0.002), { fov: 46, roll: -0.03 });
// shot 13: the graveyard (wide over the floor), then the two living ants on "zwei lebende"
const S13a = (f: number) => zoom([-34, 30, 2], [16, 36, 58], 38, pushK(f, 1700, 0.002));
const TWO: V3 = [-12, 0, 8];
const S13b = (f: number) => dolly([TWO[0] + 2.4, 1.2, TWO[2] + 7.6], [TWO[0] + 1.2, 0.9, TWO[2] + 0.3], pushK(f, 1822, 0.003), { fov: 40, roll: 0.04 });
// shot 14: golden canopy: the column, close on two ants ("Bleib oben"), then the lens tips over the edge and looks
// all the way down to the floor ("geh nie auf den Friedhof")
const S14a = (f: number) => { const z = columnZ(T(f) - 45) - 20; return dolly([CX + 8, BRANCH_TOP + 2.8, z + 9], [CX, BRANCH_TOP + 1.0, z], pushK(f, 1846, 0.002), { fov: 44 }); };
const PAIR_Z = 26;
const S14b = (f: number) => dolly([CX + 3.6, BRANCH_TOP + 1.4, PAIR_Z + 4.2], [CX + 0.2, BRANCH_TOP + 1.05, PAIR_Z], pushK(f, 1978, 0.0025, 0.006, 26), { fov: 38, roll: 0.035 });
const S14c = (f: number): Shot => {
  const u = glide((f - 2008) / 40);
  const a = S14b(2008);
  const pos: V3 = [a.pos[0] + 3 * u, a.pos[1] + 5 * u, a.pos[2] - 3 * u];
  const look: V3 = [a.look[0] + (CX + 26 - a.look[0]) * u, a.look[1] + (BRANCH_TOP - 75 - a.look[1]) * u, a.look[2] + (PAIR_Z + 46 - a.look[2]) * u];
  return { pos, look, fov: 38 + 12 * u, roll: 0.035 * (1 - u) };
};
export const PAIR: V3 = [CX, BRANCH_TOP, PAIR_Z];
export { HERO5, PUPPET, TWO };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 55, dur: 26, s: S1b }],
  2: [{ f: 91, s: S2a }],
  3: [{ f: 160, s: S3a }, { f: 222, cut: true, s: S3b }, { f: 290, cut: true, s: S3c }],
  4: [{ f: 327, s: S4a }, { f: 360, cut: true, s: S4b }],
  5: [{ f: 398, s: S5a }, { f: 494, dur: 24, s: S5b }],
  6: [{ f: 545, s: S6a }, { f: 586, cut: true, s: S6b }, { f: 612, cut: true, s: S6c }],
  7: [{ f: 645, s: S7a }, { f: 693, cut: true, s: S7b }, { f: 752, cut: true, s: S7c }],
  8: [{ f: 785, s: S8a }, { f: 816, cut: true, s: S8b }, { f: 868, dur: 28, s: S8c }],
  9: [{ f: 920, s: S9a }, { f: 995, dur: 22, s: S9b }],
  10: [{ f: 1053, s: S10a }, { f: 1180, dur: 36, s: S10b }, { f: 1250, cut: true, s: S10c }],
  11: [{ f: 1296, s: S11a }, { f: 1398, cut: true, s: S11b }, { f: 1486, dur: 26, s: S11c }],
  12: [{ f: 1556, s: S12a }, { f: 1640, dur: 36, s: S12b }],
  13: [{ f: 1696, s: S13a }, { f: 1822, cut: true, s: S13b }],
  14: [{ f: 1846, s: S14a }, { f: 1978, cut: true, s: S14b }, { f: 2008, cut: true, s: S14c }],
};

// impact kicks: flip sign every frame, decay over 7 f
const KICKS: [number, number][] = [[SPORE_T, 0.7], [FALL_T + 0.55, 0.9], [BITE_T, 1.2], [LETGO_T + 0.4, 0.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 14, focus: (f) => [0, 1.0, zombieZ(T(f))] },
  { f: 91, cInf: 0 },
  { f: 160, cInf: 10, focus: (f) => [CX, BRANCH_TOP + 1, columnZ(T(f))] },
  { f: 222, cInf: 0 },
  { f: 290, cInf: 12, focus: (f) => [CX, BRANCH_TOP + 1, columnZ(T(f)) + 0.5] },
  { f: 327, cInf: 10, focus: (f) => [0, 0.9, heroFloorZ(T(f))] },
  { f: 360, cInf: 15 },
  { f: 398, cInf: 13 },
  { f: 545, cInf: 8, focus: (f) => { const h = twigHero(T(f)); return [h.x, h.y + 0.8, h.z]; } },
  { f: 586, cInf: 12, focus: (f) => { const h = twigHero(Math.min(T(f), 20.3)); return [h.x, h.y + 0.8, h.z]; } },
  { f: 612, cInf: 0 },
  { f: 645, cInf: 10, focus: (f) => [KEY[0] + 0.8, climbY(T(f)) + 1, KEY[2]] },
  { f: 693, cInf: 0 },
  { f: 752, cInf: 12 },
  { f: 785, cInf: 10 },
  { f: 816, cInf: 14 },
  { f: 920, cInf: 4, focus: () => [BITE[0] + 6, LEAF_Y + 1.5, BITE[2] + 28] },
  { f: 1053, cInf: 6 },
  { f: 1250, cInf: 0 },
  { f: 1300, cInf: 12, focus: () => [PUPPET[0], 1.0, PUPPET[2]] },
  { f: 1560, cInf: 12 },
  { f: 1640, dur: 36, cInf: 6 },
  { f: 1700, cInf: 0 },
  { f: 1822, cInf: 13, focus: () => [TWO[0] + 1.2, 0.9, TWO[2] + 0.3] },
  { f: 1850, cInf: 6, focus: (f) => [CX, BRANCH_TOP + 1, columnZ(T(f) - 45) - 20] },
  { f: 1978, cInf: 12, focus: () => [PAIR[0], PAIR[1] + 1, PAIR[2]] },
  { f: 2008, dur: 40, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];

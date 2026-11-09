// Who is where in every shot of the zombie-ant short: cards from ant.ts placed in the forest of forest.ts.
// Same contract as the bridge cast (cast.ts Pool/Actor/Fx): every frame each character asks for a drawing (key + draw);
// identical drawings share one canvas. Ant cards are yaw billboards (side views), rolled to climb or hang.
import * as THREE from "three";
import { Pen, Expr, fxBurst, fxContact } from "./toon";
import { antSide, AntLook, AntOpts, WORKER, WORKERS, zombieOf, fxSpore, fxPuff, fxPuppetBar, fxResearcher, fxRain, fxCompass } from "./ant";
import type { Place, FxPlace, CamInfo, Stage } from "./cards";
import {
  FPS, SHOTS, KEY, LEAF_Y, LEAF_X0, LEAF_LEN, BITE, CX, BRANCH_TOP, TWIG_X, twigY, FOSSIL, SLAB, V3, smooth, clamp01,
  zombieZ, columnZ, heroFloorZ, SPORE_T, SPORE_Z, twigHero, CLIMB_T, ARRIVE_T, climbY, BITE_T, LETGO_T, STALK_T, RAIN_T,
  PUPPET_T, LEAD, HERO5, PUPPET, TWO, PAIR,
} from "./story";
import type { Graves } from "./forest";

// ---------------- card geometry ----------------
export const SU = 0.0022; // metres per design unit: an ant card 1000 units wide = 2.2 m
export const ANT_GEO = (() => { const g = new THREE.PlaneGeometry(1000 * SU, 600 * SU); g.translate(0, (575 - 300) * SU, 0); return g; })();
/** puppet card: the control cross on top, strings, the ant at the bottom (1000 x 1600 design, feet on y = 1575) */
export const PUPPET_GEO = (() => { const g = new THREE.PlaneGeometry(1000 * SU, 1600 * SU); g.translate(0, (1575 - 800) * SU, 0); return g; })();

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const tier = (d: number): [number, number, number] =>
  d < 4 ? [1600, 960, 1.6] : d < 9 ? [1000, 600, 1.0] : d < 22 ? [500, 300, 0.5] : [250, 150, 0.25];

// ---------------- light + life ----------------
/** canvas angle the sun comes FROM on a camera-facing card, in 45-degree steps */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const s = cam.sun ?? new THREE.Vector3(0.5, 0.8, 0.3);
  const sx = s.dot(cam.right) * (mirror ? -1 : 1), sy = -s.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};

/** an ant card at (x, y, z) walking along world direction (dx, dz); roll = extra screen rotation (climb, hang) */
const ant = (cam: CamInfo, i: number, o: AntLook, x: number, y: number, z: number, dx: number, dz: number, opts: AntOpts, roll = 0, scale = 1): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 0.6, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = dx * cam.right.x + dz * cam.right.z < 0;
  const o2: AntOpts = { seed: (i % 7) + 1, ...opts, light: light2D(cam, mirror) };
  return { key: `A|${fkey(o)}|${fkey(o2)}`, draw: (p) => antSide(p, o, o2), x, y, z, mirror, roll: mirror ? -roll : roll, scale, size: [w, h, k] };
};
const blob = (out: Stage, x: number, y: number, z: number, s = 1) =>
  out.fx.push({ key: "blob|contact|#3a3550", cw: 128, ch: 128, draw: (p) => fxContact(p, "#3a3550"), x, y: y + 0.03, z, w: 2.6 * s, h: 1.1 * s, flat: true, rot: 0 });

// ---------------- groups ----------------
/** a column of workers along the canopy branch (front at zF, marching toward +z) */
const column = (cam: CamInfo, t: number, zF: number, n: number, out: Stage, exprs: (i: number) => Expr) => {
  for (let i = 0; i < n; i++) {
    const z = zF - i * 3.1 - hh(i) * 0.6, x = CX + (hh(i, 2) - 0.5) * 1.2;
    const ph = q(((t * 1.6 + hh(i, 3)) % 1), 24);
    out.places.push(ant(cam, i, WORKERS[i % 3], x, BRANCH_TOP, z, 0, 1, { phase: ph, expr: exprs(i), blink: lidAt(t, i), look: 0 }));
    blob(out, x, BRANCH_TOP - 0.02, z, 0.9);
  }
};
/** leaf underside height at a point along the key leaf (the blade droops toward its tip) */
const keyLeafY = (x: number) => { const u = clamp01((x - LEAF_X0) / LEAF_LEN); return LEAF_Y + 0.6 - 0.06 * LEAF_LEN * u * u - 0.1; };
/** the hero hanging under the key leaf, jaws on the midrib */
const hanging = (cam: CamInfo, t: number, out: Stage, opts: AntOpts, z = 1) => {
  out.places.push(ant(cam, 1, zombieOf(WORKER, z), BITE[0], keyLeafY(BITE[0]), BITE[2], 1, 0, opts, Math.PI));
};

// ---------------- stage ----------------
export const stageAnts = (id: number, t: number, cam: CamInfo, graves: Graves): Stage => {
  const out: Stage = { places: [], fx: [] };
  const P = out.places, F = out.fx;
  const s = SHOTS[id - 1];
  switch (id) {
    case 1: { // the hook zombie shambles down the trail; spores drift in the air
      const z = zombieZ(t);
      P.push(ant(cam, 4, zombieOf(WORKER, 0.9), 0, 0, z, 0, 1, { phase: q((t * 0.8) % 1, 24), mode: "walk", expr: "dazed", blink: 0 }));
      blob(out, 0, 0, z);
      for (let k = 0; k < 7; k++) {
        const u = (t * 0.12 + hh(k, 1)) % 1;
        F.push({ key: "spore", cw: 200, ch: 200, draw: (p) => fxSpore(p), x: -3 + 6 * hh(k, 2), y: 0.6 + 3.5 * u, z: z - 2 + 5 * hh(k, 3), w: 0.35, h: 0.35, soft: true });
      }
      break;
    }
    case 2: { // tiny foragers on the trail far below the saplings
      for (let i = 0; i < 8; i++) {
        const z = 10 + i * 7 + 2.2 * t % 7;
        P.push(ant(cam, i, WORKERS[i % 3], (hh(i) - 0.5) * 2, 0, z, 0, 1, { phase: q((t * 1.6 + hh(i, 3)) % 1, 24), expr: "neutral" }));
      }
      break;
    }
    case 3: column(cam, t, columnZ(t), 18, out, (i) => (["grin", "smile", "neutral", "smile_closed"] as Expr[])[i % 4]); break;
    case 4: { // the hero walks the floor trail alone and steps on a spore
      const z = heroFloorZ(t), hit = t >= SPORE_T - LEAD;
      const expr: Expr = !hit ? "smile" : t < SPORE_T + 0.7 ? "shock" : "nervous";
      P.push(ant(cam, 1, WORKER, 0, 0, z, 0, 1, { phase: q((t * 1.5) % 1, 24), expr, blink: hit ? 0 : lidAt(t, 1) }));
      blob(out, 0, 0, z);
      if (!hit) F.push({ key: "spore", cw: 200, ch: 200, draw: (p) => fxSpore(p), x: 0.35, y: 0.2, z: SPORE_Z + 0.25, w: 0.38, h: 0.38 });
      else if (t < SPORE_T + 0.6) { const u = q((t - SPORE_T) / 0.6, 30); F.push({ key: `puff${u}`, cw: 400, ch: 400, draw: (p) => fxPuff(p, u), x: 0.45, y: 0.25, z: SPORE_Z + 0.25, w: 1.0, h: 1.0 }); }
      break;
    }
    case 5: { // x-ray: threads spread through the body, the brain stays clean
      const th = smooth((t - 14.3) / 1.6), brain = t >= 16.9 - LEAD;
      P.push(ant(cam, 1, zombieOf(WORKER, 0.25 * th), HERO5[0], HERO5[1], HERO5[2], 1, 0, { mode: "stand", expr: brain ? "neutral" : "nervous", threads: q(th, 20), brain, blink: lidAt(t, 1), look: brain ? -1 : 0 }));
      blob(out, HERO5[0], 0, HERO5[2]);
      break;
    }
    case 6: { // the twig: the others march on, the hero wanders off, shakes and drops
      for (let i = 0; i < 5; i++) {
        const z = -10 + 2.4 * (t - 15.5) - 3.3 * (i + 1);
        const dy = (twigY(z + 0.5) - twigY(z - 0.5));
        P.push(ant(cam, 10 + i, WORKERS[i % 3], TWIG_X, twigY(z), z, 0, 1, { phase: q((t * 1.6 + hh(i, 3)) % 1, 24), expr: i % 2 ? "neutral" : "smile", blink: lidAt(t, 10 + i) }, Math.atan(dy)));
      }
      const h = twigHero(t);
      const zk = h.mode === "walk" ? 0.3 : 0.55;
      const expr: Expr = h.mode === "walk" ? (t > 18.42 - LEAD ? "dazed" : "neutral") : h.mode === "shake" ? "dazed" : "shock";
      const dy = twigY(h.z + 0.5) - twigY(h.z - 0.5);
      P.push(ant(cam, 1, zombieOf(WORKER, zk), h.x, h.y, h.z, h.mode === "walk" ? 0.2 : 0.4, 1, { phase: q((t * (h.mode === "shake" ? 3 : 1.3)) % 1, 30), mode: h.mode === "fall" ? "stand" : h.mode, expr, blink: 0 }, h.mode === "fall" ? h.tilt : Math.atan(dy)));
      if (h.mode === "fall" && h.y <= 0.01 && t < 21.1) { const u = q((t - 20.98) / 0.4, 30); if (u >= 0) F.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: h.x, y: 0.6, z: h.z, w: 1.8, h: 1.8 }); }
      break;
    }
    case 7: { // up the stem (head up), then out under the leaf (upside down); a compass on "Nordseite"
      const stemR = 0.75;
      if (t < ARRIVE_T + 0.1) {
        const y = climbY(t);
        // on the stem face toward the camera, rolled 90 deg so the head points up
        const toCam = Math.atan2(cam.pos.z - KEY[2], cam.pos.x - KEY[0]);
        P.push(ant(cam, 1, zombieOf(WORKER, 0.6), KEY[0] + Math.cos(toCam) * stemR, y, KEY[2] + Math.sin(toCam) * stemR, cam.right.x, cam.right.z,
          { phase: q((t * 1.8) % 1, 24), expr: "dazed", blink: 0 }, Math.PI / 2));
      } else {
        const u = smooth((t - ARRIVE_T) / 1.3), x = KEY[0] + 1.2 + (BITE[0] - KEY[0] - 1.2) * u;
        P.push(ant(cam, 1, zombieOf(WORKER, 0.7), x, keyLeafY(x), BITE[2], 1, 0, { phase: q((t * 1.6) % 1, 24), mode: u < 1 ? "walk" : "stand", expr: "dazed", blink: 0 }, Math.PI));
      }
      if (t >= 25.16 - LEAD - 0.1 && t < 26.3) {
        const k = smooth((t - 25.06) / 0.2), sw = q(Math.sin((t - 25.06) * 9) * Math.exp(-(t - 25.06) * 2.5), 20);
        F.push({ key: `compass${sw}`, cw: 400, ch: 400, draw: (p) => fxCompass(p, sw), x: BITE[0] - 1.0 + cam.right.x * 1.6, y: LEAF_Y - 2.4, z: BITE[2] + cam.right.z * 1.6, w: 1.5 * k, h: 1.5 * k });
      }
      break;
    }
    case 8: { // the noon bite; never lets go
      const bit = t >= BITE_T - LEAD;
      const expr: Expr = !bit ? "dazed" : t < BITE_T + 0.6 ? "shock" : "dazed";
      const blink = t >= LETGO_T + 0.4 ? 1 : 0;
      hanging(cam, t, out, { mode: bit ? "grip" : "stand", expr, blink, phase: 0 }, 0.85 + 0.15 * smooth((t - BITE_T) / 2));
      if (bit && t < BITE_T + 0.4) { const u = q((t - BITE_T) / 0.4, 30); F.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: BITE[0] + (cam.right.x > 0 ? 0.9 : -0.9), y: keyLeafY(BITE[0]) - 0.35, z: BITE[2] + 0.2, w: 1.4, h: 1.4 }); }
      break;
    }
    case 9: { // relief: the researcher's face looms behind the leaf
      hanging(cam, t, out, { mode: "grip", expr: "dazed", blink: 1 });
      const ex: Expr = t < 33.32 - LEAD ? "relief" : "smile_closed";
      const lid = lidAt(t, 50);
      F.push({ key: `res|${ex}|${lid}`, cw: 1000, ch: 1000, draw: (p) => fxResearcher(p, ex, lid), x: BITE[0] + 6, y: LEAF_Y + 1.5, z: BITE[2] + 28, w: 24, h: 24 });
      break;
    }
    case 10: { // a worker on the fossil slab, staring at the 48-million-year-old bites
      const ex: Expr = t < 41.36 - LEAD ? "neutral" : "shock";
      P.push(ant(cam, 3, WORKERS[1], FOSSIL[0] + 15, SLAB.h, FOSSIL[2] - 1, -1, 0, { mode: "stand", expr: ex, blink: lidAt(t, 3), look: 1 }));
      blob(out, FOSSIL[0] + 15, SLAB.h, FOSSIL[2] - 1);
      break;
    }
    case 11: { // the marionette
      const pull = t >= PUPPET_T - LEAD, fast = t >= 49.6 - LEAD;
      const pose = pull ? q(((t - PUPPET_T) * (fast ? 1.6 : 0.7)) % 1, 30) : 0;
      const drop = q(smooth((t - (PUPPET_T - 0.3)) / 0.5), 20);
      const brain = !pull;
      const expr: Expr = brain ? "nervous" : fast ? "dazed" : "neutral";
      const lid = lidAt(t, 1), light = light2D(cam, false);
      const sway = q(Math.sin(t * 2.3) * 0.6, 20);
      P.push({ key: `pup|${pose}|${drop}|${expr}|${lid}|${sway}|${light}`, geo: "swing", x: PUPPET[0], y: PUPPET[1] + (pull ? 0.25 + 0.15 * Math.sin(t * 6) * (fast ? 1 : 0.4) : 0), z: PUPPET[2],
        draw: (p) => puppet(p, pose, drop, expr, lid, sway, brain, light), size: [1000, 1600, 1] });
      blob(out, PUPPET[0], 0, PUPPET[2]);
      break;
    }
    case 12: { // days later: the stalk out of the head, spores raining onto the trail below
      const st = q(smooth((t - STALK_T) / 1.4), 30);
      hanging(cam, t, out, { mode: "dead", expr: "dazed", blink: 1, stalk: st });
      if (t >= RAIN_T) {
        const u = q(((t - RAIN_T) * 0.5) % 1, 60);
        for (let k = 0; k < 4; k++)
          F.push({ key: `rain${q((u + k * 0.25) % 1, 60)}`, cw: 400, ch: 800, draw: (p) => fxRain(p, q((u + k * 0.25) % 1, 60)), x: BITE[0] - 0.8, y: LEAF_Y - 4 - k * 11, z: BITE[2], w: 4, h: 11, soft: true });
      }
      break;
    }
    case 13: {
      if (t < 60.75 - LEAD) { // the graveyard: dead ants under the leaves of every sapling
        let i = 0;
        for (const g of graves) for (const L of g.leaves) {
          for (const k of [0.38, 0.62]) {
            if (hh(i, 7) < 0.3) { i++; continue; }
            const along = 0.75 + k * L.L, x = g.x + Math.cos(L.yaw) * along, z = g.z - Math.sin(L.yaw) * along;
            const y = L.y - Math.sin(L.tilt) * along * 0.9 - 0.14 * L.L * k * k - 0.2;
            P.push(ant(cam, 60 + i, zombieOf(WORKERS[i % 3], 1), x, y, z, Math.cos(L.yaw), -Math.sin(L.yaw), { mode: "dead", expr: "dazed", blink: 1, stalk: hh(i, 4) < 0.5 ? 1 : 0.6 }, Math.PI));
            i++;
          }
        }
      } else { // ... and only two alive, very nervous
        for (const [k, dx, dz] of [[0, 0, 0], [1, 2.4, 0.6]] as const) {
          const look = Math.round(Math.sin(t * 3 + k * 2));
          P.push(ant(cam, 20 + k, WORKERS[k], TWO[0] + dx, 0, TWO[2] + dz, k ? -1 : 1, 0.15, { mode: "stand", expr: "nervous", blink: lidAt(t, 20 + k), look }));
          blob(out, TWO[0] + dx, 0, TWO[2] + dz);
        }
      }
      break;
    }
    case 14: { // golden canopy: the column, then the pair who learned the rule
      column(cam, t, columnZ(t - 45) - 20, 14, out, (i) => (["smile", "grin", "smile_closed", "neutral"] as Expr[])[i % 4]);
      const nod = t >= 66.09 - LEAD && t < 67.0 ? Math.abs(Math.sin((t - 66.0) * 9)) * 0.12 : 0;
      const scared = t >= 67.9 - LEAD;
      for (const [k, dz] of [[0, 0], [1, 2.6]] as const) {
        P.push(ant(cam, 30 + k, WORKERS[k + 1], PAIR[0] + (k ? 0.5 : -0.3), PAIR[1] + nod, PAIR[2] + dz, k ? -1 : 1, 0.2,
          { mode: "stand", expr: scared ? "nervous" : t >= 66.09 - LEAD ? "grin" : "smile", blink: lidAt(t, 30 + k), look: scared ? 1 : 0 }));
        blob(out, PAIR[0] + (k ? 0.5 : -0.3), PAIR[1], PAIR[2] + dz, 0.9);
      }
      break;
    }
  }
  void s;
  return out;
};

/** marionette card: cross + strings + the puppet ant (strings end at its feet, head and abdomen) */
const puppet = (p: Pen, pose: number, drop: number, expr: Expr, lid: number, sway: number, brain: boolean, light: number) => {
  const g = p.g;
  g.save(); g.translate(0, 1000); antSide(p, WORKER, { mode: brain ? "stand" : "puppet", pose, expr, blink: lid, brain, light, seed: 2 }); g.restore();
  if (drop <= 0) return;
  g.save(); g.translate(0, -700 * (1 - drop));
  const two = Math.PI * 2;
  const feet: [number, number][] = [0, 1, 2].map((i) => {
    const hips = [495, 545, 595][i], reach = [-200, -40, 235][i], a = Math.sin(two * (pose + i * 0.33));
    return [hips + reach + 40 * a, 1000 + 575 - 30 - 60 * Math.max(0, a) + 700 * (1 - drop)] as [number, number];
  });
  fxPuppetBar(p, sway, [...feet, [735, 1000 + 190 + 700 * (1 - drop)], [300, 1000 + 270 + 700 * (1 - drop)]]);
  g.restore();
};
export type { FxPlace };

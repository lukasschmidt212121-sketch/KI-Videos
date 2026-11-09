// The rainforest at ant scale as one three.js scene: sky, leaf-litter floor with the ants' trail, saplings with big
// leaves (the infected one and the graveyard), giant trunks fading into the haze, the canopy branch the colony walks
// on, a low twig over the trail, and the Messel fossil slab far away for the golden beat.
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f), like the bridge World.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, V, lam, Kit } from "./build";
import { ctex, rng, rep, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx } from "./cards";
import { stageAnts, ANT_GEO, PUPPET_GEO } from "./antcast";
import { fossilSlab } from "./ant";
import {
  FPS, SHOTS, ShotDef, KEY, LEAF_Y, LEAF_X0, LEAF_LEN, CX, CY, CR, TWIG_X, twigY, FOSSIL, SLAB, GRAVES, camAt,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures ----------------
const litterTex = () => ctex("litter", 1024, 1024, (g, r) => {
  g.fillStyle = "#8a6a45"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) {
    const x = r() * 1024, y = r() * 1024, s = 3 + r() * 14;
    g.fillStyle = r() < 0.5 ? "rgba(70,48,30,0.35)" : "rgba(170,132,86,0.3)";
    g.beginPath(); g.ellipse(x, y, s, s * 0.6, r() * 3, 0, Math.PI * 2); g.fill();
  }
  // small fallen leaflets and crumbs painted in
  const cols = ["#b0763d", "#9a6233", "#c48b4b", "#7d5a35", "#a8873f"];
  for (let i = 0; i < 70; i++) {
    const x = r() * 1024, y = r() * 1024, L = 30 + r() * 60, a = r() * Math.PI * 2;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.45, L, 0); g.quadraticCurveTo(0, L * 0.45, -L, 0); g.fill();
    g.strokeStyle = "rgba(60,38,22,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
    g.restore();
  }
});
const trailTex = () => ctex("trail", 512, 512, (g, r) => {
  g.fillStyle = "#b8936a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 500; i++) {
    const x = r() * 512, y = r() * 512, s = 2 + r() * 6;
    g.fillStyle = r() < 0.5 ? "rgba(120,88,58,0.35)" : "rgba(214,184,140,0.4)";
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
});
const barkTex = (key: string, base: string, dark: string) => ctex(key, 512, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 46; i++) {
    const x = r() * 512, w = 4 + r() * 10;
    g.strokeStyle = dark; g.globalAlpha = 0.35 + 0.3 * r(); g.lineWidth = w;
    g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 1024; y += 64) g.lineTo(x + 14 * Math.sin(y * 0.01 + i), y); g.stroke();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(122,150,86,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 1024, 18 + r() * 30, 10 + r() * 16, 0, 0, Math.PI * 2); g.fill(); }
});
/** leaf: base colour, lighter midrib + secondary veins, darker rim (u along the leaf, v across) */
const leafTex = (key: string, base: string, vein: string, rim: string) => ctex("leaf_" + key, 1024, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, rim); gr.addColorStop(0.18, "rgba(0,0,0,0)"); gr.addColorStop(0.82, "rgba(0,0,0,0)"); gr.addColorStop(1, rim);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = vein; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 256); g.lineTo(1024, 256); g.stroke();
  g.lineWidth = 5;
  for (let k = 0; k < 10; k++) for (const s of [-1, 1]) {
    const x0 = 40 + k * 96; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0 + 60, 256 + s * 110, x0 + 130, 256 + s * 230); g.stroke();
  }
});
const stemTex = () => ctex("stem", 256, 512, (g, r) => {
  g.fillStyle = "#6e9a45"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 30; i++) { g.strokeStyle = "rgba(60,96,40,0.5)"; g.lineWidth = 3 + r() * 4; const x = r() * 256; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 512); g.stroke(); }
});
const shaleTex = () => ctex("shale", 512, 512, (g, r) => {
  g.fillStyle = "#8f8a80"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) { g.strokeStyle = "rgba(60,56,50,0.35)"; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(0, i * 37 + r() * 10); g.lineTo(512, i * 37 + r() * 10); g.stroke(); }
});

// ---------------- geometry helpers ----------------
/** leaf blade pointing +x from the origin: length L, half-width W, droop (tip falls), curl (edges rise) */
export const leafGeo = (L: number, W: number, droop = 0.15, curl = 0.18, nu = 18, nv = 8) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, w = W * Math.sin(Math.PI * Math.min(1, u ** 0.75)) * (1 - 0.15 * u);
    for (let j = 0; j <= nv; j++) {
      const v = (j / nv) * 2 - 1;
      pos.push(u * L, -droop * L * u * u + curl * w * v * v, v * Math.max(w, 0.02));
      uv.push(u, 0.5 + 0.5 * v);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const M4 = (x: number, y: number, z: number, ry = 0, rz = 0, rx = 0, s = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YZX")), V(s, s, s));
const cyl = (r0: number, r1: number, h: number, seg = 12) => new THREE.CylinderGeometry(r1, r0, h, seg, 1, true).translate(0, h / 2, 0);

type LeafSpot = { y: number; yaw: number; L: number; tilt: number };
/** a sapling: stem + leaves. Returns the leaf spots (world) so cast.ts can hang dead ants under them. */
const sapling = (b: Batch, mats: Record<string, THREE.Material>, x: number, z: number, h: number, yaw: number, seed: number, key = false) => {
  const r = rng(seed), stemR = 0.55 + 0.25 * r();
  b.add(cyl(stemR, stemR * 0.6, h + 2, 10), mats.stem, M4(x, 0, z));
  const leaves: LeafSpot[] = [];
  const n = key ? 4 : 3 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const y = key ? (k === 0 ? LEAF_Y + 0.6 : LEAF_Y - 16 - k * 7) : h - 3 - k * (5 + r() * 4);
    const ya = key && k === 0 ? 0 : yaw + k * 2.2 + r() * 0.8;
    const L = key && k === 0 ? LEAF_LEN : 14 + r() * 10, W = L * 0.26, tilt = key && k === 0 ? 0.04 : 0.15 + 0.2 * r();
    const geo = leafGeo(L, W, key && k === 0 ? 0.06 : 0.14, 0.18);
    b.add(geo, k % 2 ? mats.leafB : mats.leafA, M4(x + Math.cos(ya) * stemR, y, z - Math.sin(ya) * stemR, ya, tilt));
    leaves.push({ y, yaw: ya, L, tilt });
  }
  return leaves;
};

export type Graves = { x: number; z: number; leaves: LeafSpot[] }[];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private puppet: Actor;
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  graves: Graves = [];

  constructor(_kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    const disc = ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const halo = ctex("sunHalo", 256, 256, (g) => {
      const im = g.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const u = Math.hypot(x - 127.5, y - 127.5) / 128;
        const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
        const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
      }
      g.putImageData(im, 0, 0);
    });
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 1500 + (i % 3) * 150;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 380 + (i % 4) * 80;
      m.position.set(Math.cos(a) * d, 520 + (i % 4) * 90, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    const M: Record<string, THREE.Material> = {};
    M.litter = lam("litterM", () => ({ map: rep(litterTex(), 1, 1) }));
    M.trail = lam("trailM", () => ({ map: rep(trailTex(), 1, 1) }));
    M.stem = lam("stemM", () => ({ map: stemTex() }));
    M.leafA = lam("leafA", () => ({ map: leafTex("a", "#4f9a3e", "#9fd07a", "rgba(30,70,30,0.55)"), side: THREE.DoubleSide }));
    M.leafB = lam("leafB", () => ({ map: leafTex("b", "#3f8a44", "#8cc471", "rgba(22,60,30,0.55)"), side: THREE.DoubleSide }));
    M.dry = lam("leafDry", () => ({ map: leafTex("dry", "#b98345", "#e0b27a", "rgba(90,50,24,0.5)"), side: THREE.DoubleSide }));
    M.dry2 = lam("leafDry2", () => ({ map: leafTex("dry2", "#a3713b", "#cf9d63", "rgba(80,44,20,0.5)"), side: THREE.DoubleSide }));
    M.trunk = lam("trunkM", () => ({ map: rep(barkTex("bark", "#7c6250", "#4b382d"), 3, 2) }));
    M.branch = lam("branchM", () => ({ map: rep(barkTex("bark2", "#8a6b52", "#55402f"), 1, 6) }));
    M.twig = lam("twigM", () => ({ map: rep(barkTex("bark3", "#b08a62", "#6e5238"), 1, 3) }));
    M.pebble = lam("pebble", () => ({ color: "#a59c90" }));
    M.shale = lam("shaleM", () => ({ map: rep(shaleTex(), 4, 4) }));
    M.slabTop = lam("slabTop", () => ({ map: ctex("fossilSlab", 1600, 1000, (g) => fossilSlab(g, 29)) }));
    M.moss = lam("moss", () => ({ color: "#6f9a4a" }));
    for (const k of ["litter", "trail"]) { const m = M[k] as THREE.MeshLambertMaterial; if (m.map) { m.map.anisotropy = 16; } }

    const b = new Batch();
    // ---- floor: litter plane (tiles every 24 m), the trail strip along z ----
    const ground = new THREE.PlaneGeometry(3600, 3600, 1, 1).rotateX(-Math.PI / 2);
    ground.attributes.uv.array.forEach((_, i, a) => { (a as Float32Array)[i] *= 150; });
    b.add(ground, M.litter);
    const trail = new THREE.PlaneGeometry(5.5, 600, 1, 1).rotateX(-Math.PI / 2);
    (trail.attributes.uv.array as Float32Array).forEach((v, i, a) => { a[i] = i % 2 ? v * 110 : v; });
    b.add(trail, M.trail, M4(0, 0.03, 40));
    // fallen leaves and pebbles on the floor (kept off the trail and away from the key sapling's foot)
    const r = rng(7);
    for (let i = 0; i < 170; i++) {
      const x = (r() - 0.5) * 360, z = (r() - 0.5) * 360 + 40;
      if (Math.abs(x) < 5 || Math.hypot(x - KEY[0], z - KEY[2]) < 6 || Math.hypot(x - TWIG_X, z) < 4) continue;
      const L = 8 + r() * 16;
      b.add(leafGeo(L, L * 0.28, -0.02, 0.12, 10, 6), i % 2 ? M.dry : M.dry2, M4(x, 0.08 + 0.02 * (i % 5), z, r() * 6.28, 0, 0));
    }
    for (let i = 0; i < 60; i++) {
      const x = (r() - 0.5) * 300, z = (r() - 0.5) * 300 + 40;
      if (Math.abs(x) < 4.5 || Math.hypot(x - KEY[0], z - KEY[2]) < 5) continue;
      const s = 0.8 + r() * 2.6;
      b.add(new THREE.IcosahedronGeometry(1, 1).scale(s * 1.3, s * 0.7, s), M.pebble, M4(x, s * 0.35, z, r() * 3));
    }
    // ---- saplings: the key one, the graveyard, a scatter further out ----
    this.graves = GRAVES.map((gv, i) => ({ x: gv.x, z: gv.z, leaves: sapling(b, M, gv.x, gv.z, gv.h, gv.yaw, 31 + i, i === 0) }));
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = 70 + r() * 260, x = Math.cos(a) * d, z = 40 + Math.sin(a) * d;
      if (Math.abs(x) < 8 && z < 120) continue;
      sapling(b, M, x, z, 30 + r() * 60, r() * 6.28, 100 + i);
    }
    b.build(R);
    // ---- giant trunks in the haze (no shadows: at ant scale they would black out whole shots) ----
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2, d = 260 + (i % 4) * 110, rr = 26 + (i % 3) * 16;
      const x = Math.cos(a) * d, z = 40 + Math.sin(a) * d;
      b.add(cyl(rr * 1.35, rr, 1600, 20), M.trunk, M4(x, 0, z));
      for (let k = 0; k < 4; k++) b.add(new THREE.ConeGeometry(rr * 0.6, rr * 1.4, 4).translate(0, rr * 0.7, 0), M.trunk, M4(x + Math.cos(k * 1.57) * rr, 0, z + Math.sin(k * 1.57) * rr, k * 1.57, 0, 0, 1));
    }
    b.build(R, false);
    // ---- canopy branch + side twigs with leaves ----
    const br = new THREE.CylinderGeometry(CR, CR * 1.1, 520, 18, 1, true).rotateX(Math.PI / 2);
    b.add(br, M.branch, M4(CX, CY, 0));
    const rc = rng(21);
    for (let k = 0; k < 26; k++) {
      const z = -240 + k * 19 + rc() * 6, s = k % 2 ? 1 : -1, len = 18 + rc() * 22;
      const tw = new THREE.CylinderGeometry(0.5, 1.2, len, 8, 1, true).translate(0, len / 2, 0);
      const m = M4(CX, CY, z, 0, s * (1.0 + 0.4 * rc()), (rc() - 0.5) * 0.6);
      b.add(tw, M.branch, m);
      const tip = V(0, len, 0).applyMatrix4(m);
      for (let j = 0; j < 4; j++) b.add(leafGeo(14 + rc() * 8, 4.2, 0.18, 0.2), j % 2 ? M.leafA : M.leafB, M4(tip.x, tip.y - 2 + j, tip.z + (rc() - 0.5) * 6, rc() * 6.28, -0.3 + 0.4 * rc()));
    }
    // moss pads on the branch top (break up the long cylinder)
    for (let k = 0; k < 30; k++) b.add(new THREE.SphereGeometry(1, 10, 6).scale(1.6 + rc() * 2, 0.4, 2 + rc() * 4), M.moss, M4(CX + (rc() - 0.5) * 3.6, CY + CR * 0.9, -240 + k * 16 + rc() * 8));
    // ---- low twig over the trail (shot 6) ----
    const pts: THREE.Vector3[] = [];
    for (let z = -46; z <= 46; z += 4) pts.push(V(TWIG_X, twigY(z) - 0.75, z));
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.75, 10, false), M.twig);
    // ---- fossil slab (golden beat) with shale scatter ----
    const [fx, , fz] = FOSSIL;
    b.add(new THREE.BoxGeometry(SLAB.w, SLAB.h, SLAB.d).translate(0, SLAB.h / 2, 0), M.shale, M4(fx, 0, fz));
    b.add(new THREE.PlaneGeometry(SLAB.w, SLAB.d).rotateX(-Math.PI / 2), M.slabTop, M4(fx, SLAB.h + 0.02, fz));
    const rs = rng(5);
    for (let i = 0; i < 50; i++) {
      const a = rs() * 6.28, d = 62 + rs() * 140, sz = 2 + rs() * 7;
      b.add(new THREE.IcosahedronGeometry(1, 1).scale(sz * 1.4, sz * 0.6, sz), M.pebble, M4(fx + Math.cos(a) * d, sz * 0.3, fz + Math.sin(a) * d, rs() * 3));
    }
    b.build(R);
    this.puppet = new Actor(R, PUPPET_GEO);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root, ANT_GEO)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 4000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 140);
    if (s.light === "golden") Rr = Math.max(Rr, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 400); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 900; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky + fog per place: the forest floor sits in a green-gold haze, the canopy in open sky ----
    const su = this.skyMat.uniforms;
    const floor = s.place === "floor";
    // under the canopy the shade is green-grey forest light (bounce off leaves), not open-sky violet
    if (floor) { TONE.uShadeCol.value.set(0.4, 0.42, 0.38); TONE.uShadeLift.value.set(0.05, 0.07, 0.05); }
    const skyC = floor ? ["#c9dca8", "#b7d3a6", "#93c0d8", "#6ea4dd", "#4f8cdb"] : K.sky.c;
    skyC.forEach((h, i) => untone(h, su["c" + i].value));
    const e = (floor ? [0, 6, 18, 35, 60] : K.sky.e).map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    const fog = floor ? { c: "#c3d7a0", n: 30, f: 420 } : s.place === "canopy" ? { c: s.light === "golden" ? L.fog : "#c9dcef", n: 60, f: id === 14 ? 900 : 520 } : { c: L.fog, n: 60, f: 480 };
    untone(fog.c, this.fog.color); this.fog.near = fog.n; this.fog.far = fog.f;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" || id === 8;
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 2000);
      this.sunDisc.scale.setScalar(2 * 2000 * Math.tan(THREE.MathUtils.degToRad(id === 8 ? 2.4 : 1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 2000 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(id === 8 ? "#fff1c8" : L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stageAnts(id, t, { pos: cam.position, right, sun: sunDir }, this.graves);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (p.geo !== "swing" && !this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 0.6 * sc2, p.z), 3 * sc2))) continue;
      const a = p.geo === "swing" ? this.puppet : this.actor(ai++);
      const [w, h, k] = p.size ?? [500, 300, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    if (!used.includes(this.puppet)) this.puppet.mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}
export { twoTone, mergeGeometries };

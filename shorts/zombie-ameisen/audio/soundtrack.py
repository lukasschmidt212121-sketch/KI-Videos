"""Soundtrack for "Die Zombieapokalypse, die seit 48 Millionen Jahren läuft": an original creepy-comic score
(pizzicato ostinato in D minor, vibraphone motif, music box, marionette waltz, timpani stings), synthesized SFX on the
picture's event times (story.ts), forest/canopy ambience, and the mix: music ducked under the voice, standard levels
(music +3 dB, SFX -6 dB, voice unchanged), true-peak limited. Writes mix.wav (48 kHz, exact length) + stems.
Usage: python soundtrack.py <shorts/zombie-ameisen>"""
import json, os, sys
import numpy as np
from scipy import signal, ndimage
from dsp import SR, ns, tt, rng, lp, hp, bp, dbg, fades, pan, st, place, make_ir, convolve_st, integrated, true_peak, write_wav, read_wav, momentary_max
from instruments import m2f, pluck, vibes, glock, musicbox, pad, timpani, cymbal, triangle, snare, brush
from sfx_gen import whoosh, bubbles, breeze, bird_chirps, crickets, wood_crack, clink, rattle, creak

ROOT = sys.argv[1]
FPS = 30
TOTAL = 2085
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS

# ---------------- picture timeline (mirrors remotion/src/videos/ants/story.ts) ----------------
SHOTS = {1: (0, 91, "floor"), 2: (91, 160, "floor"), 3: (160, 327, "canopy"), 4: (327, 398, "floor"), 5: (398, 545, "floor"),
         6: (545, 645, "floor"), 7: (645, 785, "floor"), 8: (785, 920, "floor"), 9: (920, 1057, "floor"), 10: (1057, 1300, "fossil"),
         11: (1300, 1560, "floor"), 12: (1560, 1700, "floor"), 13: (1700, 1850, "floor"), 14: (1850, TOTAL, "canopy")}
CUTS = [91, 160, 222, 290, 327, 360, 398, 545, 586, 612, 645, 693, 752, 785, 816, 920, 1057, 1250, 1300, 1398, 1560, 1700, 1822, 1850, 1978, 2008]
GLIDES = [(55, 26), (494, 24), (868, 28), (995, 22), (1180, 36), (1486, 26), (1640, 36), (2008, 40)]  # (start f, dur)
FLASH = fr(91)
SPORE_T, LEAVE_T, SHAKE_T, FALL_T = 12.5, 18.42, 19.64, 20.46
CLIMB_T, ARRIVE_T, NORTH_T = 21.7, 23.3, 25.16
BITE_T, LETGO_T = 27.28, 29.4
THREADS_T, BRAIN_T = 14.3, 16.9
PUPPET_T, PULL_T = 46.4, 49.6
STALK_T, RAIN_T = 53.2, 54.6
ALIVE_T, STAY_T, GRAVE_T = 60.84, 66.09, 67.9
LAND_T = FALL_T + 0.55

R = rng(48)


def buf():
    return np.zeros((2, N))


# ================================================================ music
BPM = 96.0
BEAT = 60.0 / BPM
D2, A2, F2, C3, G2, E2 = 38, 45, 41, 48, 43, 40


def ostinato(b, t0, t1, root_seq, vel=0.55, octave=0, eighths=True, p=-0.2):
    """pizzicato bass ostinato: root - fifth - octave - fifth on eighths; root_seq = list of (bars, midi root)"""
    t, k = t0, 0
    while t < t1 - 0.05:
        bar = int((t - t0) / (4 * BEAT))
        root = root_seq[bar % len(root_seq)]
        pat = [0, 7, 12, 7, 0, 7, 10, 7] if eighths else [0, 7, 12, 7]
        step = BEAT / 2 if eighths else BEAT
        m = root + octave + pat[k % len(pat)]
        accent = 1.0 if k % 4 == 0 else 0.75
        place(b, pan(pluck(m2f(m), vel * accent, R, dur=0.5, bright=0.35), p), t)
        t += step; k += 1


def motif(b, t0, notes, vel=0.5, fn=vibes, p=0.25, step=BEAT / 2):
    """notes: list of (beats offset, midi, beats len) played by fn"""
    for off, m, ln in notes:
        if m is None:
            continue
        place(b, pan(fn(m2f(m), vel, R, dur=max(0.6, ln * BEAT * 1.6)), p), t0 + off * step)


SPOOKY = [(0, 74, 1), (1, 77, 1), (2, 76, 1), (3, 73, 2), (6, 74, 1), (7, 69, 2)]          # D F E C# .. D A
SPOOKY2 = [(0, 74, 1), (1, 77, 1), (2, 81, 1), (3, 80, 2), (6, 77, 1), (7, 74, 2)]         # D F A G# .. F D
RELIEF = [(0, 77, 1), (1, 81, 1), (2, 84, 2), (4, 82, 1), (5, 81, 1), (6, 77, 2)]          # F A C .. Bb A F (F major)
FOSSIL_M = [(0, 69, 2), (2, 72, 2), (4, 76, 3), (8, 74, 2), (10, 72, 2), (12, 69, 4)]


def build_music():
    mus = buf()
    # hook (0 - flash): low drone + ostinato + vibes motif, cut dead at the flash, cymbal swell into it
    place(mus, pad([m2f(38), m2f(45), m2f(50)], FLASH + 0.3, 0.55, R, att=0.4, rel=0.3, warm=600), 0.0)
    ostinato(mus, 0.25, FLASH - 0.05, [D2], 0.55)
    motif(mus, 0.25 + 4 * BEAT / 2 * 0, SPOOKY, 0.5)
    sw = cymbal(0.5, R, dur=1.4)
    sw = sw[::-1].copy() if sw.ndim == 1 else sw[:, ::-1].copy()
    place(mus, sw * 0.6, FLASH - 1.4 + 0.02)
    place(mus, timpani(m2f(38), 0.9, R, dur=2.0), FLASH)
    # 3.0 - 10.8: the colony (lighter, music box on top, ostinato in D minor -> Bb -> C)
    ostinato(mus, FLASH + 0.15, 10.75, [D2, D2, 34, 36], 0.45)
    for k, t in enumerate(np.arange(FLASH + 0.15, 10.6, 4 * BEAT)):
        motif(mus, t, SPOOKY if k % 2 == 0 else SPOOKY2, 0.38, fn=musicbox, p=0.35)
    # 10.8 - 29.4: tension: ostinato doubled, brush ticks, timpani hits on spore / fall / bite, dead stop after the bite
    ostinato(mus, 10.8, LETGO_T - 0.1, [D2, D2, 39, 39], 0.6)
    ostinato(mus, 14.2, BITE_T - 0.05, [D2 + 12, D2 + 12, 51, 51], 0.32, p=0.3)
    for t in np.arange(10.8, BITE_T - 0.05, BEAT):
        place(mus, pan(brush(0.25, R, dur=0.2), 0.4), t)
    for k, t in enumerate(np.arange(14.2, BITE_T - 0.3, 4 * BEAT)):
        motif(mus, t, SPOOKY2 if k % 2 else SPOOKY, 0.42)
    for t, v in [(SPORE_T, 0.7), (LAND_T, 0.8), (BITE_T, 1.0)]:
        place(mus, timpani(m2f(38), v, R, dur=2.2), t)
    place(mus, cymbal(0.6, R, dur=2.6), BITE_T)
    place(mus, pad([m2f(38), m2f(44)], 2.6, 0.5, R, att=0.05, rel=1.4, warm=500), BITE_T)  # tritone hang
    # 30.6 - 35.0 relief: F major, glockenspiel, light plucks
    ostinato(mus, 30.65, 35.0, [F2, F2, 46 - 12, 48 - 12], 0.4)
    motif(mus, 30.7, RELIEF, 0.42, fn=glock, p=0.3)
    motif(mus, 30.7 + 8 * BEAT / 2, RELIEF, 0.36, fn=glock, p=-0.3)
    # 35.0 - 43.2 fossil (golden): slow pad + music box, no bass
    place(mus, pad([m2f(45), m2f(52), m2f(57), m2f(60)], 8.4, 0.5, R, att=1.2, rel=1.6, warm=900), 35.0)
    motif(mus, 35.3, FOSSIL_M, 0.4, fn=musicbox, p=0.2, step=BEAT)
    motif(mus, 35.3 + 16 * BEAT, FOSSIL_M[:3], 0.36, fn=musicbox, p=-0.2, step=BEAT)
    place(mus, glock(m2f(81), 0.5, R), 41.92)  # "neunundzwanzig"
    # 43.2 - 52 marionette waltz (3/4): oom-pa-pa plucks + vibes tune, faster from "zieht"
    t, k = 43.3, 0
    while t < 51.9:
        beat = 0.5 if t < PULL_T else 0.38
        root = [D2, A2 - 12, D2, 40][(k // 3) % 4]
        place(mus, pan(pluck(m2f(root + (0 if k % 3 == 0 else 12 + (7 if k % 3 == 2 else 3))), 0.55 if k % 3 == 0 else 0.35, R, dur=0.4), -0.2), t)
        if t >= PUPPET_T and k % 3 == 0:
            m = [74, 76, 77, 76, 74, 72, 74, 69][(k // 3) % 8]
            place(mus, pan(vibes(m2f(m), 0.45, R, dur=1.0), 0.3), t)
        t += beat; k += 1
    # 52 - 61.7: creeping again (low ostinato, quieter), dip and two comic plucks on "nur zwei lebende"
    ostinato(mus, 52.1, ALIVE_T - 0.15, [D2, D2, 39, 37], 0.42, eighths=False)
    for kk, t in enumerate(np.arange(52.1, ALIVE_T - 0.6, 4 * BEAT)):
        motif(mus, t, SPOOKY, 0.32)
    for i, t in enumerate([ALIVE_T + 0.05, ALIVE_T + 0.35]):
        place(mus, pan(pluck(m2f(62 + 5 * i), 0.6, R, dur=0.5, bright=0.6), 0.2), t)
    # 61.8 - end: theme back over the golden canopy, F major lift on "Bleib oben", sting on "Friedhof"
    ostinato(mus, 61.85, GRAVE_T - 0.1, [F2, 46 - 12, 48 - 12, F2], 0.45)
    motif(mus, 61.9, RELIEF, 0.36, fn=musicbox, p=0.3)
    motif(mus, STAY_T, RELIEF[:3], 0.4, fn=glock, p=-0.25)
    place(mus, timpani(m2f(38), 0.9, R, dur=2.4), GRAVE_T)
    place(mus, pad([m2f(38), m2f(41), m2f(44)], DUR - GRAVE_T, 0.55, R, att=0.05, rel=1.2, warm=700), GRAVE_T)
    place(mus, pan(vibes(m2f(74), 0.5, R, dur=1.6), 0.2), GRAVE_T + 0.4)
    place(mus, pan(vibes(m2f(73), 0.45, R, dur=1.6), -0.2), GRAVE_T + 0.8)
    # small room
    ir = make_ir(1.1, 7)
    wet = convolve_st(mus, ir)[:, :N]
    return mus * 0.85 + wet * 0.25


# ================================================================ sfx
def tick(r, f0=4200, v=0.3):
    t = tt(0.025)
    return fades(bp(r.standard_normal(len(t)), f0 * 0.7, f0 * 1.3) * np.exp(-t / 0.004) * v, 0.0005, 0.005)


def pop(r):
    t = tt(0.12)
    f = 900 * np.exp(-t / 0.03) + 300
    return fades(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035) * 0.8 + hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.01) * 0.2)


def thump(r, f0=70, v=1.0):
    t = tt(0.5)
    f = f0 * (1 + 1.5 * np.exp(-t / 0.02))
    return fades((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11) + lp(r.standard_normal(len(t)), 600) * np.exp(-t / 0.03) * 0.4) * v)


def fall_whistle(dur=0.6):
    t = tt(dur)
    f = 1800 * np.exp(-t / dur * 1.3) + 300
    return fades(np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * np.minimum(1, t / 0.05), 0.01, 0.05)


def crunch(r):
    y = wood_crack(r) * 0.5
    t = tt(0.25)
    y2 = bp(r.standard_normal(len(t)), 1200, 5000) * np.exp(-t / 0.04)
    out = np.zeros(max(len(y), len(y2)))
    out[: len(y)] += y; out[: len(y2)] += y2 * 0.6
    return out


def squelch(dur, r):
    return bubbles(dur, r, 9, f_lo=180, f_hi=900, tau=(0.02, 0.06)) * 0.8


def walk_ticks(b, t0, t1, rate, p=0.0, v=0.18, f0=4200):
    t = t0
    while t < t1:
        place(b, pan(tick(R, f0 * R.uniform(0.85, 1.15), v * R.uniform(0.6, 1.0)), p), t)
        t += 1 / rate * R.uniform(0.85, 1.15)


def build_sfx():
    s = buf()
    # ambience beds per place
    for i, (a, b2, place_) in SHOTS.items():
        ta, tb = fr(a), fr(b2)
        d = tb - ta + 0.3
        if place_ == "floor":
            bed = crickets(d, R, 3) * 0.35 + bird_chirps(d, R, 0.25) * 0.25
        elif place_ == "canopy":
            bed = breeze(d, R, 1.0) * 0.5 + bird_chirps(d, R, 0.6) * 0.35
        else:
            bed = breeze(d, R, 0.6, bright=600) * 0.45
        bed = st(bed)
        bed[:, : ns(0.15)] *= np.linspace(0, 1, ns(0.15)); bed[:, -ns(0.3):] *= np.linspace(1, 0, ns(0.3))
        place(s, bed * 0.6, ta)
    # whooshes on hard cuts (soft) and glides (centred)
    for f in CUTS:
        place(s, pan(whoosh(0.45, R, peak=0.3), R.uniform(-0.4, 0.4)) * 0.35, fr(f) - 0.2)
    for f, d in GLIDES:
        place(s, pan(whoosh(d / FPS + 0.3, R, peak=0.5), 0.2) * 0.5, fr(f) - 0.1)
    # flash
    place(s, thump(R, 55, 0.9), FLASH)
    # hook zombie: slow dragging steps
    walk_ticks(s, 0.2, FLASH - 0.1, 3.5, -0.1, 0.22, 2500)
    # colony + hero walking
    walk_ticks(s, fr(160), fr(327), 14, 0.1, 0.12)
    walk_ticks(s, fr(327), SPORE_T, 7, 0.0, 0.2)
    # spore pop + puff
    place(s, pop(R) * 0.8, SPORE_T)
    place(s, st(bp(R.standard_normal(ns(0.5)), 800, 6000) * np.exp(-tt(0.5) / 0.12) * 0.25), SPORE_T + 0.03)
    # threads creep through the body, brain "ding"
    place(s, st(squelch(BRAIN_T - THREADS_T, R)) * 0.6, THREADS_T)
    place(s, st(creak(1.6, R, 70, 120)) * 0.25, THREADS_T + 0.5)
    place(s, pan(glock(m2f(88), 0.5, R), 0.2), BRAIN_T)
    # twig: walking, off the trail, shaking, falling
    walk_ticks(s, fr(545), SHAKE_T, 8, 0.1, 0.16)
    place(s, st(rattle(0.8, R, 40)) * 0.4, SHAKE_T)
    place(s, pan(fall_whistle(0.55), 0.1), FALL_T)
    place(s, thump(R, 90, 0.8), LAND_T)
    # climb: quick tiny ticks; compass ding
    walk_ticks(s, CLIMB_T, ARRIVE_T + 1.3, 12, -0.1, 0.14, 5200)
    place(s, pan(triangle(0.4, R, dur=1.2), 0.3), NORTH_T)
    # the bite
    place(s, crunch(R) * 0.9, BITE_T)
    place(s, thump(R, 60, 0.6), BITE_T)
    # researcher: a little magnifier squeak
    place(s, pan(clink(R, 2400, 0.1) * 0.3, 0.4), 31.0)
    # fossil: stone scrape under the push
    place(s, st(bp(R.standard_normal(ns(1.2)), 300, 2500) * np.hanning(ns(1.2)) * 0.08), 39.0)
    # marionette: strings drop, wood clacks on each pull
    place(s, pan(pluck(m2f(88), 0.5, R, dur=0.8, bright=0.9), 0.0), PUPPET_T - 0.1)
    t = PUPPET_T
    while t < 51.8:
        place(s, pan(clink(R, 1500 * R.uniform(0.9, 1.1), 0.08), R.uniform(-0.3, 0.3)) * 0.35, t)
        t += (1 / 0.7 if t < PULL_T else 1 / 1.6) / 3
    # stalk grows, spores rain
    place(s, st(creak(1.4, R, 50, 90)) * 0.35, STALK_T)
    place(s, st(squelch(1.4, R)) * 0.4, STALK_T)
    for k in range(26):
        tk = RAIN_T + R.uniform(0, 2.0)
        place(s, pan(glock(m2f(96 + R.integers(0, 5)), 0.08, R, dur=0.4), R.uniform(-0.6, 0.6)), tk)
    # two alive: nervous ticks
    walk_ticks(s, ALIVE_T, ALIVE_T + 1.0, 10, 0.0, 0.12)
    # canopy finale: march ticks, nod, graveyard hit
    walk_ticks(s, fr(1850), fr(1978), 14, 0.1, 0.1)
    place(s, thump(R, 45, 0.7), GRAVE_T)
    return s


# ================================================================ mix
def load_voice():
    x, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    if sr != SR:
        from math import gcd
        k = gcd(SR, sr); v = signal.resample_poly(v, SR // k, sr // k)
    out = np.zeros(N); out[: min(N, len(v))] = v[:N]
    return st(out)


def duck(words, depth=-9.0, pre=0.08, post=0.15, att=0.06, rel=0.4):
    ctrl = 1000
    nc = int(DUR * ctrl) + 2
    va = np.zeros(nc)
    for w in words:
        va[max(0, int((w["start"] - pre) * ctrl)): int((w["end"] + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc); e = 0.0
    for i in range(nc):
        e += (va[i] - e) * (ka if va[i] > e else kr); env[i] = e
    return dbg(np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env))


def limiter(x, ceil_db=-1.0, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    peak = np.max(np.abs(x), 0)
    g = np.minimum(1.0, c / np.maximum(peak, 1e-9))
    g = ndimage.minimum_filter1d(g, ns(look) * 2 + 1)
    a = np.exp(-1 / (rel * SR)); out = np.empty_like(g); e = 1.0
    for i in range(len(g)):
        e = g[i] if g[i] < e else e * a + g[i] * (1 - a); out[i] = e
    d = ns(look)
    return x * np.concatenate([out[d:], np.ones(d)])[None, :]


def main():
    words = json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))
    v = load_voice()
    Lv = integrated(v)
    mus = build_music(); sfx = build_sfx()
    # base levels relative to the voice, then the standard mix offsets: music +3 dB, SFX -6 dB, voice unchanged
    mus *= dbg(Lv - 12.0 - integrated(mus)) * dbg(3.0)
    sfx *= dbg(Lv - 12.0 - integrated(sfx)) * dbg(-6.0)
    mus_d = mus * duck(words)[None, :]
    mix = v + mus_d + sfx
    g = dbg(-14.0 - integrated(mix))
    mix = limiter(mix * g, -1.0)
    out = os.path.join(ROOT, "audio")
    write_wav(os.path.join(out, "mix.wav"), mix)
    for name, x in [("stem_voice", v * g), ("stem_music", mus_d * g), ("stem_sfx", sfx * g)]:
        write_wav(os.path.join(out, name + ".wav"), x)
    print(f"voice {Lv:.1f} LUFS | mix {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.2f} dBTP, {mix.shape[1] / SR:.3f} s")


if __name__ == "__main__":
    main()

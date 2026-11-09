"""Piper TTS (de_DE thorsten high) per line, joined with fixed pauses -> voice.wav + lines.json (exact line times)."""
import json, sys, wave, numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig
here = sys.argv[1]; model = sys.argv[2]
v = PiperVoice.load(model)
sr = v.config.sample_rate
cfg = SynthesisConfig(length_scale=float(sys.argv[3]), noise_scale=0.5, noise_w_scale=0.6)
out = [np.zeros(int(0.35 * sr), np.float32)]; t = 0.35; meta = []
for ln in open(f"{here}/lines.txt", encoding="utf-8"):
    ln = ln.strip()
    if not ln: continue
    pause, text = ln.split("|", 1); pause = str(float(pause) * float(sys.argv[4]))
    a = np.concatenate([c.audio_float_array for c in v.synthesize(text, syn_config=cfg)])
    # trim leading/trailing near-silence
    nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(nz[0] - int(0.02 * sr), 0): nz[-1] + int(0.04 * sr)]
    meta.append({"text": text, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    out += [a, np.zeros(int(float(pause) * sr), np.float32)]; t += len(a) / sr + float(pause)
y = np.concatenate(out); y = y / max(np.abs(y).max(), 1e-6) * 0.89
with wave.open(f"{here}/voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y * 32767).astype(np.int16).tobytes())
json.dump(meta, open(f"{here}/lines.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("sr", sr, "duration", round(len(y) / sr, 2), "s, lines", len(meta))

"""faster-whisper word times, mapped onto the script words line by line -> words.json [{w, start, end, line}]."""
import json, re, sys
from faster_whisper import WhisperModel
here = sys.argv[1]
lines = json.load(open(f"{here}/lines.json", encoding="utf-8"))
m = WhisperModel("small", device="cpu", compute_type="int8")
import soundfile as sf, numpy as np
from scipy.signal import resample_poly
a, sr = sf.read(f"{here}/voice.wav", dtype="float32")
a = resample_poly(a, 320, 441).astype(np.float32)  # 22050 -> 16000 Hz
segs, _ = m.transcribe(a, language="de", word_timestamps=True, beam_size=5)
ww = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
out = []
for li, L in enumerate(lines):
    words = re.findall(r"[\wÄÖÜäöüß]+", L["text"])
    inl = [w for w in ww if w[0] >= L["start"] - 0.15 and w[0] < L["end"] + 0.05]
    # whisper may merge/split words: spread script words over the whisper span proportionally to characters,
    # snapping to whisper word boundaries when the counts match
    if len(inl) == len(words):
        for w, (s, e, _) in zip(words, inl):
            out.append({"w": w, "start": round(max(s, L["start"]), 3), "end": round(min(e, L["end"]), 3), "line": li})
    else:
        tot = sum(len(w) + 2 for w in words); t = L["start"]; dur = L["end"] - L["start"]
        for w in words:
            d = dur * (len(w) + 2) / tot
            out.append({"w": w, "start": round(t, 3), "end": round(t + d, 3), "line": li, "approx": True}); t += d
json.dump(out, open(f"{here}/words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(out), "words,", sum(1 for o in out if o.get("approx")), "approx;", " ".join(w for _, _, w in ww)[:400])

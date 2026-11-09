# Produktionsnotizen: Zombie-Ameisen-Short

- **Ergebnis:** `remotion/out/final/zombie_ameisen.mp4` (nicht im Repo, 74 MB): 1080×1920, 30 fps, 2085 Bilder, 69,5 s, AAC 48 kHz, −14,1 LUFS, Spitze −1,0 dBFS.
- **Neu rendern:** `cd remotion && npm i && scripts/render_chunks.sh` (Software-WebGL, ca. 4,5 s pro Bild, ca. 2,6 h). Danach Bild und Ton zusammenführen: `ffmpeg -i out/final/video.mp4 -i ../shorts/zombie-ameisen/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out.mp4`.
- **2K:** `SCALE=1.3333 scripts/render_chunks.sh` (ca. 1,8-mal so lange).
- **Stimme:** `voice/make_voice.py` (Piper de_DE-thorsten-high, length_scale 0.84, Pausen ×0.8) und `voice/words.py` (Whisper-Wortzeiten).
- **Ton:** `audio/soundtrack.py <shorts/zombie-ameisen>` erzeugt mix.wav und die Stems. Die Zeitkonstanten spiegeln `remotion/src/videos/ants/story.ts`: Wer das Timing ändert, muss den Ton neu bauen.
- **QA (short_qa.py):** keine schwarzen, weißen oder eingefrorenen Bilder. Die zwei gemeldeten Sprünge (Bild 757: der Kompass erscheint, Bild 1390: der Faden reißt an) sind gewollte Bewegungen.
- **Abweichungen vom Skill:** 1080p statt 2K (keine GPU). Deutsch statt Englisch (Wunsch des Nutzers). Keine Seite-an-Seite-Vergleiche, weil die Referenzbilder im öffentlichen Repo fehlen. Keine Prüfung durch einen Opus-Agenten. Composer von Hand gebaut, weil @react-three/postprocessing mit SwiftShader Schwarz rendert.

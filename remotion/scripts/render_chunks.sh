#!/bin/bash
# renders AntsShort in chunks (resumable: skips chunks that already exist), then concatenates them
cd "$(dirname "$0")/.."
SCALE=${SCALE:-1}
for r in 0-519 520-1039 1040-1559 1560-2084; do
  out=out/final/chunk_$r.mp4
  [ -s "$out" ] && continue
  node scripts/render.mjs AntsShort "$out.tmp.mp4" "$SCALE" "$r" 4 >> out/final/render.log 2>&1 && mv "$out.tmp.mp4" "$out"
done
ls out/final/chunk_*.mp4 | sort -t_ -k2 -n | sed "s|^|file '$PWD/|; s|$|'|" > out/final/list.txt
ffmpeg -y -f concat -safe 0 -i out/final/list.txt -c copy out/final/video.mp4 >> out/final/render.log 2>&1 && echo RENDER_DONE >> out/final/render.log

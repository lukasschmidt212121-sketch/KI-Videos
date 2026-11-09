// usage: node scripts/render.mjs <Comp> <out.mp4> [scale] [from-to] [concurrency]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [id, out, scale = "1", range, conc = "2"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
const frameRange = range ? range.split("-").map(Number) : null;
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), frameRange, concurrency: Number(conc),
  browserExecutable, chromiumOptions, timeoutInMilliseconds: 600000,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 10) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");

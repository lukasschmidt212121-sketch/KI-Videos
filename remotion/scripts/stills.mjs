// usage: node scripts/stills.mjs <Comp> <outPrefix> <frame,frame,...> [scale]   (Linux, software WebGL)
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const [id, prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "swangle" };
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const inputProps = JSON.parse(process.env.PROPS || "{}");
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps });
const onBrowserLog = (l) => { if (!/404|kenney|Failed to load resource/.test(l.text)) console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale), inputProps,
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}

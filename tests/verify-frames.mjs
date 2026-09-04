// Automated render test: loads the overlay against the preview harness in real headless
// Chromium, then ASSERTS the bezel/frame actually rendered for every device. Writes a
// screenshot per device to tests/screenshots/ and exits non-zero if any check fails.
//
//   npm test        (or)   node tests/verify-frames.mjs
import { chromium } from "playwright";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8123;
const SHOTS = path.join(ROOT, "tests", "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const DEVICES = [
  { id: "iphone", type: "image" },
  { id: "iphone", o: "land", type: "image" },
  { id: "ipada16", type: "image" },
  { id: "ipadpro", type: "image" },
  { id: "ipadpro", o: "land", type: "image" },
  { id: "macbook", type: "image" },
  { id: "imac", type: "image" },
  { id: "studiodisplay", type: "image" },
  { id: "zfold", type: "drawn" },
  { id: "watch", type: "drawn" },
  { id: "custom", type: "drawn" },
];

const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1300));

const browser = await chromium.launch();
const results = [];
try {
  for (const d of DEVICES) {
    const name = d.id + (d.o ? "-" + d.o : "");
    const url = `http://localhost:${PORT}/preview/preview.html?d=${d.id}${d.o ? "&o=" + d.o : ""}`;
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errs = [];
    try {
      await page.goto(url, { waitUntil: "load" });
      await page.waitForSelector("#device-frame-root .df-device", { timeout: 6000 });
      await page.waitForTimeout(900); // let render + PNG load settle

      const info = await page.evaluate(() => {
        const root = document.getElementById("device-frame-root");
        const device = root.querySelector(".df-device");
        const img = root.querySelector(".df-frameimg");
        const r = device.getBoundingClientRect();
        const st = root.querySelector(".df-stage").getBoundingClientRect();
        return {
          deviceW: Math.round(r.width),
          deviceH: Math.round(r.height),
          deviceTop: Math.round(r.top),
          deviceBottom: Math.round(r.bottom),
          deviceCx: Math.round(r.left + r.width / 2),
          deviceCy: Math.round(r.top + r.height / 2),
          stageH: Math.round(st.height),
          viewH: window.innerHeight,
          viewW: window.innerWidth,
          imgDisplay: getComputedStyle(img).display,
          imgComplete: img.complete,
          imgNaturalW: img.naturalWidth,
          imgSrc: img.getAttribute("src"),
          rimBefore: getComputedStyle(device, "::before").display,
          rigType: root.querySelector(".df-rig").getAttribute("data-type"),
          selValue: root.querySelector(".df-select").value,
        };
      });

      if (!(info.deviceW > 0 && info.deviceH > 0)) errs.push("device has zero size");
      if (info.selValue !== d.id) errs.push(`wrong device selected (${info.selValue})`);
      // the stage must never grow past the viewport (flex min-height:auto + the unscaled 3000px
      // rig did exactly that and shoved the device off the bottom of the screen)
      if (info.stageH > info.viewH) errs.push(`stage overflows viewport (${info.stageH}px > ${info.viewH}px)`);
      // the device must be fully on screen and centered in the viewport
      if (info.deviceTop < 0 || info.deviceBottom > info.viewH)
        errs.push(`device off screen (top ${info.deviceTop}, bottom ${info.deviceBottom}, view ${info.viewH})`);
      if (Math.abs(info.deviceCx - info.viewW / 2) > 4 || Math.abs(info.deviceCy - info.viewH / 2) > 4)
        errs.push(`device not centered (center ${info.deviceCx},${info.deviceCy} vs ${info.viewW / 2},${info.viewH / 2})`);

      if (d.type === "image") {
        // the bezel IS the frame PNG - prove it loaded and is visible
        if (info.imgDisplay === "none") errs.push("frame image hidden (no bezel)");
        if (!info.imgComplete || info.imgNaturalW === 0) errs.push(`frame PNG failed to load: ${info.imgSrc}`);
        // the drawn metal rim must NOT leak onto photoreal frames (that's the white-border bug)
        if (info.rimBefore !== "none") errs.push("metal-rim ::before leaking -> white border on frame");
      } else {
        // drawn device: a CSS bezel must exist (rim ::before or a non-transparent body)
        const hasBezel = await page.evaluate(() => {
          const dev = document.querySelector("#device-frame-root .df-device");
          const bg = getComputedStyle(dev).backgroundColor;
          const rim = getComputedStyle(dev, "::before").display !== "none";
          const opaque = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
          return rim || opaque;
        });
        if (!hasBezel) errs.push("drawn device has no visible bezel");
      }

      await page.screenshot({ path: path.join(SHOTS, name + ".png") });
    } catch (e) {
      errs.push("render error: " + e.message);
    }
    await page.close();
    results.push({ name, pass: errs.length === 0, errs });
  }
} finally {
  await browser.close();
  server.kill();
}

console.log("\n=== Device Frame render test ===");
let allPass = true;
for (const r of results) {
  console.log((r.pass ? "PASS " : "FAIL ") + r.name.padEnd(16) + (r.errs.length ? " -> " + r.errs.join("; ") : ""));
  if (!r.pass) allPass = false;
}
console.log(allPass ? "\n✅ ALL PASS" : "\n❌ SOME FAILED");
process.exit(allPass ? 0 : 1);

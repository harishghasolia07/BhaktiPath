#!/usr/bin/env node
// Browser check of the clip player against real YouTube: the clip starts at its
// start time, stops by itself at its end time (the pat closes), loops, and
// follows on to the next clip. Needs the dev server and a short clip:
//   npm run clip -- add --url "https://www.youtube.com/live/fH2lNOThsV0?t=1291" \
//     --title "Test clip twelve seconds" --end 21:43 --category kirtan --sample
//   node scripts/e2e-player.mjs [--base http://localhost:3100] [--slug test-clip-twelve-seconds]
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const base = arg("base", "http://localhost:3100");
const slug = arg("slug", "test-clip-twelve-seconds");

function loadPlaywright() {
  const c = [process.env.PLAYWRIGHT_PATH, "playwright"].filter(Boolean);
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) for (const h of readdirSync(npx)) c.push(join(npx, h, "node_modules", "playwright"));
  for (const p of c) {
    try {
      return require(p);
    } catch {}
  }
  throw new Error("Playwright not found: run `npx playwright --version` once.");
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
};

async function run(name, prefs, check) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((p) => {
    for (const [k, v] of Object.entries(p)) localStorage.setItem(k, v);
  }, prefs);
  const page = await ctx.newPage();
  await page.goto(`${base}/clip/${slug}`, { waitUntil: "load" });
  await page.getByRole("button", { name: /play test clip/i }).click();
  await page.waitForSelector("iframe[src*='youtube']", { timeout: 20000 });
  const slider = page.getByRole("slider");
  // playing: clip-relative position moves past 0
  const t0 = Date.now();
  let started = false;
  while (Date.now() - t0 < 30000) {
    if (Number(await slider.getAttribute("aria-valuenow")) >= 2) {
      started = true;
      break;
    }
    await page.waitForTimeout(500);
  }
  ok(started, `${name}: playback started inside the clip`);
  // Nothing of ours may sit over the open video: YouTube's own controls (quality, pause, CC) must get the mouse.
  const hits = await page.evaluate(() => {
    const r = document.querySelector("iframe[src*='youtube']").getBoundingClientRect();
    return [[0.5, 0.5], [0.04, 0.95], [0.96, 0.95], [0.96, 0.06], [0.04, 0.06]].map(
      ([fx, fy]) => document.elementFromPoint(r.x + r.width * fx, r.y + r.height * fy)?.tagName,
    );
  });
  ok(hits.every((t) => t === "IFRAME"), `${name}: YouTube's controls are reachable (${hits.join(", ")})`);
  await check(page, slider);
  await ctx.close();
}

// 1. Stops at the end: the pat closes, "Darshan again" appears.
await run("stop", { "sk:autonext": "0", "sk:loop": "0" }, async (page, slider) => {
  await page.waitForFunction(() => document.querySelector("[data-pat]")?.getAttribute("data-pat") === "closed", null, {
    timeout: 40000,
  });
  const at = Number(await slider.getAttribute("aria-valuenow"));
  ok(at >= 10 && at <= 12, `stop: stopped at ${at}s of a 12s clip`);
  ok(await page.getByRole("button", { name: /play test clip/i }).isVisible(), "stop: pat closed, play button back");
});

// 2. Loop: after the end it starts again from the clip's start.
await run("loop", { "sk:autonext": "0", "sk:loop": "1" }, async (page, slider) => {
  let max = 0;
  let restarted = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const v = Number(await slider.getAttribute("aria-valuenow"));
    if (v > max) max = v;
    if (max >= 10 && v <= 3) {
      restarted = true;
      break;
    }
    await page.waitForTimeout(400);
  }
  ok(restarted, `loop: went back to the start after reaching ${max}s`);
  ok((await page.locator("[data-pat]").getAttribute("data-pat")) === "open", "loop: pat stayed open");
});

// 3. Autoplay next: after the end, the next clip in the section loads.
await run("next", { "sk:autonext": "1", "sk:loop": "0" }, async (page) => {
  await page.waitForFunction((s) => !location.pathname.endsWith(s), slug, { timeout: 40000 });
  ok(true, `next: moved on to ${new URL(page.url()).pathname}`);
  ok((await page.locator("[data-pat]").getAttribute("data-pat")) === "open", "next: pat stayed open for the next clip");
});

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall player checks passed");
process.exit(failures ? 1 : 0);

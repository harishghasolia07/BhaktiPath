#!/usr/bin/env node
// On phones the Home and Katha Sangraha pages are one screen tall and only their list scrolls.
// This loads both at real phone sizes and reports page scroll, sideways scroll, and how much room the list has.
// Very small or landscape phones may fall back to scrolling inside the content area; that is reported, not failed.
//   node scripts/check-phone-shell.mjs [--base http://localhost:3100]
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const base = arg("base", "http://localhost:3100").replace(/\/$/, "");
const sizes = [[390, 844], [360, 740], [375, 667], [320, 568], [844, 390], [768, 1024]];

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
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
let failures = 0;
for (const path of ["/", "/kathas"]) {
  for (const [w, h] of sizes) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 })).newPage();
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const content = document.getElementById("content");
      const list = document.querySelector("[role=tabpanel]") ?? document.querySelector("main [data-may-scroll]");
      return {
        page: de.scrollHeight - innerHeight,
        side: de.scrollWidth - innerWidth,
        fallback: content.scrollHeight - content.clientHeight,
        listH: Math.round(list.getBoundingClientRect().height),
        listScrolls: list.scrollHeight > list.clientHeight,
      };
    });
    const bad = m.page !== 0 || m.side > 0 || !m.listScrolls;
    if (bad) failures++;
    const note = m.fallback > 0 ? `  (content area scrolls ${m.fallback}px: very short screen)` : "";
    console.log(`${bad ? "✗" : "✓"} ${path.padEnd(8)} ${`${w}x${h}`.padEnd(9)} page scroll ${m.page}, sideways ${m.side}, list ${m.listH}px and ${m.listScrolls ? "scrolls inside" : "does not scroll"}${note}`);
    await page.context().close();
  }
}
await browser.close();
console.log(failures ? `${failures} check(s) failed` : "phone pages: the list scrolls, not the page");
process.exit(failures ? 1 : 0);

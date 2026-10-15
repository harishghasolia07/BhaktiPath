#!/usr/bin/env node
// On laptop-sized windows the site is one screen: no page scrollbar, nothing under the footer.
// This loads the main pages at real laptop sizes and reports any page scroll, sideways scroll,
// or a board / player that touches the footer.
//   npm run check:fit                      (needs the site running; default http://localhost:3100)
//   npm run check:fit -- --base http://localhost:3200
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const base = arg("base", "http://localhost:3100").replace(/\/$/, "");
const routes = (arg("routes", "/,/kathas") + "," + arg("clips", "")).split(",").filter(Boolean);
const sizes = [[1920, 993], [1728, 960], [1536, 730], [1486, 754], [1440, 790], [1366, 650], [1280, 720], [1024, 690]];

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
let bad = 0;
for (const route of routes) {
  for (const [w, h] of sizes) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const doc = document.scrollingElement;
      const content = document.getElementById("content");
      const foot = document.querySelector("footer").getBoundingClientRect();
      const box = document.querySelector("[role=tabpanel]")?.closest("section, nav") ?? document.querySelector("[role=slider]")?.parentElement;
      return {
        page: doc.scrollHeight - innerHeight,
        content: content.scrollHeight - content.clientHeight,
        sideways: doc.scrollWidth - innerWidth,
        gap: box ? Math.round(foot.top - box.getBoundingClientRect().bottom) : null,
      };
    });
    const ok = m.page <= 0 && m.content <= 0 && m.sideways <= 0 && (m.gap === null || m.gap >= 16);
    if (!ok) bad++;
    if (!ok || process.argv.includes("--verbose"))
      console.log(`${ok ? "✓" : "✗"} ${route} ${w}x${h}: page scroll ${m.page}px, content scroll ${m.content}px, sideways ${m.sideways}px, gap above footer ${m.gap}px`);
    await page.close();
  }
}
await browser.close();
console.log(bad ? `\n${bad} failing` : `\nno page scroll, no overflow, footer clear: ${routes.length} pages × ${sizes.length} sizes`);
process.exit(bad ? 1 : 0);

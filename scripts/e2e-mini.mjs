#!/usr/bin/env node
// Browser check of the mini player against real YouTube: a bhajan keeps playing while you move to
// other pages (shrinking to a mini player), YouTube's iframe is never reloaded, the mini player's
// controls work, and tapping it takes you back to the bhajan's page with the player in the shrine.
//   node scripts/e2e-mini.mjs [--base http://localhost:3100] [--slug <a clip that is at least a minute long>]
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const base = arg("base", "http://localhost:3100");
const slug = arg("slug", "main-bairagan-hungi");

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
const errors = [];

async function run(name, viewport) {
  console.log(`\n— ${name} (${viewport.width}x${viewport.height})`);
  const ctx = await browser.newContext({ viewport, ...(viewport.width < 500 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript(() => localStorage.setItem("sk:autonext", "0"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  const frameBox = () => page.locator("iframe[src*='youtube']").boundingBox();
  const miniTime = async () => {
    const t = (await page.locator("[data-mini-title] .tabular").textContent().catch(() => "")) ?? "";
    const m = t.match(/(\d+):(\d\d) \//);
    return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
  };

  await page.goto(`${base}/clip/${slug}`, { waitUntil: "load" });
  await page.getByRole("button", { name: /^play /i }).first().click();
  await page.waitForSelector("iframe[src*='youtube']", { timeout: 20000 });
  await page.waitForTimeout(7000);
  // mark this exact iframe so we can tell whether it is ever reloaded
  await page.evaluate(() => document.querySelector("iframe[src*='youtube']")?.setAttribute("data-mark", "first"));
  const slot = await page.evaluate(() => {
    const r = document.querySelector("[data-pat] > div:nth-of-type(2)").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const f = await frameBox();
  ok(f && Math.abs(f.x - slot.x) < 3 && Math.abs(f.width - slot.w) < 3, `on its page the player sits exactly in the shrine (${Math.round(f?.width ?? 0)}x${Math.round(f?.height ?? 0)})`);
  const hit = await page.evaluate(() => {
    const r = document.querySelector("iframe[src*='youtube']").getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.tagName;
  });
  ok(hit === "IFRAME", "YouTube's own controls are reachable in the shrine");

  // go to another page by the header link (no reload)
  await page.getByRole("link", { name: /कथा संग्रह/ }).click();
  await page.waitForURL("**/kathas**");
  await page.waitForTimeout(1500);
  const mini = await frameBox();
  ok(mini && mini.y + mini.height > viewport.height - 260, `on another page it becomes a mini player at the bottom (${Math.round(mini?.width ?? 0)}x${Math.round(mini?.height ?? 0)})`);
  ok((await page.locator("iframe[data-mark='first']").count()) === 1, "the same YouTube player kept going (not reloaded)");
  const t1 = await miniTime();
  await page.waitForTimeout(3000);
  const t2 = await miniTime();
  ok(t2 > t1 && t1 >= 0, `still playing in the mini player (${t1}s → ${t2}s)`);

  await page.locator("[data-mini]").getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(1500);
  const p1 = await miniTime();
  await page.waitForTimeout(2500);
  ok((await miniTime()) === p1 && (await page.locator("[data-mini]").getByRole("button", { name: "Play", exact: true }).count()) === 1, "mini player's pause works");
  await page.locator("[data-mini]").getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(2500);
  ok((await miniTime()) > p1, "mini player's play works");

  // home page too, then back to the bhajan through the mini player
  await page.getByRole("link", { name: /दर्शन समय/ }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await page.waitForTimeout(1000);
  ok((await page.locator("iframe[data-mark='first']").count()) === 1, "still the same player on the home page");
  await page.locator("[data-mini-title]").click();
  await page.waitForURL(`**/clip/${slug}`);
  await page.waitForTimeout(1500);
  const back = await frameBox();
  const slot2 = await page.evaluate(() => {
    const r = document.querySelector("[data-pat] > div:nth-of-type(2)").getBoundingClientRect();
    return { x: r.x, w: r.width };
  });
  ok(back && Math.abs(back.x - slot2.x) < 3 && Math.abs(back.width - slot2.w) < 3, "tapping the mini player returns to the shrine on its page");
  ok((await page.locator("iframe[data-mark='first']").count()) === 1, "…with the same player, still not reloaded");

  // leave again and close the mini player
  await page.getByRole("link", { name: /कथा संग्रह/ }).click();
  await page.waitForURL("**/kathas**");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Close the player" }).click();
  await page.waitForTimeout(800);
  ok((await page.locator("iframe[src*='youtube']").count()) === 0, "closing the mini player stops and removes it");
  await ctx.close();
}

await run("laptop", { width: 1536, height: 730 });
await run("phone", { width: 390, height: 780 });
await browser.close();
console.log(errors.length ? `\npage errors: ${errors.join(" | ")}` : "\npage errors: none");
console.log(failures ? `${failures} check(s) failed` : "all mini-player checks passed");
process.exit(failures || errors.length ? 1 : 0);

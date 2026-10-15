#!/usr/bin/env node
/**
 * check-screens — load every page at real phone, tablet and laptop viewports
 * and report what does not fit.
 *
 *   npm run check:screens                      # every sitemap page, all sizes
 *   npm run check:screens -- --routes /,/about # some pages
 *   npm run check:screens -- --sizes laptop    # phone | tablet | laptop | all
 *   npm run check:screens -- --shots screenshots/screens   # save first screens
 *   npm run check:screens -- --base https://agentloopr.com
 *
 * Needs a running site (default http://localhost:3000). Playwright is NOT a
 * project dependency: the script uses it from the npx cache
 * (`npx playwright --version` once puts it there) and the Chromium that
 * Playwright downloaded (`npx playwright install chromium`). Set
 * PLAYWRIGHT_PATH / CHROME_PATH to override either.
 *
 * What it checks, per page and size:
 *   OVERFLOW  the page scrolls sideways (any size) — always a bug.
 *   TALL      a card, panel or embed taller than the room under the navbar
 *             (laptop and tablet-landscape sizes). Must-fit things — booking
 *             embeds, a tab's panel, pinned stages — must never show here.
 *             Something that is meant to be read top to bottom can opt out
 *             with `data-may-scroll` on it or an ancestor.
 *             On a page's first section it also opts out of HERO (a bio or
 *             article whose only link sits after the text).
 *   HERO      the hero's first CTA below its h1 ends below the first screen.
 *   STICKY    a pinned (position: sticky) stage whose visible content runs
 *             past the bottom of the screen, or starts under the navbar,
 *             once it is stuck (any size — phones held sideways included).
 * Every tab of every visible tab set (`role="tab"`) is clicked and
 * re-measured — a tab's panel can be taller than the one shown on load.
 * Sizes are TARGET (must pass: exit code 1 on failure) or BEST-EFFORT
 * (reported, never fail the run). See docs/screen-height-guide.md.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);

// name, width, height (the browser's page area, not the screen), target?
const SIZES = {
  phone: [
    ["phone-375x667 (iPhone SE)", 375, 667, true],
    ["phone-390x664 (iPhone 14, Safari bars)", 390, 664, true],
    ["phone-430x740 (Pro Max)", 430, 740, true],
    // Sideways phones are best-effort: at 390px tall a hero's text alone
    // fills the screen. They still catch pinned stages that can't fit.
    ["phone-844x390 (iPhone 14 sideways)", 844, 390, false],
    ["phone-667x375 (iPhone SE sideways)", 667, 375, false],
  ],
  tablet: [
    ["tablet-768x950 (iPad portrait)", 768, 950, true],
    ["tablet-834x1050 (iPad Air portrait)", 834, 1050, true],
    ["tablet-1024x690 (iPad landscape)", 1024, 690, false],
  ],
  laptop: [
    ["laptop-1280x720", 1280, 720, false],
    ["laptop-1366x650 (1366x768)", 1366, 650, false],
    ["laptop-1440x790 (1440x900)", 1440, 790, true],
    ["laptop-1470x800 (MacBook Air)", 1470, 800, true],
    ["laptop-1486x754 (MBP 16 larger text)", 1486, 754, true],
    ["laptop-1536x730 (Windows 125%)", 1536, 730, true],
    ["laptop-1728x960 (MBP 16 default)", 1728, 960, true],
    ["laptop-1920x993 (1080p at 100%)", 1920, 993, true],
  ],
};

/* Every page in the site's own sitemap, plus pages it leaves out on purpose.
   Falls back to DEFAULT_ROUTES if the sitemap can't be read. */
const EXTRA_ROUTES = ["/__screen-check-404"];

async function sitemapRoutes(base) {
  try {
    const xml = await (await fetch(`${base}/sitemap.xml`)).text();
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    if (!paths.length) throw new Error("empty sitemap");
    return [...new Set([...paths, ...EXTRA_ROUTES])];
  } catch {
    return DEFAULT_ROUTES;
  }
}

const DEFAULT_ROUTES = [
  "/",
  "/kathas",
  "/kathas?k=sikar-2026-bhagwat-katha&d=5",
  "/clip/radhe-radhe-japo-chale-aayenge-bihari",
  "/clip/krishna-janm-prasang",
  "/clip/figc8c9zy8-3300",
  "/admin",
  "/__screen-check-404",
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_PATH, "playwright"].filter(Boolean);
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) {
    for (const hash of readdirSync(npx)) {
      const p = join(npx, hash, "node_modules", "playwright");
      if (existsSync(p)) candidates.push(p);
    }
  }
  for (const c of candidates) {
    try {
      return require(c);
    } catch {}
  }
  console.error(
    "Playwright not found. Run `npx playwright --version` once, or set PLAYWRIGHT_PATH.",
  );
  process.exit(2);
}

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache =
    platform() === "darwin"
      ? join(homedir(), "Library", "Caches", "ms-playwright")
      : join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    for (const rel of [
      "chrome-linux64/chrome",
      "chrome-linux/chrome",
      "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chrome-win/chrome.exe",
    ]) {
      const p = join(cache, d, rel);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

/* Runs in the page. Kept dependency-free; returns plain data. */
function measure() {
  const vw = document.documentElement.clientWidth;
  const vh = innerHeight;
  const issues = [];
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  };
  const label = (e) => {
    const sec = e.closest("section");
    const sh = sec && sec.querySelector("h1,h2");
    const own = e.querySelector("h1,h2,h3,h4,p,label,button");
    const text = (own ? own.textContent : e.className.toString()).trim().replace(/\s+/g, " ");
    return (sh ? `[${sh.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}] ` : "") + text.slice(0, 60);
  };
  const clipped = (e) => {
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflow)) return true;
    }
    return false;
  };

  // OVERFLOW — the page scrolls sideways; name the widest escapee.
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    let worst = null;
    for (const e of document.querySelectorAll("body *")) {
      if (!vis(e) || clipped(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.right > vw + 1 && (!worst || r.right > worst.r)) worst = { r: r.right, e };
    }
    issues.push({
      kind: "OVERFLOW",
      px: sw - vw,
      what: worst ? `${worst.e.tagName.toLowerCase()} ${label(worst.e)}` : "unknown element",
    });
  }

  const nav = [...document.querySelectorAll("header, nav")].find((e) =>
    ["fixed", "sticky"].includes(getComputedStyle(e).position),
  );
  const navH = nav ? Math.round(nav.getBoundingClientRect().bottom) : 0;
  const room = vh - navH;
  const main = document.querySelector("main") || document.body;
  const laptopish = vw >= 1024;

  // HERO — the hero's primary CTA (the first link/button below its h1) on
  // the first screen (tablet up). Not the section's LAST control: a page
  // whose first section holds a whole form (/contact) has its submit button
  // below the fold by design.
  const hero = main.querySelector("section");
  const h1 = hero && hero.querySelector("h1");
  if (hero && h1 && vw >= 768 && !hero.closest("[data-may-scroll]") && !hero.hasAttribute("data-may-scroll")) {
    const h1Bottom = h1.getBoundingClientRect().bottom;
    // Button-shaped only (rounded + filled or outlined): an in-text link in
    // a legal page's body is not a hero CTA.
    const buttonish = (c) => {
      const s = getComputedStyle(c);
      return (
        parseFloat(s.borderTopLeftRadius) >= 12 &&
        (s.backgroundColor !== "rgba(0, 0, 0, 0)" ||
          s.backgroundImage !== "none" ||
          parseFloat(s.borderTopWidth) > 0 ||
          c.querySelector("*") !== null)
      );
    };
    const cta = [...hero.querySelectorAll("a,button")]
      .filter(vis)
      .filter((c) => c.textContent.trim().length > 2 && buttonish(c))
      .find((c) => c.getBoundingClientRect().top >= h1Bottom);
    if (cta) {
      const bottom = cta.getBoundingClientRect().bottom + scrollY;
      if (bottom > vh) issues.push({ kind: "HERO", px: Math.round(bottom - vh), what: label(hero) });
    }
  }

  // TALL — card-like blocks taller than the room under the navbar.
  if (laptopish) {
    const found = [];
    for (const e of main.querySelectorAll("*")) {
      if (!vis(e) || e.closest("[data-may-scroll]")) continue;
      const r = e.getBoundingClientRect();
      if (r.height <= room || r.width < 280 || e.tagName === "SECTION") continue;
      const s = getComputedStyle(e);
      const cardish =
        e.tagName === "IFRAME" ||
        (parseFloat(s.borderTopLeftRadius) >= 8 &&
          (s.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            s.backgroundImage !== "none" ||
            parseFloat(s.borderTopWidth) > 0 ||
            s.boxShadow !== "none"));
      if (!cardish || found.some((f) => f.contains(e))) continue;
      found.push(e);
      issues.push({ kind: "TALL", px: Math.round(r.height - room), what: label(e) });
    }
  }
  // STICKY — a pinned stage whose visible content can't fit the screen once
  // it is stuck: its sticky `top` plus the span of its visible content (faded
  // or hidden steps excluded) runs past the bottom (any size).
  for (const e of main.querySelectorAll("*")) {
    const s = getComputedStyle(e);
    // Stacking cards (`data-sticky-stack`) park tall cards by their bottom
    // edge, partly under the navbar, by design: skip them.
    if (s.position !== "sticky" || !vis(e) || e.closest("[data-may-scroll], [data-sticky-stack]")) continue;
    const box = e.getBoundingClientRect();
    const shown = [...e.querySelectorAll("*")].filter((c) => {
      for (let n = c; n && n !== e; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || parseFloat(cs.opacity) === 0) return false;
      }
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!shown.length) continue;
    const bottom = Math.max(...shown.map((c) => c.getBoundingClientRect().bottom)) - box.top;
    const top = parseFloat(s.top) || 0;
    const firstTop = Math.min(...shown.map((c) => c.getBoundingClientRect().top)) - box.top;
    const over = Math.round(top + bottom - vh);
    const under = Math.round(navH - (top + firstTop));
    if (over > 1) issues.push({ kind: "STICKY", px: over, what: label(e) });
    else if (under > 1) issues.push({ kind: "STICKY", px: under, what: `${label(e)} (under the navbar)` });
  }
  return { vw, vh, room, issues };
}

async function run() {
  const base = arg("base", "http://localhost:3000").replace(/\/$/, "");
  const routes = arg("routes", null)
    ? arg("routes").split(",").map((r) => r.trim())
    : await sitemapRoutes(base);
  const which = arg("sizes", "all");
  const shots = arg("shots", null);
  const sizes = which === "all" ? Object.values(SIZES).flat() : SIZES[which];
  if (!sizes) {
    console.error(`Unknown --sizes ${which}. Use phone | tablet | laptop | all.`);
    process.exit(2);
  }
  if (shots) mkdirSync(shots, { recursive: true });

  const { chromium } = loadPlaywright();
  const launch = async () => {
    try {
      return await chromium.launch();
    } catch {
      return chromium.launch({ executablePath: chromePath() });
    }
  };
  // One browser, relaunched if it dies (a long run against a dev server can
  // take Chromium down); a size that was mid-way reruns its routes.
  let browser = await launch();
  let relaunching = null;
  const live = async () => {
    if (browser.isConnected()) return browser;
    relaunching ??= launch().then((b) => {
      browser = b;
      relaunching = null;
      return b;
    });
    return relaunching;
  };

  const results = [];
  const queue = [...sizes];
  // Two pages at a time: a dev server on a 7-8 GB machine ran out of memory
  // and was killed at five.
  const workers = Number(arg("workers", 2));
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (queue.length) {
        const [name, w, h, target] = queue.shift();
        let ctx = await (await live()).newContext({ viewport: { width: w, height: h } });
        let page = await ctx.newPage();
        for (const route of routes) {
          if (!browser.isConnected()) {
            ctx = await (await live()).newContext({ viewport: { width: w, height: h } });
            page = await ctx.newPage();
          }
          try {
            await page.goto(base + route, { waitUntil: "load", timeout: 120_000 });
            await page.waitForTimeout(1500);
            const m = await page.evaluate(measure);
            // Every other tab of every visible tab set: a tab's panel can be
            // taller than the one shown on load. Issues already present on
            // load are not repeated.
            const seen = new Set(m.issues.map((i) => `${i.kind}|${i.what}`));
            const tabs = page.locator('[role="tab"]:visible');
            const count = await tabs.count();
            for (let t = 0; t < count; t++) {
              const tab = tabs.nth(t);
              if ((await tab.getAttribute("aria-selected")) === "true") continue;
              const tabName = ((await tab.textContent()) || "").trim().replace(/\s+/g, " ").slice(0, 40);
              try {
                await tab.click({ timeout: 5000 });
                await page.waitForTimeout(600);
                const mt = await page.evaluate(measure);
                for (const i of mt.issues) {
                  const key = `${i.kind}|${i.what}`;
                  if (i.kind === "HERO" || seen.has(key)) continue;
                  seen.add(key);
                  m.issues.push({ ...i, what: `${i.what}  (tab "${tabName}")` });
                }
              } catch {}
            }
            if (shots) {
              const file = `${route === "/" ? "home" : route.slice(1).replaceAll("/", "_")}__${w}x${h}.png`;
              await page.screenshot({ path: join(shots, file) });
            }
            results.push({ route, name, target, ...m });
          } catch (err) {
            results.push({ route, name, target, error: String(err).split("\n")[0] });
          }
          process.stdout.write(".");
        }
        await ctx.close().catch(() => {});
      }
    }),
  );
  await browser.close().catch(() => {});
  process.stdout.write("\n\n");

  let failures = 0;
  let warnings = 0;
  const byRoute = {};
  for (const r of results) (byRoute[r.route] ??= []).push(r);
  for (const route of routes) {
    const rows = (byRoute[route] ?? []).filter((r) => r.error || r.issues.length);
    if (!rows.length) {
      console.log(`✓ ${route}`);
      continue;
    }
    console.log(`✗ ${route}`);
    for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
      const tag = r.target ? "TARGET" : "best-effort";
      if (r.error) {
        console.log(`    ${r.name} [${tag}] ERROR ${r.error}`);
        if (r.target) failures++;
        continue;
      }
      for (const i of r.issues) {
        const fail = r.target || i.kind === "OVERFLOW";
        fail ? failures++ : warnings++;
        console.log(`    ${r.name} [${tag}] ${i.kind} +${i.px}px ${i.what}`);
      }
    }
  }
  console.log(
    `\n${results.length} page loads · ${failures} failure(s) at target sizes · ${warnings} best-effort warning(s)`,
  );
  process.exit(failures ? 1 : 0);
}

run();

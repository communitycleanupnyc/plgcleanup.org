#!/usr/bin/env node
/**
 * seo-audit.mjs — static-site pre-flight audit for an Astro `dist/` folder.
 *
 * Zero dependencies (Node 18+). Regex-based on purpose: Astro's generated HTML
 * is regular enough for this; the goal is a fast CI tripwire, not a validator.
 *
 * Usage:
 *   node scripts/seo-audit.mjs dist --site https://plgcleanup.org
 *   node scripts/seo-audit.mjs dist            (site inferred from index canonical)
 *
 * Exit codes: 0 = clean or warnings only, 1 = errors.
 * Env:
 *   SEO_SKIP_FRESH=1       downgrades stale-Event-schema and empty-schedule
 *                          errors to warnings.
 *   SEO_SKIP_PLACEHOLDER=1 downgrades the placeholder-content errors ("xyz"
 *                          names, "…"-only pull quotes) to warnings. Set
 *                          pre-launch only, while real gallery copy is
 *                          still being written — remove at launch (LAUNCH.md).
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, posix } from "node:path";

// ---------------------------------------------------------------- config ---
const CFG = {
  // Strings that must never ship in visible text (case-insensitive). ERROR.
  forbiddenVisible: [
    "example.org",
    "example.com",
    "lorem ipsum",
    "TKTK",
    "STUB —",
    "STUB -",
    // Editors write "_todo_" into Markdown while drafting. Shipping one means an
    // unfinished page went live (this is how terms.md nearly launched blank).
    "TODO",
  ],
  // Softer launch markers. WARN.
  warnVisible: ["coming soon"],
  // Placeholder gallery copy. ERROR unless SEO_SKIP_PLACEHOLDER=1.
  placeholderVisible: ["xyz"],
  // Comment markers that leak roadmap if shipped inside <!-- -->. WARN.
  commentMarkers: ["TODO", "STUB", "FIXME", "HACK"],
  // Alt texts that are effectively junk. ERROR. (alt="" is fine = decorative.)
  junkAlts: ["...", "\u2026", ".", "-", "image", "photo", "help me"],
  // aria-* attributes whose value is a space-separated list of element ids.
  // Each one is checked against the ids actually present on the page.
  ariaIdRefs: ["aria-labelledby", "aria-describedby", "aria-controls", "aria-details"],
  // AI/answer-engine crawlers that should not be blocked in robots.txt. WARN.
  aiBots: [
    "GPTBot",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
    "CCBot",
    "Bytespider",
  ],
  thinWords: 120, // WARN below this visible word count
  thinAllow: ["404.html"], // pages allowed to be thin
  imgBudgetBytes: 1.5 * 1024 * 1024, // per-page local image weight. WARN.
  titleLen: [15, 70],
  descLen: [50, 165],
  requireOg: ["og:title", "og:description", "og:image", "og:url"],
};

// ------------------------------------------------------------- plumbing ---
const args = process.argv.slice(2);
const dist = args.find((a) => !a.startsWith("--")) ?? "dist";
let siteArg = (args.find((a) => a.startsWith("--site=")) ?? "").split("=")[1] ?? "";
const si = args.indexOf("--site");
if (!siteArg && si !== -1 && args[si + 1]) siteArg = args[si + 1];

if (!existsSync(dist)) {
  console.error(`✖ dist folder not found: ${dist}`);
  process.exit(1);
}

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
  );
const files = walk(dist).map((f) => posix.join(...f.split(/[\\/]/)));
const rel = (f) => f.slice(posix.join(...dist.split(/[\\/]/)).length + 1);
const htmlFiles = files.filter((f) => f.endsWith(".html")).map(rel);
const fileSet = new Set(files.map(rel));

const read = (f) => readFileSync(join(dist, f), "utf8");
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

const issues = []; // {level, file, msg}
const err = (file, msg) => issues.push({ level: "ERROR", file, msg });
const warn = (file, msg) => issues.push({ level: "WARN", file, msg });
// Placeholder-content findings: errors, unless the pre-launch escape hatch is set.
const placeholder = (file, msg) =>
  process.env.SEO_SKIP_PLACEHOLDER ? warn(file, msg) : err(file, msg);

// Map a URL path ("/about", "/about/", "/") to a file in dist, honoring both
// Astro build formats (about.html and about/index.html).
function pathToFile(p) {
  p = p.split(/[?#]/)[0];
  if (p === "" || p === "/") return "index.html";
  const clean = p.replace(/^\//, "").replace(/\/$/, "");
  for (const c of [clean, `${clean}.html`, `${clean}/index.html`]) if (fileSet.has(c)) return c;
  return null;
}

// ------------------------------------------------------------ infer site ---
let SITE = siteArg || null;
if (!SITE) {
  const m = read("index.html").match(/<link\s+rel="canonical"\s+href="(https?:\/\/[^/"]+)/);
  SITE = m ? m[1] : null;
  if (SITE) console.log(`ℹ --site not given; inferred from index canonical: ${SITE}`);
}
if (!SITE) {
  console.error("✖ Could not determine site origin. Pass --site https://example.com");
  process.exit(1);
}
const siteHost = new URL(SITE).host;

// --------------------------------------------------------- global checks ---
if (!fileSet.has("404.html"))
  err(
    "(site)",
    "No 404.html — Cloudflare Pages will SPA-fallback and serve index.html with HTTP 200 for every unknown URL (soft-404s). Add src/pages/404.astro.",
  );

if (!fileSet.has("robots.txt")) err("(site)", "robots.txt missing.");
else {
  const r = read("robots.txt");
  if (/^\s*Disallow:\s*\/\s*$/im.test(r)) err("robots.txt", "Disallow: / blocks the whole site.");
  const sm = r.match(/^Sitemap:\s*(\S+)/im);
  if (!sm) warn("robots.txt", "No Sitemap: line.");
  else if (new URL(sm[1]).host !== siteHost)
    err(
      "robots.txt",
      `Sitemap host ${new URL(sm[1]).host} ≠ --site host ${siteHost}. Rebuild with the correct astro.config \`site\`.`,
    );
  for (const bot of CFG.aiBots) {
    const re = new RegExp(`User-agent:\\s*${bot}[\\s\\S]{0,80}?Disallow:\\s*\\/`, "i");
    if (re.test(r)) warn("robots.txt", `${bot} is disallowed — AI/answer-engine visibility off.`);
  }
}

// Sitemap coverage + host consistency (handles sitemap-index).
let sitemapUrls = [];
function collectSitemap(f) {
  if (!fileSet.has(f)) return;
  const xml = read(f);
  for (const loc of [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => decode(m[1]))) {
    if (loc.endsWith(".xml")) collectSitemap(loc.replace(/^https?:\/\/[^/]+\//, ""));
    else sitemapUrls.push(loc);
  }
}
collectSitemap("sitemap-index.xml");
collectSitemap("sitemap.xml");
if (!sitemapUrls.length) err("(site)", "No sitemap URLs found (sitemap-index.xml / sitemap.xml).");
for (const u of sitemapUrls) {
  const url = new URL(u);
  if (url.host !== siteHost) err("(sitemap)", `URL on wrong host: ${u} (expected ${siteHost}).`);
  if (!pathToFile(url.pathname)) err("(sitemap)", `URL has no matching file in dist: ${u}`);
}
const inSitemap = new Set(sitemapUrls.map((u) => pathToFile(new URL(u).pathname)).filter(Boolean));

// -------------------------------------------------------- per-page checks ---
const titles = new Map(),
  descs = new Map();
const missingAssets = new Set();
const eventNodePages = new Set(); // pages that emitted an Event JSON-LD node

function assetExists(u, page) {
  // Only verify same-host or root-relative references; externals are lychee's job.
  let p = u.trim();
  if (/^(data:|mailto:|tel:|#)/.test(p)) return;
  if (/^https?:\/\//.test(p)) {
    const url = new URL(p);
    if (url.host !== siteHost) return;
    p = url.pathname;
  }
  if (!p.startsWith("/")) p = "/" + p; // treat as root-relative (Astro emits root-relative)
  const f = pathToFile(p) ?? (fileSet.has(p.slice(1)) ? p.slice(1) : null);
  if (!f && !missingAssets.has(p)) {
    missingAssets.add(p);
    err(page, `Referenced asset not in dist (first seen here): ${p}`);
  }
  return f;
}

for (const page of htmlFiles) {
  const html = read(page);
  const head = html.split(/<\/head>/i)[0] ?? "";
  const body = html.split(/<\/head>/i)[1] ?? html;

  // <html lang> and viewport
  if (!/<html[^>]+lang=/.test(html)) err(page, "<html> missing lang attribute.");
  if (!/<meta\s+name="viewport"/.test(head)) warn(page, "No viewport meta.");

  // Title
  const t = [...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)].map((m) => decode(m[1]).trim());
  if (t.length !== 1) err(page, `Expected exactly 1 <title>, found ${t.length}.`);
  if (t[0]) {
    if (titles.has(t[0])) err(page, `Duplicate title (also on ${titles.get(t[0])}): "${t[0]}"`);
    titles.set(t[0], page);
    if (t[0].length < CFG.titleLen[0] || t[0].length > CFG.titleLen[1])
      warn(
        page,
        `Title length ${t[0].length} outside ${CFG.titleLen.join("–")}: "${t[0].slice(0, 60)}…"`,
      );
  }

  // Meta description
  const d = head.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  if (!d) err(page, "Missing meta description.");
  else {
    const dv = decode(d[1]);
    if (descs.has(dv)) err(page, `Duplicate meta description (also on ${descs.get(dv)}).`);
    descs.set(dv, page);
    if (dv.length < CFG.descLen[0] || dv.length > CFG.descLen[1])
      warn(page, `Description length ${dv.length} outside ${CFG.descLen.join("–")}.`);
  }

  // Canonical
  const c = head.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  if (!c) err(page, "Missing canonical.");
  else {
    const cu = new URL(decode(c[1]));
    if (cu.host !== siteHost) err(page, `Canonical host ${cu.host} ≠ ${siteHost}.`);
    const cf = pathToFile(cu.pathname);
    if (cf !== page && !(page === "index.html" && cf === "index.html"))
      err(page, `Canonical path ${cu.pathname} does not map to this file.`);
  }

  // robots meta
  const rm = head.match(/<meta\s+name="robots"\s+content="([^"]*)"/);
  if (rm && /noindex/i.test(rm[1]) && page !== "404.html") err(page, `noindex present: "${rm[1]}"`);

  // OG / twitter completeness
  for (const k of CFG.requireOg)
    if (!new RegExp(`<meta\\s+property="${k}"`).test(head)) warn(page, `Missing ${k}.`);
  if (!/<meta\s+name="twitter:card"/.test(head)) warn(page, "Missing twitter:card.");

  // Asset references must exist (this is what catches a dead og:image).
  for (const m of head.matchAll(
    /<meta\s+(?:property|name)="(?:og:image|twitter:image)"\s+content="([^"]+)"/g,
  ))
    assetExists(decode(m[1]), page);
  for (const m of html.matchAll(/<(?:img|source|script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)) {
    const v = decode(m[1]);
    if (/\.(css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?)(\?|$)/i.test(v))
      assetExists(v, page);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g))
    for (const cand of decode(m[1]).split(",")) assetExists(cand.trim().split(/\s+/)[0], page);

  // JSON-LD: parse + referenced images + Event freshness
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(decode(m[1]));
    } catch (e) {
      err(page, `Invalid JSON-LD: ${e.message}`);
      continue;
    }
    const nodes = Array.isArray(data) ? data : (data["@graph"] ?? [data]);
    for (const n of nodes) {
      for (const k of ["image", "logo"]) if (typeof n[k] === "string") assetExists(n[k], page);
      if (n["@type"] === "Event") {
        eventNodePages.add(page);
        // Google requires these three; without them the node is inert in search.
        for (const k of ["name", "startDate", "location"])
          if (!n[k]) err(page, `Event JSON-LD is missing required "${k}".`);
        const end = new Date(n.endDate ?? n.startDate ?? 0);
        // An unparseable date compares false against every Date, so it would
        // sail past the freshness check below as if it were fresh.
        if (Number.isNaN(end.getTime()))
          err(page, `Event has unparseable startDate/endDate: ${n.endDate ?? n.startDate}`);
        else if (end < new Date()) {
          const msg = `Stale Event schema: "${n.name}" ended ${end.toISOString().slice(0, 10)}. Rebuild with a future event or drop past events at build time.`;
          process.env.SEO_SKIP_FRESH ? warn(page, msg) : err(page, msg);
        }
        if (!n.location?.address?.streetAddress)
          warn(
            page,
            "Event location.address has no streetAddress (recommended for event rich results).",
          );
      }
    }
  }

  // Internal links resolve. The pattern must NOT exclude "#": excluding it made
  // the regex skip every link containing a fragment rather than skipping the
  // fragment part (pathToFile already strips #, so /about#team resolves fine).
  for (const m of body.matchAll(/href="([^"]+)"/g)) {
    const h = decode(m[1]);
    if (/^(https?:|mailto:|tel:)/.test(h)) {
      if (/\/\/(www\.)?(example\.(org|com|net)|localhost|127\.0\.0\.1)/i.test(h))
        err(page, `Placeholder external link shipped: ${h}`);
      if (h.startsWith("http://")) warn(page, `Insecure external link: ${h}`);
      continue;
    }
    if (!pathToFile(h)) err(page, `Broken internal link: ${h}`);
    else if (h.length > 1 && h.endsWith("/"))
      warn(
        page,
        `Trailing-slash link "${h}" on a file-format build (serves via redirect; drop the slash).`,
      );
  }

  // Visible text checks
  let vis = body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, " ");
  vis = decode(vis.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  for (const s of CFG.forbiddenVisible)
    if (vis.toLowerCase().includes(s.toLowerCase()))
      err(page, `Forbidden string visible on page: "${s}"`);
  for (const s of CFG.warnVisible)
    if (vis.toLowerCase().includes(s.toLowerCase()))
      warn(page, `Launch marker visible on page: "${s}"`);
  // Placeholder gallery copy: a stand-in title ("xyz"), or a pull quote that
  // is nothing but dots. Both ship straight onto the home-page carousel.
  for (const s of CFG.placeholderVisible)
    if (vis.toLowerCase().includes(s.toLowerCase())) placeholder(page, `Placeholder name: "${s}"`);
  for (const q of html.matchAll(/card__quote[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = decode(q[1].replace(/<[^>]+>/g, "")).replace(/[“”"\s]|\[…\]/g, "");
    if (text && /^[.…]+$/.test(text))
      placeholder(page, `Placeholder pull quote (dots only): "${text}"`);
  }
  const words = vis.split(" ").filter(Boolean).length;
  if (words < CFG.thinWords && !CFG.thinAllow.includes(page))
    warn(page, `Thin page: ${words} visible words (< ${CFG.thinWords}).`);

  // Shipped comments that leak roadmap
  for (const cm of html.matchAll(/<!--([\s\S]*?)-->/g))
    if (CFG.commentMarkers.some((k) => cm[1].includes(k)))
      warn(
        page,
        `Shipped HTML comment contains ${CFG.commentMarkers.find((k) => cm[1].includes(k))} (visible in view-source): "${cm[1].trim().slice(0, 60)}…"`,
      );

  // Image hygiene: alt + per-page weight
  let pageImgBytes = 0,
    noAlt = 0;
  const junk = [];
  for (const im of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = im[0];
    // Match alt="…", alt='…', or a bare `alt` (how HTML serializers, incl. Astro,
    // emit alt=""). A bare alt is a present, empty, decorative alt — not missing.
    const alt = tag.match(/\salt(?:=("|')([^"']*)\1)?(?=[\s/>])/);
    if (!alt) noAlt++;
    else if (
      alt[2] !== undefined &&
      (CFG.junkAlts.includes(alt[2].trim().toLowerCase()) || CFG.junkAlts.includes(alt[2].trim()))
    )
      junk.push(alt[2]);
    const src = tag.match(/src="([^"]+)"/);
    const f = src
      ? pathToFile(decode(src[1]).startsWith("/") ? decode(src[1]) : "/" + decode(src[1]))
      : null;
    const p = src && !f ? null : f;
    const candidate =
      p ??
      (src && fileSet.has(decode(src[1]).replace(/^\//, ""))
        ? decode(src[1]).replace(/^\//, "")
        : null);
    if (candidate) {
      try {
        pageImgBytes += statSync(join(dist, candidate)).size;
      } catch {}
    }
  }
  if (noAlt) warn(page, `${noAlt} <img> tag(s) missing an alt attribute.`);
  // ERROR, not WARN: every gallery photo carries authored alt (a required field
  // in src/content.config.ts), so junk alt means someone typed it. The net.
  if (junk.length)
    err(
      page,
      `${junk.length} image(s) with junk alt text (${[...new Set(junk)].slice(0, 4).join(", ")}) — use real descriptions or alt="" if decorative.`,
    );
  if (pageImgBytes > CFG.imgBudgetBytes)
    warn(
      page,
      `Local image weight ${(pageImgBytes / 1048576).toFixed(2)} MB exceeds ${(CFG.imgBudgetBytes / 1048576).toFixed(1)} MB budget.`,
    );

  // ── Accessibility ──────────────────────────────────────────────────────────
  // Regex over built HTML, same as everything else here — so this catches the
  // structural WCAG mistakes that survive a code review, not the behavioural
  // ones. Focus order, computed contrast, and anything that needs a running
  // browser are out of reach by design; `npm run a11y` covers colour, and the
  // keyboard pass in the README covers the rest.

  // Zoom must not be disabled (WCAG 1.4.4). The viewport check above only
  // asserts the tag exists; this reads what it actually says.
  const vp = head.match(/<meta\s+name="viewport"[^>]*\scontent="([^"]*)"/i);
  if (vp && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*(1(\.0+)?)\b/i.test(vp[1]))
    err(page, `Viewport blocks zoom (WCAG 1.4.4): "${vp[1]}"`);

  // Exactly one <h1>, and no skipped heading levels (h2 → h4).
  const headings = [...body.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]));
  const h1s = headings.filter((h) => h === 1).length;
  if (h1s !== 1) warn(page, `Expected exactly 1 <h1>, found ${h1s}.`);
  for (let i = 1; i < headings.length; i++)
    if (headings[i] > headings[i - 1] + 1) {
      warn(page, `Heading level skips h${headings[i - 1]} → h${headings[i]}.`);
      break; // one report per page is enough to send someone looking
    }

  // Duplicate ids. Breaks every aria-* reference that points at one, and is
  // exactly what a copy-pasted component produces.
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupeIds = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  if (dupeIds.length) err(page, `Duplicate id(s): ${dupeIds.slice(0, 5).join(", ")}`);

  // aria-* that points at an id which isn't on the page. A dangling reference
  // is silently ignored by assistive tech, so the control ends up unlabelled.
  const idSet = new Set(ids);
  for (const attr of CFG.ariaIdRefs)
    for (const m of html.matchAll(new RegExp(`\\s${attr}="([^"]+)"`, "g")))
      for (const ref of m[1].trim().split(/\s+/))
        if (ref && !idSet.has(ref))
          err(page, `${attr}="${ref}" points at no element on this page.`);

  // Links and buttons with no accessible name — nothing to announce, and
  // nothing for a voice-control user to say.
  for (const m of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const [, tag, attrs, inner] = m;
    if (tag.toLowerCase() === "a" && !/\shref=/.test(attrs)) continue; // not a link
    if (/\saria-hidden="true"/.test(attrs)) continue;
    const named =
      /\saria-label="[^"]*[^\s"][^"]*"/.test(attrs) ||
      /\saria-labelledby="/.test(attrs) ||
      /\stitle="[^"]*[^\s"][^"]*"/.test(attrs) ||
      // text content, or an image inside carrying a non-empty alt
      decode(inner.replace(/<[^>]*>/g, "")).trim().length > 0 ||
      /<img\b[^>]*\salt="[^"]*[^\s"][^"]*"/.test(inner);
    if (!named)
      err(page, `<${tag}> has no accessible name: ${m[0].replace(/\s+/g, " ").slice(0, 90)}…`);
  }

  // Positive tabindex overrides the document's natural order for everyone.
  const positiveTab = [...html.matchAll(/\stabindex="(\d+)"/g)].filter((m) => Number(m[1]) > 0);
  if (positiveTab.length)
    err(page, `${positiveTab.length} element(s) with a positive tabindex — use 0 or -1.`);

  // An <iframe> without a title is an unlabelled frame in the tab order.
  for (const m of html.matchAll(/<iframe\b[^>]*>/gi))
    if (!/\stitle="[^"]*[^\s"][^"]*"/.test(m[0])) err(page, "<iframe> missing a title attribute.");

  // Sitemap membership (indexable pages only)
  if (!inSitemap.has(page) && page !== "404.html" && !(rm && /noindex/i.test(rm[1])))
    err(page, "Indexable page missing from sitemap.");
}

// -------------------------------------------------- Event schema presence ---
// join.astro drops the Event JSON-LD once the cleanup is over (a past event in
// search results is worse than none). That legitimate absence must not become a
// silent hole where a *future* event ships with no schema at all — so require
// the node whenever dist itself still describes an upcoming event.
//
// The event's end timestamp is read back out of dist, not src: every
// [data-countdown] element carries data-end, baked from src/data/schedule.ts.
// That keeps this check honest about what actually shipped.
if (fileSet.has("join.html")) {
  let latestEnd = null;
  for (const page of htmlFiles)
    for (const m of read(page).matchAll(/data-end="([^"]+)"/g)) {
      const d = new Date(decode(m[1]));
      if (!Number.isNaN(d.getTime()) && (!latestEnd || d > latestEnd)) latestEnd = d;
    }
  if (latestEnd && latestEnd > new Date() && !eventNodePages.has("join.html"))
    err(
      "join.html",
      `No Event JSON-LD, but the build describes an upcoming cleanup ending ${latestEnd.toISOString()}. Google event listings need the schema — check the eventSchema block in src/pages/join.astro.`,
    );
}

// --------------------------------------------------------- schedule runway ---
// The one check that reads src/ instead of dist/, deliberately. Everything above
// asks "is what shipped correct?"; this asks "is anyone still feeding it?" —
// which is the failure mode of a volunteer site. src/data/schedule.json holds
// every cleanup anyone has scheduled, and the site walks it forward on its own,
// so the site only goes stale when that list runs dry. Warn while there is still
// time to act; error once it has.
const SCHEDULE_FILE = "src/data/schedule.json";
const LOW_WATER_DAYS = 21; // one monthly edit's worth of notice
if (existsSync(SCHEDULE_FILE)) {
  let rows = null;
  try {
    rows = JSON.parse(readFileSync(SCHEDULE_FILE, "utf8"))?.cleanups;
  } catch (e) {
    err(SCHEDULE_FILE, `Not valid JSON: ${e.message}`);
  }
  if (Array.isArray(rows)) {
    // Date-only comparison in New York, where the cleanups are: "YYYY-MM-DD"
    // strings sort correctly as text, so today's date is the whole comparison.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
      new Date(),
    );
    const upcoming = rows
      .map((r) => String(r?.date ?? ""))
      .filter((d) => d >= today)
      .sort();
    const last = upcoming.at(-1);
    if (!last) {
      const msg = `No upcoming cleanups: every date in ${SCHEDULE_FILE} has passed, so the site is advertising an event that already happened. Add the next dates in Pages CMS → "Schedule".`;
      process.env.SEO_SKIP_FRESH ? warn(SCHEDULE_FILE, msg) : err(SCHEDULE_FILE, msg);
    } else {
      const daysLeft = Math.round((Date.parse(last) - Date.parse(today)) / 86_400_000);
      if (daysLeft < LOW_WATER_DAYS)
        warn(
          SCHEDULE_FILE,
          `The schedule runs out on ${last} — ${daysLeft === 0 ? "that is today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} from now`}. Add next month's cleanups in Pages CMS → "Schedule".`,
        );
    }
  }
}

// ---------------------------------------------------------------- report ---
const order = { ERROR: 0, WARN: 1 };
issues.sort((a, b) => order[a.level] - order[b.level] || a.file.localeCompare(b.file));
let e = 0,
  w = 0;
for (const i of issues) {
  i.level === "ERROR" ? e++ : w++;
  console.log(`${i.level === "ERROR" ? "✖" : "▲"} [${i.level}] ${i.file}: ${i.msg}`);
}
console.log(`\n${htmlFiles.length} pages · ${e} errors · ${w} warnings`);
if (missingAssets.size)
  console.log(
    `Missing asset paths (${missingAssets.size} unique): ${[...missingAssets].slice(0, 8).join(", ")}${missingAssets.size > 8 ? " …" : ""}`,
  );
process.exit(e ? 1 : 0);

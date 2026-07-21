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
 * Env: SEO_SKIP_FRESH=1 downgrades stale-Event-schema errors to warnings.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, posix } from "node:path";

// ---------------------------------------------------------------- config ---
const CFG = {
  // Strings that must never ship in visible text (case-insensitive). ERROR.
  forbiddenVisible: ["example.org", "example.com", "lorem ipsum", "TKTK", "STUB —", "STUB -"],
  // Softer launch markers. WARN.
  warnVisible: ["coming soon", "TODO"],
  // Comment markers that leak roadmap if shipped inside <!-- -->. WARN.
  commentMarkers: ["TODO", "STUB", "FIXME", "HACK"],
  // Alt texts that are effectively junk. WARN. (alt="" is fine = decorative.)
  junkAlts: ["...", "\u2026", ".", "-", "image", "photo", "help me"],
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
  thinAllow: ["terms.html", "404.html"], // pages allowed to be thin
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
        const end = new Date(n.endDate ?? n.startDate ?? 0);
        if (end < new Date()) {
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

  // Internal links resolve
  for (const m of body.matchAll(/href="([^"#]+)"/g)) {
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
    const alt = tag.match(/alt="([^"]*)"/);
    if (!alt) noAlt++;
    else if (
      CFG.junkAlts.includes(alt[1].trim().toLowerCase()) ||
      CFG.junkAlts.includes(alt[1].trim())
    )
      junk.push(alt[1]);
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
  if (junk.length)
    warn(
      page,
      `${junk.length} image(s) with junk alt text (${[...new Set(junk)].slice(0, 4).join(", ")}) — use real descriptions or alt="" if decorative.`,
    );
  if (pageImgBytes > CFG.imgBudgetBytes)
    warn(
      page,
      `Local image weight ${(pageImgBytes / 1048576).toFixed(2)} MB exceeds ${(CFG.imgBudgetBytes / 1048576).toFixed(1)} MB budget.`,
    );

  // Sitemap membership (indexable pages only)
  if (!inSitemap.has(page) && page !== "404.html" && !(rm && /noindex/i.test(rm[1])))
    err(page, "Indexable page missing from sitemap.");
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

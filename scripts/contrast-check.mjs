#!/usr/bin/env node
/**
 * contrast-check.mjs — WCAG contrast gate for the colour tokens.
 *
 * Zero dependencies (Node 18+). Reads the `:root` block of src/styles/tokens.css
 * and recomputes the contrast ratio of every colour pairing the site actually
 * renders, so changing a token can't quietly ship an unreadable page.
 *
 * Why this exists: the palette once had a token named `--muted` that was used as
 * both a background and a text colour. At 1.44:1 on --bg it made the "← Back
 * home" link on every prose page effectively invisible. The fix at the time was
 * a rename (`--surface`) and a comment. A comment is not a gate — this is.
 *
 * Usage:
 *   node scripts/contrast-check.mjs                (defaults to src/styles/tokens.css)
 *   node scripts/contrast-check.mjs path/to/tokens.css
 *
 * Exit codes: 0 = every pair passes, 1 = at least one fails.
 *
 * ADDING A PAIR: if you introduce a colour combination the site renders — new
 * text colour, new button, new focus style — add it to PAIRS below. The check
 * only knows about the pairings listed here.
 */

import { readFileSync } from "node:fs";

// ---------------------------------------------------------------- config ---
// Every foreground/background pairing the stylesheets actually produce.
//
// `min` is the WCAG 2.2 threshold for that kind of thing:
//   4.5  normal-size text                       (1.4.3 Contrast (Minimum), AA)
//   3    large text, icons, UI component edges, focus indicators
//        (1.4.3 for large text, 1.4.11 Non-text Contrast, 2.4.13 Focus Appearance)
const PAIRS = [
  { fg: "--text", bg: "--bg", min: 4.5, what: "Body text on the page background" },
  { fg: "--text-muted", bg: "--bg", min: 4.5, what: "Dim text: prose back-link, ticker control" },
  { fg: "--text", bg: "--surface", min: 4.5, what: "Text on a raised surface (.cta-secondary)" },
  { fg: "--bg", bg: "--btn-light", min: 4.5, what: "Primary button label" },
  { fg: "--bg", bg: "--accent", min: 4.5, what: "Label on an accent fill (hover/focus states)" },
  { fg: "--bg", bg: "--select", min: 4.5, what: "Text inside <mark>" },
  { fg: "--accent", bg: "--bg", min: 3, what: "Accent used as an icon/indicator colour" },
  { fg: "--focus-ring-color", bg: "--bg", min: 3, what: "Keyboard focus ring (WCAG 2.4.13)" },
  { fg: "--focus-ring-color", bg: "--surface", min: 3, what: "Focus ring over a raised surface" },
];

// Tokens that must NEVER be used as a foreground colour. Listing one here says
// "this is a background/hairline, and here is the number that proves it" — so a
// future edit that reaches for it as text has a documented reason not to.
const BACKGROUND_ONLY = [
  { token: "--surface", note: "backgrounds only — 1.44:1 on --bg is the original bug" },
  { token: "--line", note: "hairline dividers only; decorative, not a UI boundary" },
];

// ------------------------------------------------------------- plumbing ---
const file = process.argv[2] ?? "src/styles/tokens.css";

let css;
try {
  css = readFileSync(file, "utf8");
} catch {
  console.error(`✖ tokens file not found: ${file}`);
  process.exit(1);
}

// Pull `--name: value;` out of the :root block, ignoring comments.
const rootBlock = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/:root\s*\{([\s\S]*?)\}/);
if (!rootBlock) {
  console.error(`✖ no :root { … } block in ${file}`);
  process.exit(1);
}
const tokens = new Map();
for (const m of rootBlock[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens.set(m[1], m[2].trim());

// Follow `--a: var(--b)` chains to the literal colour. Depth-capped so a
// self-referential token reports instead of hanging.
function resolve(name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const raw = tokens.get(name);
  if (!raw) return null;
  const alias = raw.match(/^var\(\s*(--[\w-]+)/);
  return alias ? resolve(alias[1], seen) : raw;
}

// sRGB parsing: #rgb, #rrggbb, and rgb()/rgba() with integer channels. Anything
// else (color-mix, hsl, oklch) is reported rather than silently skipped — a pair
// that can't be measured is a hole in the gate, not a pass.
function toRgb(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const fn = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])];
  return null;
}

// WCAG 2.x relative luminance + contrast ratio.
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ---------------------------------------------------------------- report ---
const failures = [];
const rows = [];

for (const { fg, bg, min, what } of PAIRS) {
  const fgRaw = resolve(fg);
  const bgRaw = resolve(bg);
  if (!fgRaw || !bgRaw) {
    failures.push(`${fg} on ${bg}: token not defined in ${file}`);
    continue;
  }
  const fgRgb = toRgb(fgRaw);
  const bgRgb = toRgb(bgRaw);
  if (!fgRgb || !bgRgb) {
    failures.push(
      `${fg} on ${bg}: cannot measure (${!fgRgb ? fgRaw : bgRaw}) — use a hex or rgb() value, or drop the pair`,
    );
    continue;
  }
  const r = ratio(fgRgb, bgRgb);
  const ok = r >= min;
  if (!ok) failures.push(`${fg} on ${bg}: ${r.toFixed(2)}:1 — needs ${min}:1 (${what})`);
  rows.push({ ok, label: `${fg} on ${bg}`, r, min, what });
}

// Report background-only tokens as information, with the measured number that
// explains the rule. Never a failure — these are correct as backgrounds.
for (const { token, note } of BACKGROUND_ONLY) {
  const raw = resolve(token);
  const rgb = raw && toRgb(raw);
  const bgRgb = toRgb(resolve("--bg") ?? "");
  if (rgb && bgRgb)
    rows.push({
      ok: null,
      label: `${token} on --bg`,
      r: ratio(rgb, bgRgb),
      min: null,
      what: note,
    });
}

const width = Math.max(...rows.map((row) => row.label.length));
for (const row of rows) {
  const mark = row.ok === null ? "·" : row.ok ? "✔" : "✖";
  const need = row.min === null ? "     " : `(≥${row.min})`.padStart(7);
  console.log(
    `${mark} ${row.label.padEnd(width)}  ${row.r.toFixed(2).padStart(6)}:1 ${need}  ${row.what}`,
  );
}

console.log(
  `\n${rows.filter((r) => r.ok !== null).length} pairs checked · ${failures.length} failing`,
);
if (failures.length) {
  console.error("\nFix the token values in " + file + ", or the pairing in the stylesheet:");
  for (const f of failures) console.error(`  ✖ ${f}`);
  process.exit(1);
}

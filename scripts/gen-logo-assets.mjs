// Regenerates the raster logo assets from public/images/logo.svg (a hand
// cradling a tree). Run `npm run gen:logo` after editing that file.
//
// Writes:
//   public/favicon.svg          the tree mark, theme-aware (see "Colour" below)
//   public/favicon.png          tree mark, transparent, 288px wide
//   public/apple-touch-icon.png 180x180 tree mark on the site background, opaque
//   public/images/logo.webp     400x400 full mark (hand + tree), transparent
//
// Does NOT write, and must be kept in sync BY HAND:
//   src/components/SiteHeader.astro       (inline <svg>, currentColor — copy the
//                                          viewBox and path across after an edit)
//
// WHAT THIS SCRIPT ASSUMES about logo.svg. It reads the file with regexes, not
// an SVG parser, so redrawing the logo without honoring these will produce
// silently wrong output rather than an error:
//
//   1. Exactly ONE <path> element (enforced below — the script throws otherwise).
//   2. Its `d` attribute begins its subpaths with "M", and the FIRST TWO subpaths
//      are the tree (canopy outline, then trunk notch); everything after is the
//      hand. Reordering them changes what the favicon shows.
//   3. A viewBox anchored at "0 0".
//   4. The tree's height in user units is the hardcoded `treeH` below. It is
//      measured, not derived — re-measure it (e.g. in a vector editor, or via the
//      bounding box of the first two subpaths) after any edit to the tree, or the
//      favicon and touch icon will crop or letterbox.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
// logo.svg's own fill. Used for logo.webp ONLY — that is the schema.org
// organization logo, which search engines composite onto white, so it stays
// ink-black and takes no part in the theme-aware icon colours below.
const BLACK = "#010101";

// Colour maths, in service of the block below. Function declarations, not
// arrow consts, so they can be read after the code that uses them.
function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** sRGB relative luminance (WCAG 2.2 §relative-luminance). */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. Same formula as scripts/contrast-check.mjs. */
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** The same hue and saturation at a new HSL lightness — a tint of one colour,
    not a second colour someone has to keep in step. */
function withLightness(hex, lightness) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const c = (1 - Math.abs(2 * lightness - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  const [r2, g2, b2] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return (
    "#" +
    [r2, g2, b2]
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// ── Colour ──────────────────────────────────────────────────────────────────
// The icon colours are READ from src/styles/tokens.css rather than typed here,
// so they cannot drift from the palette the way the old hard-coded #4ab96f did
// (it outlived two background changes). Retint the site by editing --accent,
// then run `npm run gen:logo`.
const tokensCss = readFileSync(new URL("src/styles/tokens.css", `file://${root}`), "utf8");
const token = (name) => {
  const m = tokensCss
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\b`));
  if (!m) {
    throw new Error(
      `src/styles/tokens.css has no literal \`${name}: #rrggbb\`. This script reads the icon ` +
        `colours from there; give the token a six-digit hex value (not a var() alias) and re-run.`,
    );
  }
  return m[1].toLowerCase();
};
const ACCENT = token("--accent"); // the mark
const BG = token("--bg"); // the touch icon's field

// A browser tab strip is NOT the site's background: it is near-white under a
// light OS theme and near-black under a dark one. --accent is a mint green that
// sits at ~1.5:1 on white — invisible in half the world's tab strips. So the
// mark ships in two shades:
//
//   ACCENT      dark browser chrome, and the touch icon (which sits on --bg).
//               Selected by a prefers-color-scheme query inside favicon.svg.
//   ACCENT_INK  every place the shade CANNOT adapt: light chrome, and the PNG
//               fallback, which is one static file serving both themes.
//
// ACCENT_INK is --accent at the lightness where its *worst* contrast — against
// white on one side, a dark tab strip on the other — is highest: ~3.4:1 either
// way, clearing WCAG 1.4.11's 3:1 for a non-text graphic. It is derived, not
// typed, so it follows --accent; the assertions below fail the run loudly if a
// future accent can't reach 3:1 in both places.
const ACCENT_INK = withLightness(ACCENT, 0.345);

for (const [fg, bg, what] of [
  [ACCENT, "#35363a", "favicon.svg in dark browser chrome"],
  [ACCENT, BG, "apple-touch-icon on the site background"],
  [ACCENT_INK, "#ffffff", "favicon.svg / favicon.png in light browser chrome"],
  [ACCENT_INK, "#35363a", "favicon.png in dark browser chrome"],
]) {
  const ratio = contrast(fg, bg);
  if (ratio < 3) {
    throw new Error(
      `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, below the 3:1 WCAG 1.4.11 needs for a ` +
        `non-text graphic. --accent in src/styles/tokens.css is too close to that background — ` +
        `pick an accent with more room, or the mark disappears into the tab strip.`,
    );
  }
}

// Pull the path + viewBox out of the source SVG.
const src = readFileSync(new URL("public/images/logo.svg", `file://${root}`), "utf8");

// Assumption 1, enforced: only the FIRST <path> is ever read, so a logo redrawn
// as several paths would silently generate assets from a fragment of itself.
const pathCount = (src.match(/<path\b/g) ?? []).length;
if (pathCount !== 1) {
  throw new Error(
    `public/images/logo.svg has ${pathCount} <path> elements; this script only reads the first one ` +
      `and would generate the logo from a fragment. Flatten the artwork to a single path (in your ` +
      `vector editor: select all → unite/merge), then re-measure treeH in this script.`,
  );
}

// Assumption 2, enforced: the path carries its outline in a `d` attribute.
const dMatch = src.match(/ d="([^"]+)"/);
if (!dMatch) {
  throw new Error(
    `public/images/logo.svg has no <path d="…"> attribute, so there is no outline to read. ` +
      `Re-export it with the artwork as a single path (some editors emit <rect>/<circle> ` +
      `shapes instead — convert those to a path first).`,
  );
}
const d = dMatch[1];

// Assumption 3, enforced: the viewBox starts at 0 0, because every coordinate
// below is measured from that origin.
const vbMatch = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
if (!vbMatch) {
  throw new Error(
    `public/images/logo.svg needs a viewBox anchored at "0 0" (this script measures every ` +
      `coordinate from that origin). Move the artwork so it starts at the top-left corner, ` +
      `then re-export.`,
  );
}
const [vbW, vbH] = vbMatch.slice(1).map(Number);

// Subpaths: 0 = tree canopy+trunk outline, 1 = trunk notch, 2..n = hand swooshes.
const subs = d.split(/(?=M)/g);
const tree = subs.slice(0, 2).join(""); // the icon mark (matches historical favicon)
const full = d; // the complete lockup (hand + tree)

// Tree bbox shares the source origin (0,0); height differs from the full mark.
// MEASURED, not computed — see assumption 4 in the header. Re-measure after any
// edit to the tree artwork.
const treeH = 296.1;

const svg = ({ w, h, bg, fill, path, tx = 0, ty = 0, scale = 1 }) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : "") +
      `<g transform="translate(${tx},${ty}) scale(${scale})"><path fill="${fill}" d="${path}"/></g>` +
      `</svg>`,
  );

const out = (p) => new URL(`public/${p}`, `file://${root}`);

// favicon.svg — the icon every current browser actually reaches for. The fill
// lives in a <style>, not on the path, so it can answer prefers-color-scheme.
// The DEFAULT is ACCENT_INK rather than ACCENT on purpose: Chrome and Firefox
// re-evaluate the query against the browser's own theme, but Safari rasterises
// an SVG favicon once and never re-runs it, so whatever sits outside the query
// has to be the shade that survives either tab strip.
writeFileSync(
  fileURLToPath(out("favicon.svg")),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${treeH}">` +
    `<style>path{fill:${ACCENT_INK}}` +
    `@media (prefers-color-scheme:dark){path{fill:${ACCENT}}}</style>` +
    `<path d="${tree}"/></svg>\n`,
);

// favicon.png — tree mark, transparent, ~288px wide (matches prior asset). One
// static image for both themes, so it takes the dual-safe ink.
await sharp(svg({ w: vbW, h: treeH, fill: ACCENT_INK, path: tree }))
  .resize({ width: 288 })
  .png()
  .toFile(fileURLToPath(out("favicon.png")));

// apple-touch-icon.png — 180x180 accent tree on the site background, ~40px
// vertical padding. This one is only ever seen against itself (a home-screen
// tile), so it can use the accent as the site does.
{
  const size = 180,
    inner = 140,
    scale = inner / treeH;
  await sharp(
    svg({
      w: size,
      h: size,
      bg: BG,
      fill: ACCENT,
      path: tree,
      scale,
      tx: (size - vbW * scale) / 2,
      ty: (size - inner) / 2,
    }),
  )
    .png()
    .toFile(fileURLToPath(out("apple-touch-icon.png")));
}

// logo.webp — 400x400 full mark, black, transparent (JSON-LD org logo + OG image).
{
  const size = 400,
    inner = 360,
    scale = inner / vbH;
  await sharp(
    svg({
      w: size,
      h: size,
      fill: BLACK,
      path: full,
      scale,
      tx: (size - vbW * scale) / 2,
      ty: (size - inner) / 2,
    }),
  )
    .webp({ quality: 90 })
    .toFile(fileURLToPath(new URL("public/images/logo.webp", `file://${root}`)));
}

console.log(
  `Regenerated favicon.svg (${ACCENT_INK} / ${ACCENT} dark), favicon.png, apple-touch-icon.png, images/logo.webp`,
);

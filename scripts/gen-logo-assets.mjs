// Regenerates the raster logo assets from public/images/logo.svg (a hand
// cradling a tree). Run `npm run gen:logo` after editing that file.
//
// Writes:
//   public/favicon.png          green tree mark, transparent, 288px wide
//   public/apple-touch-icon.png 180x180 green tree on black, opaque
//   public/images/logo.webp     400x400 full mark (hand + tree), transparent
//
// Does NOT write, and must be kept in sync BY HAND:
//   public/favicon.svg                    (the green tree mark, hand-authored)
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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const GREEN = "#4ab96f"; // brand green, from favicon.svg
const BLACK = "#010101"; // logo.svg source fill

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

const d = src.match(/ d="([^"]+)"/)[1];
const [vbW, vbH] = src
  .match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  .slice(1)
  .map(Number);

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

// favicon.png — green tree, transparent, ~288px wide (matches prior asset).
await sharp(svg({ w: vbW, h: treeH, fill: GREEN, path: tree }))
  .resize({ width: 288 })
  .png()
  .toFile(fileURLToPath(out("favicon.png")));

// apple-touch-icon.png — 180x180 green tree on black, ~40px vertical padding.
{
  const size = 180,
    inner = 140,
    scale = inner / treeH;
  await sharp(
    svg({
      w: size,
      h: size,
      bg: BLACK,
      fill: GREEN,
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

console.log("Regenerated favicon.png, apple-touch-icon.png, images/logo.webp");

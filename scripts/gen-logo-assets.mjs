// Regenerates every raster/derived logo asset from the single source of truth:
//   public/images/logo.svg  (a hand cradling a tree)
//
// Outputs (run `npm run gen:logo` after editing logo.svg):
//   public/favicon.svg          green tree mark (canopy + trunk), transparent
//   public/favicon.png          raster of favicon.svg, transparent
//   public/apple-touch-icon.png 180x180 green tree on black, opaque
//   public/images/logo.webp     400x400 full mark (hand + tree), black, transparent
//
// The header logo in src/components/SiteHeader.astro is an inline <svg> using
// currentColor; keep its viewBox + path in sync with logo.svg by hand.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const GREEN = "#4ab96f"; // brand green, from favicon.svg
const BLACK = "#010101"; // logo.svg source fill

// Pull the path + viewBox out of the source SVG.
const src = readFileSync(new URL("public/images/logo.svg", `file://${root}`), "utf8");
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

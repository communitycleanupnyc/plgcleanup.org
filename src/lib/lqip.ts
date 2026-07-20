import type { ImageMetadata } from 'astro';
import sharp from 'sharp';

/**
 * Build-time Low-Quality Image Placeholder (LQIP) generator.
 *
 * Reproduces, byte-for-byte in shape, the blur-up placeholder that Next.js'
 * `<Image placeholder="blur">` renders — the exact effect on config.figma.com.
 * The recipe:
 *
 *   1. A tiny (~16px) preview of the photo, base64-encoded.
 *   2. Wrapped in an inline SVG whose filter blurs it (`feGaussianBlur`), with an
 *      edge-cleanup pass (`feColorMatrix` → `feFlood` → two `feComposite`s) that
 *      floods the semi-transparent halo a naive blur would leave at the edges,
 *      then re-blurs. This is Next.js' filter chain, copied verbatim.
 *   3. Returned as a `data:image/svg+xml;…` URI meant to be dropped straight into
 *      an element's `background-image`, under `background-size: cover`.
 *
 * The real <img> paints over this blurred background as it decodes, so the photo
 * appears to "sharpen in". Because our photos are opaque and cover the box, the
 * placeholder is naturally occluded once loaded even with JS disabled; the
 * carousel's client script additionally clears it to free the bytes.
 *
 * Runs only in the Astro frontmatter (build time for this static site), so sharp
 * and Node `fs` are available and nothing ships to the client.
 */

// Longest edge of the generated preview, in px. Next.js uses 8; 16 keeps a touch
// more structure while still measuring only a few hundred bytes of base64.
const PLACEHOLDER_SIZE = 16;

// Memoize by source path: a photo reused across pages is only rasterized once.
const cache = new Map<string, Promise<string>>();

// Astro attaches a non-enumerable, absolute `fsPath` to every ESM-imported image
// at build time (see astro/dist/assets/utils/node.js). It isn't in the public
// ImageMetadata type, so we reach for it defensively and bail if it's absent
// (e.g. a remote image), returning '' → caller simply renders no placeholder.
function sourcePath(img: ImageMetadata): string | undefined {
  return (img as ImageMetadata & { fsPath?: string }).fsPath;
}

async function build(img: ImageMetadata): Promise<string> {
  const fsPath = sourcePath(img);
  if (!fsPath) return '';

  const preview = await sharp(fsPath)
    .resize(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, { fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer();
  const href = `data:image/webp;base64,${preview.toString('base64')}`;

  // viewBox uses the real pixel dimensions so `background-size: cover` maps the
  // SVG 1:1 onto the photo box. `stdDeviation='20'` matches Next.js/Figma.
  const { width: w, height: h } = img;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
      `<filter id='b' color-interpolation-filters='sRGB'>` +
        `<feGaussianBlur stdDeviation='20'/>` +
        `<feColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/>` +
        `<feFlood x='0' y='0' width='100%' height='100%'/>` +
        `<feComposite operator='out' in='s'/>` +
        `<feComposite in2='SourceGraphic'/>` +
        `<feGaussianBlur stdDeviation='20'/>` +
      `</filter>` +
      `<image width='100%' height='100%' x='0' y='0' preserveAspectRatio='none' style='filter: url(#b);' href='${href}'/>` +
    `</svg>`;

  // Minimal percent-encoding for an inline `url()` data-URI, matching Next.js'
  // output: encode `%` first (so the `width='100%'` and `url(#b)` don't collide),
  // then the angle brackets and the fragment `#`. Spaces and single quotes are
  // valid unencoded inside a quoted url(); base64 has none of these characters.
  const encoded = svg
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/** Returns a blur-up `background-image` data-URI for an imported image, or ''. */
export function lqip(img: ImageMetadata): Promise<string> {
  const key = sourcePath(img);
  if (!key) return Promise.resolve('');
  let cached = cache.get(key);
  if (!cached) {
    cached = build(img);
    cache.set(key, cached);
  }
  return cached;
}

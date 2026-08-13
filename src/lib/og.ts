import { getCollection } from "astro:content";
import { SITE } from "../site.config";

// Social share image (Open Graph / Twitter) for iMessage, WhatsApp, SMS, etc.
//
// By default this is the first gallery item in carousel order (lowest `order`),
// so link previews stay stable across builds. Flip features.randomizeOgImage
// (src/site.config.ts) to feature a random one, chosen fresh per build.
// Base.astro renders the chosen photo into a high-res share image with Sharp.
const gallery = await getCollection("gallery");
// Base.astro renders this on every page, so an empty collection wouldn't fail
// one page — it would crash the whole build with a bare "cannot read image of
// undefined". Say what actually needs doing instead.
if (gallery.length === 0) {
  throw new Error(
    "[gallery] The social share image is built from a gallery photo, but src/content/gallery/ is empty. Add at least one item.",
  );
}
const byOrder = [...gallery].sort((a, b) => a.data.order - b.data.order);
const pick = SITE.features.randomizeOgImage
  ? gallery[Math.floor(Math.random() * gallery.length)]
  : byOrder[0];

export const featured = {
  image: pick.data.image,
  title: pick.data.title,
  // The item's authored alt, used verbatim as <meta property="og:image:alt">.
  alt: pick.data.alt,
};

// 1200×1200 is the canonical high-res OG size and displays large on iMessage and
// WhatsApp. `position: "attention"` is Sharp's saliency crop, which keeps faces
// in frame when squaring a portrait.
export const OG_SIZE = 1200;

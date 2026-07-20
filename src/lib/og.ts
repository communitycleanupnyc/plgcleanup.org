import { getCollection } from "astro:content";
import { RANDOMIZE_OG_IMAGE } from "../config";

// Social share image (Open Graph / Twitter) for iMessage, WhatsApp, SMS, etc.
//
// By default this is the first testimonial in carousel order (lowest `order`),
// so link previews stay stable across builds. Flip RANDOMIZE_OG_IMAGE
// (src/config.ts) to feature a random volunteer, chosen fresh per build.
// Base.astro renders the chosen photo into a high-res share image with Sharp.
const testimonials = await getCollection("testimonials");
const byOrder = [...testimonials].sort((a, b) => a.data.order - b.data.order);
const pick = RANDOMIZE_OG_IMAGE
  ? testimonials[Math.floor(Math.random() * testimonials.length)]
  : byOrder[0];

export const featured = {
  image: pick.data.image,
  name: pick.data.name,
};

// 1200×1200 is the canonical high-res OG size and displays large on iMessage and
// WhatsApp. `position: "attention"` is Sharp's saliency crop, which keeps faces
// in frame when squaring a portrait.
export const OG_SIZE = 1200;

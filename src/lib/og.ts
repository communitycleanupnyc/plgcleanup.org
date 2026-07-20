import { getCollection } from "astro:content";

// Social share image (Open Graph / Twitter) for iMessage, WhatsApp, SMS, etc.
//
// Pick one testimonial at random per build; Base.astro renders it into a
// high-res share image with Astro's Sharp pipeline.
const testimonials = await getCollection("testimonials");
const pick = testimonials[Math.floor(Math.random() * testimonials.length)];

export const featured = {
  image: pick.data.image,
  name: pick.data.name,
};

// 1200×1200 is the canonical high-res OG size and displays large on iMessage and
// WhatsApp. `position: "attention"` is Sharp's saliency crop, which keeps faces
// in frame when squaring a portrait.
export const OG_SIZE = 1200;

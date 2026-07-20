import { getCollection } from "astro:content";
import cycle from "../data/og-cycle.json";

// Social share image (Open Graph / Twitter) for iMessage, WhatsApp, SMS, etc.
//
// The featured volunteer is chosen by a shuffle bag persisted in og-cycle.json
// and advanced by scripts/rotate-og.mjs (see that file). Here we just read the
// current pick; if the state is missing or stale (e.g. the volunteer was
// removed), fall back to a random one so the build never breaks.
const testimonials = await getCollection("testimonials");

const pick =
  testimonials.find((t) => t.id === cycle.featured) ??
  testimonials[Math.floor(Math.random() * testimonials.length)];

export const featured = {
  image: pick.data.image,
  name: pick.data.name,
};

// 1200×1200 is the canonical high-res OG size and displays large on iMessage and
// WhatsApp. `position: "attention"` is Sharp's saliency crop, which keeps faces
// in frame when squaring a portrait.
export const OG_SIZE = 1200;

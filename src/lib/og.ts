import { lead } from "./gallery";

// The social share image (Open Graph / Twitter) — what iMessage, WhatsApp,
// Facebook, Slack and SMS show in a link preview.
//
// It is always the gallery photo leading the homepage carousel, so the preview
// matches the top of the page. Which photo that is — fixed, or a fair daily
// rotation — is decided in gallery.ts by `features.rotateGallery`
// (src/site.config.ts). Base.astro renders the chosen photo into a high-res
// share image with Sharp.
export const featured = {
  image: lead.data.image,
  title: lead.data.title,
  // The item's authored alt, used verbatim as <meta property="og:image:alt">.
  alt: lead.data.alt,
};

// 1200×1200 is the canonical high-res OG size and displays large on iMessage and
// WhatsApp. `position: "attention"` is Sharp's saliency crop, which keeps faces
// in frame when squaring a portrait.
export const OG_SIZE = 1200;

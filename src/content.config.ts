import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

// Non-empty, whitespace-trimmed string — so a blank CMS field fails the build
// loudly instead of shipping empty text. The message names the offending field.
const filled = (field: string) => z.string().trim().min(1, `${field} must not be empty`);

// Prose pages (about, faq, terms, schedule, partners, and the rest). Each is a
// Markdown file in src/content/pages/ — the filename is the URL (faq.md → /faq).
// Non-technical editors change the heading/body in Markdown; the frontmatter
// below sets the browser title and social description. `title` is the short,
// page-specific part only (e.g. "FAQ"); Base.astro appends " | Community Cleanup
// PLG" so the site name + separator live in one place.
const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: filled("title"),
    description: filled("description"),
    navMode: z.enum(["ticker", "static"]).default("static"),
  }),
});

// Testimonials shown in the home-page carousel. One Markdown file per person:
// frontmatter holds their name, pull-quote, photo, and alt text; the Markdown
// body is the longer testimonial shown in the reveal panel.
const testimonials = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/testimonials" }),
  schema: ({ image }) =>
    z.object({
      name: filled("name"),
      quote: filled("quote"),
      alt: filled("alt"),
      // Optional CSS object-position for the cropped photo, e.g. "50% 30%".
      focusPosition: z.string().trim().min(1).optional(),
      image: image(),
      // Lower numbers sort first; the 2nd entry is the default carousel highlight.
      order: z.number().int().nonnegative().default(100),
    }),
});

export const collections = { pages, testimonials };

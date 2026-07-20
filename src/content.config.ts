import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

// Prose pages (about, faq, terms, community-agreements, schedule). Each is a
// Markdown file in src/content/pages/ — the filename is the URL (faq.md → /faq).
// Non-technical editors change the heading/body in Markdown; the frontmatter
// below sets the browser title and social description.
const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
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
      name: z.string(),
      quote: z.string(),
      alt: z.string(),
      // Optional CSS object-position for the cropped photo, e.g. "50% 30%".
      focusPosition: z.string().optional(),
      image: image(),
      // Lower numbers sort first; the 2nd entry is the default carousel highlight.
      order: z.number().default(100),
    }),
});

export const collections = { pages, testimonials };

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
// frontmatter holds their name, pull-quote, and photo; the Markdown body is the
// longer testimonial shown in the reveal panel.
//
// There is deliberately no `alt` field. Every photo here is a portrait of the
// named volunteer, so Carousel.astro derives the alt text from `name` — an
// editor can't leave it blank, can't type "…" into it, and can't forget to
// update it when the photo changes.
const testimonials = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/testimonials" }),
  schema: ({ image }) =>
    z.object({
      name: filled("name"),
      quote: filled("quote"),
      // Optional CSS object-position for the cropped photo, e.g. "50% 30%".
      // Absent, empty, or blank all mean "centered" (Carousel.astro falls back
      // to "50% 50%"): a bare or emptied `focusPosition:` line left behind by a
      // hand edit is not an error, so it must not fail the build.
      focusPosition: z.preprocess(
        (value) =>
          value == null || (typeof value === "string" && value.trim() === "") ? undefined : value,
        z
          .string()
          .trim()
          .regex(
            /^\d{1,3}% \d{1,3}%$/,
            'Photo focus must be blank, or two percentages like "50% 30%" (horizontal then vertical).',
          )
          .optional(),
      ),
      image: image(),
      // Lower numbers sort first; the 2nd entry is the default carousel highlight.
      order: z.number().int().nonnegative().default(100),
    }),
});

export const collections = { pages, testimonials };

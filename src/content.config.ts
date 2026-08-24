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
  schema: ({ image }) =>
    z.object({
      title: filled("title"),
      description: filled("description"),
      navMode: z.enum(["ticker", "static"]).default("static"),
      // Headings on this page that fold into a dropdown: the heading becomes the
      // thing you click and its section unfolds beneath. Matched by text, so
      // `- Team` collapses "## Team". src/plugins/collapsible-sections.ts does
      // the work and fails the build if a name here matches no heading.
      collapse: z.array(filled("collapse")).default([]),
      // Optional easter egg: a raccoon (src/assets/raccoon-*.webp) in the page's
      // right-hand margin, which you can tap to spin and throw around the
      // screen — see Raccoon.astro. Written as a path relative to this file,
      // e.g. `../../assets/raccoon-sterling.webp`; a path that points at no
      // image fails the build. Purely decorative, so any page can drop it.
      // It isn't in .pages.yml on purpose — it's a developer's choice, not an
      // editor's — and merge mode there (see settings.content) keeps it in the
      // file when an editor saves the page.
      raccoon: image().optional(),
    }),
});

// The image gallery shown in the carousel (Carousel.astro). One Markdown file
// per item: frontmatter holds its title, caption, photo, and alt text; the
// Markdown body, if present, is the longer text shown in the reveal panel.
//
// `alt` is required and authored per photo. Alt text describes THIS image to
// someone who can't see it, so it can't be generated from the title — "Portrait
// of Abby" and "Abby laughing while emptying a grabber into a blue bag" are not
// interchangeable. Write what is in the frame; don't start with "Image of".
const gallery = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/gallery" }),
  schema: ({ image }) =>
    z.object({
      title: filled("title"),
      caption: filled("caption"),
      alt: filled("alt"),
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

export const collections = { pages, gallery };

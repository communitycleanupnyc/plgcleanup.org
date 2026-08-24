// The site's caret glyph — the small chevron that says "there is more here".
// This file is the only place its geometry is written down.
//
// Two things draw it, and they can't share an .astro component: Carousel.astro
// renders it inline in a slide's caption, and the build-time plugin in
// src/plugins/collapsible-sections.ts builds it as a syntax-tree node while it
// rewrites Markdown. Both read the numbers from here, so retuning the glyph is
// one edit and the caret in a testimonial can't drift from the caret on a
// collapsible heading.
//
// It points UP at rest, and each user rotates it for its own direction of
// travel: the testimonial panel rises, so the carousel rotates it on open; a
// collapsible section drops, so Prose.astro parks it at 180deg and rotates it
// back. Same glyph, same 20px box, opposite journeys.
export const CARET = {
  /** Rendered size in px. The path is drawn in a 16-unit box and scaled up. */
  size: 20,
  viewBox: "0 0 16 16",
  path: "M4 10l4-4 4 4",
  strokeWidth: "1.5",
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const;

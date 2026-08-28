import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
// Vendored, not an npm dependency — see the header of that file for why.
import deleteUnusedImages from "./src/integrations/delete-unused-images/index.js";
// Ours: lets a content page collapse a named section into a <details> dropdown
// from its frontmatter, so the Markdown stays plain Markdown.
import collapsibleSections from "./src/plugins/collapsible-sections.ts";
// Ours: appends the "#" link to every subheading, so a section can be shared
// by URL.
import headingAnchors from "./src/plugins/heading-anchors.ts";
// Astro's own heading-id plugin, run early — see the note on rehypePlugins
// below. Not declared in package.json on purpose: it is astro's own dependency,
// pinned by astro to one exact version, and this import is the recipe Astro's
// docs give for plugins that need the ids. Declaring it here as well would risk
// a second, differently-versioned copy the day astro moves.
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

export default defineConfig({
  // Canonical production origin — used to build absolute URLs (e.g. the social
  // share image) at build time. No trailing slash (see below).
  site: "https://plgcleanup.org",
  output: "static",
  // Clean, trailing-slash-free URLs (/about, not /about/) — nicer to share.
  // `format: "file"` emits flat about.html instead of about/index.html, so
  // Cloudflare Pages serves /about and 308-redirects /about/ → /about;
  // `trailingSlash: "never"` enforces the same convention in dev and routing.
  trailingSlash: "never",
  build: { format: "file" },
  // Emits sitemap-index.xml + sitemap-0.xml from `site`, listing every static
  // route (testimonials aren't routes, so they're correctly absent). Referenced
  // from public/robots.txt.
  // sitemap first; the image pruner runs last (astro:build:done) so it scans the
  // fully-emitted dist. It only ever deletes from build.assets (_astro/) and only
  // image-extension files, keeping any whose hashed basename appears anywhere in
  // the scanned corpus — so referenced derivatives (and the getImage() og JPEG)
  // survive; only the unreferenced full-res originals Astro copies "just in case"
  // are removed. checkExtensions is widened past the .html/.css/.js default to
  // cover every reference surface (sitemap XML, JSON-LD/manifest) as insurance.
  integrations: [
    sitemap(),
    deleteUnusedImages({
      checkExtensions: [
        ".html",
        ".css",
        ".js",
        ".mjs",
        ".xml",
        ".svg",
        ".json",
        ".webmanifest",
        ".txt",
      ],
    }),
  ],
  markdown: {
    // Both run over the rendered HTML of every Markdown file — content pages
    // and gallery entries alike. collapsibleSections is a no-op for anything
    // without a `collapse:` list in its frontmatter.
    //
    // ORDER, and all three positions are load-bearing:
    //   rehypeHeadingIds — Astro runs its own copy of this AFTER the plugins
    //     listed here, which is too late for headingAnchors to see an id. It is
    //     safe to run twice: the second pass leaves an id that already exists
    //     alone, so the ids stay Astro's and stay stable.
    //   headingAnchors — before collapsibleSections, so a heading that moves
    //     into a <summary> takes its link with it.
    rehypePlugins: [rehypeHeadingIds, headingAnchors, collapsibleSections],
  },
  server: {
    host: true,
  },
  image: { responsiveStyles: true },
});

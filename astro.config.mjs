import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
// Vendored, not an npm dependency — see the header of that file for why.
import deleteUnusedImages from "./src/integrations/delete-unused-images/index.js";

export default defineConfig({
  // Canonical production origin — used to build absolute URLs (e.g. the social
  // share image) at build time. No trailing slash (see below).
  site: "https://plgcleanup.pages.dev",
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
  server: {
    host: true,
  },
  image: { responsiveStyles: true },
});

import { defineConfig } from "astro/config";

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
  server: {
    host: true,
  },
  image: { responsiveStyles: true },
});

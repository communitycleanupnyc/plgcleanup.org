import { defineConfig } from "astro/config";

export default defineConfig({
  // Canonical production origin — used to build absolute URLs (e.g. the social
  // share image) at build time.
  site: "https://plgcleanup.pages.dev/",
  output: "static",
  server: {
    host: true,
  },
  image: { responsiveStyles: true },
});

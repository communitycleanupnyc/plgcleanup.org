// public/_worker.js
//
// ⚠️ ADD ONLY AT DOMAIN CUTOVER — do not ship this before plgcleanup.org is
// attached to the Pages project, or *.pages.dev will redirect into the void.
//
// What it does: Cloudflare Pages "advanced mode" runs this in front of static
// assets. It 301s any request arriving on the legacy *.pages.dev hostname
// (including old preview links people saved) to the canonical domain,
// preserving path + query. This is the clean answer to "the pages.dev host
// stays live forever" — canonicals alone leave it indexed; this deindexes it.
//
// Deploy: drop in Astro's public/ folder (copied verbatim into dist/), change
// CANONICAL if the domain differs, ship in the same deploy that flips
// astro.config `site` to the custom domain. Then resubmit the sitemap in a new
// GSC property for plgcleanup.org.

const CANONICAL = "plgcleanup.org";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.endsWith(".pages.dev")) {
      url.hostname = CANONICAL;
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};

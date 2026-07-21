# Deploy drawer

Files staged here are **not shipped** — they sit out of `public/` on purpose
until a specific cutover moment. Nothing in this folder is copied into `dist/`.

## `_worker.js` — domain-cutover redirect (do NOT ship early)

301-redirects the legacy `*.pages.dev` host to the canonical custom domain,
preserving path + query. This deindexes the preview host (canonical tags alone
leave it indexed).

⚠️ **Shipping this before `plgcleanup.org` is attached to the Pages project will
redirect the live site into the void.** Only move it at cutover.

### Cutover checklist (do all of these in one PR / deploy)

1. Attach `plgcleanup.org` as a custom domain in the Cloudflare Pages project.
2. `astro.config.mjs`: set `site: "https://plgcleanup.org"`.
3. `public/robots.txt`: change the `Sitemap:` host to `plgcleanup.org`.
4. `.github/workflows/site-checks.yml`: flip `env.SITE` to `https://plgcleanup.org`.
5. `deploy/_worker.js` → move to `public/_worker.js` (confirm `CANONICAL` is
   `plgcleanup.org`).
6. Deploy, then in Google Search Console add a new property for `plgcleanup.org`
   and resubmit the sitemap.

Everything except step 5 flows from `astro.config` `site` — canonical, OG,
sitemap, and the audit's `--site` all derive from it.

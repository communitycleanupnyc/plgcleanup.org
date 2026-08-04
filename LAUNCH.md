# Launch runbook

Everything that has to happen to take this site live on **plgcleanup.org**, in
order. Until section A is done, several safety nets in this repo are deliberately
switched off — they are inert scaffolding, not working protection.

Steps marked **[you]** happen in a browser (Cloudflare, Google, GitHub settings);
everything else is a file in this repo, named with its exact location. Do A and B
in the same sitting: half a cutover is worse than neither half.

Section C is reference only — how to rebuild the Cloudflare project if it is ever
lost.

---

## A. Go-live — re-arm the safety nets

The repo currently ships with its automated checks disabled so that a past event
date and unfinished testimonial copy can't fail every build during setup. This
section turns them all back on. **Nothing here protects anything until it's done.**

1. **[you] Create the Cloudflare deploy hook.** Cloudflare dashboard → Workers &
   Pages → the `plgcleanup` project → **Settings → Builds → Deploy hooks** →
   create one (any name, branch `main`). Copy the URL it gives you, then in
   GitHub → repo → **Settings → Secrets and variables → Actions → New repository
   secret**, name it exactly `CF_PAGES_DEPLOY_HOOK` and paste the URL.

   Without this, step 3's daily redeploy silently fails every day.

2. **Set a real cleanup date.** `src/data/event.json` — the date, times, and
   street corner of the next actual cleanup. Date as `yyyy-mm-dd`, times like
   `10:00am`. (Or use Pages CMS → **Event details**.)

3. **Turn the crons back on.** `.github/workflows/site-checks.yml` — uncomment
   the two `- cron:` lines in the `on:` block.

   ⚠ **Uncomment them byte-for-byte.** The `links` and `redeploy` jobs decide
   whether to run by string-comparing `github.event.schedule` against these exact
   expressions. A stray space and the job stops running, with no error anywhere.

4. **Delete the pre-launch escape hatches.** Three files, same two variables:
   - `.github/workflows/ci.yml` → remove `SEO_SKIP_FRESH` and
     `SEO_SKIP_PLACEHOLDER` from the `env:` block.
   - `.github/workflows/site-checks.yml` → same two, same place.
   - `.githooks/pre-push` → remove both from the `npm run audit` line.

   Until this is done, the Monday tripwire in `site-checks.yml` cannot fail, which
   means it is decorative. **This is the single most important step in this file.**

   The build will now refuse to ship a page containing "todo", a testimonial named
   "xyz" or quoted as "...", or an event date in the past. If it fails here, that
   is the gate doing its job — finish the content rather than putting the
   variables back.

5. **[you] Make sure failures reach a person.** Every organizer with repo access:
   GitHub → this repo → **Watch → Custom → ✓ Issues**. When a scheduled check or
   a build fails, the workflows open an issue; with no watchers, nobody is told.

   Two things worth knowing:
   - GitHub **disables scheduled workflows in public repos after 60 days with no
     repo activity.** Weekly Pages CMS edits reset that clock, so in normal use it
     never fires. If it does: repo → **Actions** → "site checks" → **Enable
     workflow**.
   - Scheduled-run failure _email_ goes only to whoever last committed to the
     workflow file. That is why the issues exist — don't rely on the email.

---

## B. Domain cutover — same deploy

1. **[you] Attach both hostnames.** Cloudflare Pages project → **Custom domains**
   → add `plgcleanup.org` **and** `www.plgcleanup.org`. Then in the
   `plgcleanup.org` zone → **Rules → Redirect Rules**, add a 301 from `www.` to
   the apex preserving path and query.

   Don't skip `www`. If it isn't attached, `www.plgcleanup.org` is NXDOMAIN — and
   that's the form people type off a flyer.

2. **Point the site at the new origin.** In `astro.config.mjs`, set `site` to
   `https://plgcleanup.org`. Canonical URLs, OG tags, the sitemap, and the
   audit's expected host all derive from this one line.

3. **Update the four places that hardcode that hostname:**
   - `.github/workflows/site-checks.yml` → `env.SITE`
   - `.github/workflows/ci.yml` → `env.SITE`
   - `public/robots.txt` → the `Sitemap:` line
   - `README.md` → the "Live:" line near the top

4. **[you] Redirect the old pages.dev host.** Cloudflare dashboard → **Account
   Home → Bulk Redirects** → create a list with one rule:

   | Setting               | Value                          |
   | --------------------- | ------------------------------ |
   | Source URL            | `https://plgcleanup.pages.dev` |
   | Target URL            | `https://plgcleanup.org`       |
   | Status                | 301                            |
   | Subpath matching      | **On**                         |
   | Preserve path suffix  | **On**                         |
   | Preserve query string | **On**                         |
   | Include subdomains    | **OFF** ← see below            |

   Then enable the rule set.

   ⚠ **"Include subdomains" must be OFF**, even though Cloudflare's own how-to
   turns it on. Preview deployments live at `<hash>.plgcleanup.pages.dev`; with
   subdomains included, every preview 301s to production and you lose the only way
   to eyeball a change before it's live. The bare production host is the only one
   Google indexes anyway — previews are `X-Robots-Tag: noindex` by default.

   > This replaces an earlier plan to ship a `_worker.js` redirect. Don't revive
   > it: a `_worker.js` in `public/` puts Pages into **advanced mode**, where
   > `_headers` and `_redirects` files stop applying entirely — which would
   > silently drop the security headers in `public/_headers`.

5. **[you] Enable HSTS** on the `plgcleanup.org` zone (SSL/TLS → Edge
   Certificates → HTTP Strict Transport Security). `.pages.dev` inherited this
   from a preloaded parent domain; a `.org` does not.

6. **[you] Re-register with Google.** Search Console → add a new property for
   `plgcleanup.org` (the old pages.dev property does not carry over) → submit
   `https://plgcleanup.org/sitemap-index.xml`.

7. **Verify.** After the deploy finishes:

   ```sh
   curl -sI https://plgcleanup.org/about       # 200 + the four headers from public/_headers
   curl -s  https://plgcleanup.org/about | grep canonical   # → https://plgcleanup.org/about
   curl -sI 'https://plgcleanup.pages.dev/about?x=1'        # 301 → https://plgcleanup.org/about?x=1
   ```

   And locally, `npm run build && npm run audit` — the audit infers its expected
   host from the built canonical, so it should follow the cutover on its own.

---

## C. Appendix — recreating the Cloudflare Pages project

Only needed if the project is deleted or you're moving accounts.

| Setting           | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Project name      | `plgcleanup` — **the `*.pages.dev` hostname is derived from this** |
| Production branch | `main`                                                             |
| Build command     | `npm run build`                                                    |
| Output directory  | `dist`                                                             |
| Node version      | from `.nvmrc` (currently v24)                                      |
| Build cache       | **On** (Settings → Build → Build cache)                            |

Build cache matters more than it sounds: it persists `node_modules`, including
Astro's processed-image cache, so adding one testimonial re-encodes one photo
instead of all sixteen — seconds instead of ~40.

Then re-do: custom domains (B.1), the deploy hook + `CF_PAGES_DEPLOY_HOOK` secret
(A.1), and the Bulk Redirect (B.4).

**Branch protection** on `main` (GitHub → Settings → Rules): block force pushes
and block deletions, and **nothing else**. Requiring pull requests or reviews is
deliberately not done — Pages CMS and the GitHub web editor commit straight to
`main`, and a review gate would add friction for non-technical editors without
adding real safety. The safety net is the build: a bad edit fails CI, the last
good site stays live, every edit is a revertable commit, and Cloudflare keeps a
one-click deployment rollback.

# plgcleanup.org

Community Cleanup PLG — a static [Astro](https://astro.build) site for a Brooklyn
neighborhood cleanup group.
Live: **https://plgcleanup.pages.dev/** (Cloudflare Pages, auto-deploys on push to `main`).

The site is built to last with very little maintenance: a tiny dependency set, standard
Astro conventions, all content in plain Markdown, and dependencies that update themselves
via Dependabot PRs that CI checks before you merge.

---

## Editing the site (no coding needed)

Everything an organizer normally changes is plain text you can edit on GitHub (click a file,
click the ✏️ pencil, change the words, **Commit changes** — the site rebuilds itself). If an
edit has a mistake, the build fails and nothing broken goes live.

| To change…                                                                                               | Edit this                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The next cleanup's **date, time, place**                                                                 | In [Pages CMS](#pages-cms-form-based-editing), open **Event details** — or edit `src/data/event.json` directly. Bad dates/times fail the build with a message naming the field.                                             |
| **Statistics** (pounds collected, volunteer count)                                                       | In [Pages CMS](#pages-cms-form-based-editing), open **Statistics** — or edit `src/data/stats.json` directly. Plain numbers, no commas.                                                                                      |
| Any **prose page** — About, FAQ, Schedule, Terms, Partners, Service hours, Lost & found, NYC trash clubs | The matching file in `src/content/pages/` (e.g. `faq.md`). Write normal Markdown. **The filename is the web address** — `faq.md` is at `/faq` — so renaming a file moves the page.                                          |
| **Testimonials** in the home-page carousel                                                               | One file per person in `src/content/testimonials/` (e.g. `jaan.md`): the top block holds their name, quote, and photo; the text below is the full testimonial. The photo's alt text is written automatically from the name. |
| A testimonial **photo**                                                                                  | Add the image to `src/assets/testimonials/` and point the person's `image:` at it.                                                                                                                                          |
| **Site settings** (e.g. randomize the carousel order each build)                                         | `src/config.ts` — flip a `true`/`false` toggle; each is documented in the file.                                                                                                                                             |

Prefer a form-based editor? See Pages CMS below — it edits these same files behind a friendly UI.

### If your edit doesn't appear after 2 minutes

Almost always this means the site **failed to rebuild**, so the previous version
is still live. That's the safety net working: a broken edit never replaces a
working site. Here's how to unstick it.

1. **Look for a GitHub issue.** A failed build opens one automatically, titled
   _"Site build failed — the latest edit did not go live"_. It links straight to
   the error. (Not getting notified? **Watch → Custom → ✓ Issues** on this repo.)
2. **Or check the Actions tab.** Go to the repo → **Actions** → click the run with
   a red ✗ → click the red step → read the **last few red lines**. The message
   names the file and the field. For example:

   ```
   The start time is "14:00". Write it like "10:00am", "9:30am", or "2pm".
   ```

3. **Fix it** by re-editing that file — in Pages CMS or the GitHub web editor.
4. **Or undo it.** On the repo's commit list, open your commit and use **Revert**.
   The site returns to the last good version.
5. **Still stuck?** Paste the red error text to the Claude agent and ask it to fix
   the file. That's what it's for.

Two emergency levers in the Cloudflare dashboard (Workers & Pages → `plgcleanup`):

- **Rollback** — on any past deployment, puts that exact version back live now.
- **Retry deployment → clear build cache** — for failures that mention modules,
  packages, or installation rather than your content.

---

## Pages CMS (form-based editing)

[Pages CMS](https://pagescms.org) gives non-technical editors a form UI for the **testimonials**,
the **prose pages**, the **event details**, and the **statistics** — all backed by the same plain
files git already tracks (`src/content/**`, `src/data/event.json`, `src/data/stats.json`). It's
configured in `.pages.yml`.

**Activate it (one-time):**

1. Sign in at [app.pagescms.org](https://app.pagescms.org) with GitHub.
2. Install the Pages CMS **GitHub App**, and scope the install to **only this repository** — the
   app requests broad permissions, so don't grant it your whole account.
3. Open the repo in Pages CMS; it reads `.pages.yml` and shows the editing forms.

Edits commit straight to `main` and Cloudflare Pages redeploys (see [Deployment & CI](#deployment--ci)).
Give it **40–60 seconds** after saving for the change to build and go live on the site — a refresh
before then still shows the old version. A bad edit fails the build, so the last good site stays live.

**Not locked in.** `.pages.yml` is a thin adapter over the content — the files stay plain
Markdown + JSON validated by Astro at build time. Swapping to another Astro-friendly CMS
(e.g. [Decap](https://decapcms.org), [Sveltia](https://github.com/sveltia/sveltia-cms)) means
writing that CMS's config against the same files; no content migration.

---

## Stack

| Layer     | Choice                                                                                       |
| --------- | -------------------------------------------------------------------------------------------- |
| Framework | Astro 6, `output: "static"`                                                                  |
| Runtime   | Node 24 LTS (`.nvmrc`)                                                                       |
| Content   | Astro Content Collections (Markdown) + `src/data/event.ts` for event logic                   |
| Carousel  | [Embla](https://www.embla-carousel.com/) (`embla-carousel`)                                  |
| Images    | Astro `<Image>` → Sharp (build-time WebP) + a custom blur-up placeholder (`src/lib/lqip.ts`) |
| Fonts     | Fraunces (display) + Inter (body) — self-hosted variable woff2 in `public/fonts/`            |
| Styling   | Hand-written CSS with design tokens — no framework                                           |
| Deploy    | Cloudflare Pages (push → build → deploy)                                                     |
| Tooling   | `astro check` (types), Prettier, Dependabot, GitHub Actions CI                               |

Only **two** dependencies ship to the browser: `astro` and `embla-carousel`.
`sharp` is a third `dependencies` entry but is build-time only — it encodes the
images and the social share picture, and never reaches a visitor.

### Dependency pins

Two deliberate holds. Both are checked by CI, neither is Dependabot's to change:

- **`overrides.esbuild: "^0.28.1"`** — Astro and Vite both declare `^0.27.x`, but
  that range sits inside a **live high-severity advisory**
  ([GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr),
  arbitrary file read via the dev server). The override forces a fixed version.
  Dependabot cannot update `overrides`, so this needs a human.
  **Remove it when** Astro's own declared esbuild range reaches `^0.28` — verify
  with `npm ls esbuild` after deleting the block, then run the full verify loop.
- **`sharp: "^0.34.5"`** — pinned to the range Astro itself declares (`^0.34.0`).
  sharp 0.35 fixes inherited libvips CVEs, but taking it here **would not
  actually fix them**: because 0.35 falls outside Astro's range, npm installs
  0.35 at the root _and_ keeps a nested 0.34 under `astro` — so the image
  pipeline that processes every photo stays on the old copy, and you carry two
  builds of a heavy native module. Verified against the resolved lockfile.
  **Remove the hold when** Astro's declared range reaches `^0.35`.

  Note that sharp is held in `dependabot.yml` against **minor** bumps too, not
  just majors: it's a `0.x` package, so `0.34 → 0.35` is a minor by semver rules
  despite being a breaking release.

---

## Commands

```sh
npm install       # first time
npm run dev       # local dev server (also reachable from your phone on the same Wi-Fi)
npm run build     # production build → dist/
npm run preview   # serve the built dist/ locally
npm run check     # type-check (astro check)
npm run format    # auto-format with Prettier
npm run audit     # the launch gate — see below (the pre-push hook runs this too)
npm run gen:logo  # regenerate favicon/touch-icon/logo.webp from public/images/logo.svg
```

`npm run audit` runs `scripts/seo-audit.mjs` over the built `dist/`. It is this
project's test suite (there is deliberately no test framework) and it fails the
build on: broken internal links and missing assets, canonical/sitemap drift, a
missing 404, duplicate titles or descriptions, placeholder text (`todo`, `xyz`,
`example.com`), junk image alt text, and an Event schema that has gone stale or
gone missing. It infers the expected hostname from the built page itself, so it
follows `astro.config.mjs` automatically.

---

## Repository layout

```
src/
  config.ts                ← site settings (toggles, e.g. randomize the carousel)
  content.config.ts        ← schemas for the Markdown collections below
  content/
    pages/*.md             ← every prose page (About, FAQ, Schedule, Terms,
                             Partners, Service hours, Lost & found, NYC trash
                             clubs) — the filename is the URL
    testimonials/*.md       ← one per person, shown in the home carousel
  data/
    event.json             ← the editable event facts (date/time/place) — Pages CMS writes this
    event.ts               ← reads event.json; derives the map link, times, ISO stamps
    stats.json             ← editable running totals (pounds collected, volunteers) — Pages CMS writes this
    stats.ts               ← reads stats.json; validates + formats the numbers for display
    countdown.ts           ← pure "in 3 days / tomorrow / right now" logic + copy (build + browser)
  integrations/
    delete-unused-images/  ← vendored build plugin that prunes unreferenced images
  lib/
    countdown.client.ts    ← recomputes the countdown in the browser so it never goes stale
    lqip.ts                ← build-time blur-up image placeholders
    og.ts                  ← picks the testimonial featured in the social share image
  styles/
    tokens.css             ← design tokens (colors, spacing, fonts) — the one place to reskin
    base.css               ← reset, base typography, links, shared buttons
    chrome.css             ← ticker, nav, footer, mobile menu
  layouts/
    Base.astro             ← thin shell: <head>, style imports, header/slot/footer
  components/
    SiteHeader.astro       ← ticker + top nav (+ their client script)
    MobileMenu.astro       ← hamburger button + slide-over menu (+ its script)
    SiteFooter.astro       ← footer
    Prose.astro            ← wrapper that styles rendered Markdown pages
    Carousel.astro         ← testimonial carousel (markup + scoped CSS)
    carousel.client.ts     ← the carousel's client behavior
  pages/
    index.astro            ← home (hero, why-volunteer, carousel)
    join.astro             ← /join (when/where + map)
    [slug].astro           ← renders each Markdown file in content/pages/

public/
  favicon.svg, fonts/*.woff2, images/*   ← static assets served as-is
  _headers                               ← baseline security headers (Cloudflare Pages)
  robots.txt                             ← points crawlers at the sitemap
```

Also at the repo root: **`LAUNCH.md`** (the go-live + domain-cutover runbook) and
**`CLAUDE.md`** (the operating manual the Claude Code agent loads automatically).

Page-specific CSS lives in a scoped `<style>` in its own page (`index.astro`, `join.astro`)
or component; only genuinely shared styles are global (`src/styles/`).

---

## How a few things work

- **Content Collections** (`src/content.config.ts`) validate every page and testimonial at
  build time — a missing photo or malformed field fails the build instead of shipping broken.
- **`event.ts`** is the single source of truth for the event. The editable facts live in
  `event.json` (edited via Pages CMS); `event.ts` validates them, parses the friendly date/time,
  handles New York daylight saving, and builds the "Get directions" map link. Running totals
  (pounds, volunteers) live in `stats.ts` / `stats.json`.
- **Live countdown** — `countdown.ts` turns the event time into the "in N days / tomorrow / this
  Saturday" copy (home hero, its CTA button, and `/join`). It's pure and dependency-free, so the
  same code runs at build time _and_ in the browser: `src/lib/countdown.client.ts` recomputes it on
  load (and every minute) from the event timestamps, so the wording is always right for the
  visitor's clock — the static HTML never goes stale between deploys, and no scheduled rebuild is
  needed.
- **Carousel** — Embla owns the scroll physics; a small state machine keeps exactly one slide
  highlighted ("last interaction wins"). Testimonial bodies are Markdown, rendered server-side.
- **Site chrome** — `SiteHeader` and `MobileMenu` render as siblings so the general-sibling CSS
  that coordinates the scroll-aware nav keeps working; their scripts are plain (no framework).
- **Design tokens** — restyle the whole site from `src/styles/tokens.css` (colors, fonts, the
  `--font-body`/`--font-display` pair, and the content-column width).
- **Social share image** — the link preview on iMessage/WhatsApp/etc. features the first
  testimonial (by carousel order), generated as a 1200×1200 JPEG (Sharp, face-aware crop). Flip
  `RANDOMIZE_OG_IMAGE` in `src/config.ts` to feature a random volunteer per build. See `src/lib/og.ts`.

---

## Search Engine Optimization

Lighthouse scores 98–99/100 in production. Test:
[PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https://plgcleanup.org) ·
[web.dev/measure](https://web.dev/measure/?url=https://plgcleanup.org) · or Chrome DevTools →
Lighthouse. The 98↔99 wobble is lab-run variance, not a fixable defect.

Two Lighthouse diagnostics are **deliberately won't-fix** — verified, and left as-is:

- **Forced reflow** — every flagged layout read is intentional. `fillTicker` (`SiteHeader.astro`)
  reads geometry once up front, clones off-DOM in a fragment, and writes in a single append. The
  `void el.offsetHeight` reads are the canonical "flush styles to restart a CSS transition" idiom —
  removing them breaks the animations. No cleaner fix exists.
- **Network dependency tree** — the critical chain is already flat (HTML → CSS → 2 fonts, both
  `preload`ed in `Base.astro`). Lighthouse shows this panel informationally; it isn't a scored penalty.

**Fonts are deliberately not subset.** Both are variable fonts (`public/fonts/`), already
Latin-only, and the site uses every axis: weights 200–700, live `opsz` (`font-optical-sizing:
auto`), and Fraunces `SOFT`/`WONK` at multiple values. The only safe lever (clamping the weight
range) saves ~9 KB / 4% total — imperceptible on preloaded, brotli-served, edge-cached files — while
adding a build step and a silent design-range footgun. Not worth it; revisit only if a font grows.

---

## Deployment & CI

- **Cloudflare Pages**: build command `npm run build`, output dir `dist/`. Every push to `main`
  deploys. **Build cache is enabled** (project → Settings → Build → Build cache), which persists
  `node_modules` between deploys. This skips reinstalling Sharp and — because Astro caches every
  processed image in `node_modules/.astro` — only _changed_ photos are re-encoded. Adding one
  testimonial re-processes one image instead of all of them, so steady-state builds stay a few
  seconds rather than ~40. The source photos are 2000×3000, matching the largest variant we
  generate, so they're already right-sized — don't downscale them or the retina output softens.
- **Branch protection** (`main`): **block force pushes** and **block deletions** — the two things
  git can't easily recover from — are on. We deliberately do **not** require pull requests or
  reviews: Pages CMS and the GitHub web editor commit straight to `main`, and a review gate would
  add friction for non-technical editors without adding real safety. The safety net is layered
  instead: the content schema fails the build on a bad edit (so the last good site stays live),
  every edit is a revertable commit, and Cloudflare Pages keeps a one-click deployment rollback in
  its dashboard for the rare "that looks wrong, undo it now" moment.
- **CI** (`.github/workflows/ci.yml`): on each push/PR, runs the Prettier check,
  `astro check`, `astro build`, and the SEO/launch gate (`npm run audit`) — a broken
  change can't go live. On a failed push it opens a GitHub issue, so an editor who
  never looks at the Actions tab still finds out (see "If your edit doesn't appear"
  above).
- **Scheduled site checks** (`.github/workflows/site-checks.yml`): three jobs that
  run on a clock, not on your commits. A **Monday audit** re-runs the launch gate
  with the event-freshness check armed — if nobody has rolled the cleanup date
  forward, it fails and files an issue, which is the tripwire against the site
  quietly going stale. A **weekly external-link check** (lychee) catches rotted
  outbound links. A **daily redeploy** rebuilds the site so the baked-in copy
  ("Join us this Sunday", the countdown line, the Event schema) keeps up with the
  calendar. **These crons are commented out until launch** — see `LAUNCH.md`.
- **Going live / moving to plgcleanup.org**: everything for that is sequenced in
  **[LAUNCH.md](LAUNCH.md)**, including the pre-launch switches that are still off.
- **Git hooks** (`.githooks/`, zero-dependency, activated by `npm install` via the `prepare`
  script): **pre-commit** auto-formats staged files with Prettier so commits are always clean;
  **pre-push** runs the full CI locally (format + types + build + the SEO audit) so `main`
  never goes red. Bypass
  either with `--no-verify`. Note: hooks only run on local `git` commits — edits via the GitHub web
  editor or Pages CMS skip them, so CI remains the real gate for content edits.
- **Dependencies** (`.github/dependabot.yml`): weekly grouped update PRs. Merge them once CI is
  green. **Major-version updates are held back on purpose** for `astro`,
  `embla-carousel`, `sharp`, and `typescript`: CI builds the site but never
  _clicks_ it, so a major that silently breaks the menu, the carousel, or the
  countdown would arrive as an ordinary green PR. Taking one on means asking the
  Claude agent to read the migration guide and then clicking through those three
  things in `npm run preview`. Minor and patch updates still flow automatically.

---

## TODO

The running list of things known to need a human. Keep it here rather than in
scattered comments, and delete a line when it's done.

**Before launch**

- [ ] **Write real quotes for six testimonials.** `chelsie.md`, `delaney.md`,
      `isaiah.md`, `spencer.md` are `name: "xyz"` with `"..."` everywhere;
      `kevin.md` has a real name but `"..."` for both quote and body; `abby.md`
      has a real quote but its body is one sentence repeated 20 times, and its
      name reads `"Abby …"`. All six are live on the home-page carousel today.
      Either write them or delete the files (at least one testimonial must
      remain) — then do the next item. (Molly's was filled in on 2026-08-04.)
- [ ] **Arm the launch gate.** Remove `SEO_SKIP_PLACEHOLDER` and `SEO_SKIP_FRESH`
      per `LAUNCH.md` step A.4. Until then the audit only warns about the above.
- [ ] **Review the Volunteering Terms.** `src/content/pages/terms.md` was drafted
      by the Claude agent, not by a lawyer — read it and make it say what you
      actually mean, especially the photo-consent and under-18 paragraphs.
- [ ] **Confirm the cleanup date.** `src/data/event.json` is set to `2026-08-09`,
      a Sunday. The countdown now handles both weekend days correctly either way.
- [ ] Everything in **[LAUNCH.md](LAUNCH.md)** sections A and B.

**Content, whenever**

- [ ] `faq.md` — only two questions so far.
- [ ] `partners.md` — three of the partners are bare names with no description.
- [ ] `new-york-trash-clubs.md` — lists only this club; the page promises a guide
      to crews across the city.
- [ ] `about.md` — the "Team" section names nobody.

**Housekeeping**

- [ ] **`sharp` and the libvips CVEs.** `npm audit` reports high-severity
      advisories fixed in sharp 0.35, but upgrading can't resolve them until
      Astro widens its own `^0.34.0` range — see "Dependency pins" for why.
      Low practical exposure: sharp is build-time only and processes only the
      photos organizers commit. Revisit when Astro moves.
- [ ] **Astro majors.** `npm audit` also flags advisories fixed only in Astro 7.
      Held per the majors policy above; upgrade deliberately.
- [ ] **Photo consent.** The site publishes volunteers' faces, first names, and
      quotes. `terms.md` now documents a takedown path (email us); worth
      confirming there's a record of consent for the people already published.
- [ ] **The ticker's play/pause control** was invisible (1.44:1) and now uses
      `--text-muted` (7.4:1). Check it looks right to you — it's more prominent
      than before by necessity.

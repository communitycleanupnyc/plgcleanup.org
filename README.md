# plgcleanup.org

Community Cleanup PLG — a static [Astro](https://astro.build) site for a Brooklyn
neighborhood cleanup group.
Live: **https://plgcleanup.pages.dev/** (Cloudflare Pages, auto-deploys on push to `main`).

The site is built to last with very little maintenance: a tiny dependency set, standard
Astro conventions, all content in plain Markdown, and dependencies that update themselves
via Dependabot PRs that CI checks before you merge.

---

## Contents

**Changing the site**

- [Editing the site (no coding needed)](#editing-the-site-no-coding-needed)
  - [If your edit doesn't appear after 2 minutes](#if-your-edit-doesnt-appear-after-2-minutes)
- [Access](#access) — how to ask for permission to edit
- [Pages CMS (form-based editing)](#pages-cms-form-based-editing)

**Taking care of the site**

- [Maintainer setup (first time)](#maintainer-setup-first-time)
  - [Turn on failure notifications](#turn-on-failure-notifications) — **start here**
  - [Installing and running Claude Code](#installing-and-running-claude-code)
- [Twice a year, do this](#twice-a-year-do-this)
- [TODO](#todo) — what still needs a human

**How it's built**

- [Stack](#stack)
  - [Dependency pins](#dependency-pins)
- [Commands](#commands)
- [Repository layout](#repository-layout)
- [How a few things work](#how-a-few-things-work)
- [Reusing this as a template](#reusing-this-as-a-template) — making it a different site
- [Accessibility](#accessibility)
  - [Checking accessibility by hand](#checking-accessibility-by-hand)
- [Search Engine Optimization](#search-engine-optimization)
- [Deployment & CI](#deployment--ci)

Also at the repo root: **[LAUNCH.md](LAUNCH.md)** (going live and the domain
cutover) and **[CLAUDE.md](CLAUDE.md)** (the operating manual the Claude agent
reads automatically).

---

## Editing the site (no coding needed)

Everything an organizer normally changes is plain text you can edit on GitHub (click a file,
click the ✏️ pencil, change the words, **Commit changes** — the site rebuilds itself). If an
edit has a mistake, the build fails and nothing broken goes live.

| To change…                                                                                               | Edit this                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The next cleanup's **date, time, place**                                                                 | In [Pages CMS](#pages-cms-form-based-editing), open **Event details** — or edit `src/data/event.json` directly. Bad dates/times fail the build with a message naming the field.                             |
| **Statistics** (pounds collected, volunteer count)                                                       | In [Pages CMS](#pages-cms-form-based-editing), open **Statistics** — or edit `src/data/stats.json` directly. Plain numbers, no commas.                                                                      |
| Any **prose page** — About, FAQ, Schedule, Terms, Partners, Service hours, Lost & found, NYC trash clubs | The matching file in `src/content/pages/` (e.g. `faq.md`). Write normal Markdown. **The filename is the web address** — `faq.md` is at `/faq` — so renaming a file moves the page.                          |
| **Gallery items** in the home-page carousel                                                              | One file per item in `src/content/gallery/` (e.g. `jaan.md`): the top block holds the title, pull quote, photo, and the photo's description; the text below is the full text shown when the card is opened. |
| A gallery **photo**                                                                                      | Add the image to `src/assets/gallery/` and point that item's `image:` at it. Write the `alt:` line too — it describes the picture for people who can't see it.                                              |
| The site **name, navigation, or social links**                                                           | `src/site.config.ts` — one file holding everything that makes this site _this_ site. Every menu and the footer read from it.                                                                                |
| **Site settings** (e.g. randomize the carousel order each build)                                         | `SITE.features` in `src/site.config.ts` — flip a `true`/`false` toggle; each is documented in the file.                                                                                                     |

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

## Access

If you need administrator access to edit something on this website, email
**[communitycleanupplg@gmail.com](mailto:communitycleanupplg@gmail.com)** with
your **full name** and the **reason** you need it.

---

## Pages CMS (form-based editing)

[Pages CMS](https://pagescms.org) gives non-technical editors a form UI for the **gallery**,
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
npm run a11y      # colour-contrast gate — reads src/styles/tokens.css, no build needed
npm run format    # auto-format with Prettier
npm run audit     # the launch gate — see below (the pre-push hook runs this too)
npm run gen:logo  # regenerate favicon/touch-icon/logo.webp from public/images/logo.svg
```

`npm run audit` runs `scripts/seo-audit.mjs` over the built `dist/`. Together
with `npm run a11y` it is this project's test suite (there is deliberately no
test framework). It fails the build on: broken internal links and missing
assets, canonical/sitemap drift, a missing 404, duplicate titles or
descriptions, placeholder text (`todo`, `xyz`, `example.com`), junk image alt
text, an Event schema that has gone stale or gone missing, and the structural
accessibility problems listed under [Accessibility](#accessibility). It infers
the expected hostname from the built page itself, so it follows
`astro.config.mjs` automatically.

`npm run a11y` runs `scripts/contrast-check.mjs`, which parses the `:root` block
of `src/styles/tokens.css` and recomputes the WCAG contrast ratio of every
colour pairing the site renders. Add a pairing to `PAIRS` in that script whenever
you introduce one.

---

## Repository layout

```
src/
  site.config.ts           ← WHO THIS SITE IS: name, description, nav, social
                             links, structured data, feature switches. Start here.
  content.config.ts        ← schemas for the Markdown collections below
  content/
    pages/*.md             ← every prose page (About, FAQ, Schedule, Terms,
                             Partners, Service hours, Lost & found, NYC trash
                             clubs) — the filename is the URL
    gallery/*.md           ← one per item, shown in the home carousel
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
    og.ts                  ← picks the gallery photo featured in the social share image
  styles/
    tokens.css             ← design tokens (colors, type, spacing, motion) — reskin here
    fonts.css              ← the @font-face blocks, with the font-swap recipe on top
    base.css               ← reset, base typography, links, focus ring, shared buttons
    chrome.css             ← ticker, nav, footer, mobile menu
  layouts/
    Base.astro             ← thin shell: <head>, style imports, header/slot/footer
  components/
    SiteHeader.astro       ← ticker + top nav (+ their client script)
    MobileMenu.astro       ← hamburger button + slide-over menu (+ its script)
    SiteFooter.astro       ← footer
    Ticker.astro           ← the stats ticker band (markup + script); delete-able as one file
    NavLink.astro          ← one nav/footer link, incl. safe external-link handling
    Logo.astro             ← the logo mark — the only file that draws it
    Section.astro          ← the content column + its spacing options
    SectionHeading.astro   ← section label with the square bullet
    Button.astro           ← the CTA buttons
    Hero.astro             ← headline + supporting paragraphs
    FeatureGrid.astro      ← N-column grid of short text blocks
    Prose.astro            ← wrapper that styles rendered Markdown pages
    Carousel.astro         ← the gallery carousel (markup + scoped CSS)
    carousel.types.ts      ← its props, item shape, and default labels
    carousel.client.ts     ← the carousel's client behavior
  pages/
    index.astro            ← home (hero, why-volunteer, carousel)
    join.astro             ← /join (when/where + map)
    [slug].astro           ← renders each Markdown file in content/pages/

public/
  favicon.svg, fonts/*.woff2, images/*   ← static assets served as-is
  _headers                               ← baseline security headers (Cloudflare Pages)
  robots.txt                             ← points crawlers at the sitemap

scripts/
  seo-audit.mjs            ← the launch gate: SEO, links, assets, accessibility structure
  contrast-check.mjs       ← recomputes the WCAG contrast of every colour pairing
```

Also at the repo root: **`LAUNCH.md`** (the go-live + domain-cutover runbook) and
**`CLAUDE.md`** (the operating manual the Claude Code agent loads automatically).

Page-specific CSS lives in a scoped `<style>` in its own page (`index.astro`, `join.astro`)
or component; only genuinely shared styles are global (`src/styles/`).

---

## How a few things work

- **Content Collections** (`src/content.config.ts`) validate every page and gallery item at
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
  highlighted ("last interaction wins"). Item bodies are Markdown, rendered server-side. It takes
  every string it speaks as a prop, so it carries no copy of its own and can be reused as-is.
- **Site chrome** — `SiteHeader` and `MobileMenu` render as siblings so the general-sibling CSS
  that coordinates the scroll-aware nav keeps working; their scripts are plain (no framework).
- **Design tokens** — restyle the whole site from `src/styles/tokens.css` (colors, the type and
  spacing scales, motion, the focus ring, and the content-column width). `npm run a11y` rechecks
  the contrast of every colour pairing straight from that file.
- **Social share image** — the link preview on iMessage/WhatsApp/etc. features the first
  gallery photo (by carousel order), generated as a 1200×1200 JPEG (Sharp, face-aware crop). Flip
  `features.randomizeOgImage` in `src/site.config.ts` to feature a random photo per build. See `src/lib/og.ts`.

---

## Reusing this as a template

The presentation layer is deliberately separable from this particular
organization. To make it a different site:

1. **`src/site.config.ts`** — name, description, theme colour, navigation,
   social links, structured-data type, feature switches. The header, mobile
   menu, footer, and `<head>` all read from here; nothing else holds a brand
   name or a link.
2. **`src/styles/tokens.css`** — colours, type scale, spacing, motion, focus
   ring, column width. Run `npm run a11y` afterwards; it recomputes the WCAG
   contrast of every pairing and fails on a regression.
3. **`src/styles/fonts.css`** — the swap recipe is in the comment at the top:
   drop `.woff2` files in `public/fonts/`, rewrite the two `@font-face` blocks,
   then point `--font-body` / `--font-display` and `SITE.fonts` at them.
4. **`src/components/Logo.astro`** — replace the `<svg>`. It's the only file
   that draws the mark. Favicons are `public/favicon.svg`, `favicon.png`, and
   `apple-touch-icon.png` (`npm run gen:logo` regenerates the raster ones).
5. **`src/content/`** — `pages/*.md` for prose pages, `gallery/*.md` plus photos
   in `src/assets/gallery/` for the carousel.
6. **`.pages.yml`** — if the editors use Pages CMS, mirror any field changes
   here. The nesting is fussy; a wrong shape parses fine and does nothing.

Two values are **not** in `site.config.ts`, because they're read outside the
Astro build and must be changed by hand:

- `site:` in **`astro.config.mjs`** — the canonical origin.
- the `Sitemap:` line in **`public/robots.txt`** — same origin, written literally.

Build pages by composing the kit in `src/components/` (`Section`,
`SectionHeading`, `Hero`, `FeatureGrid`, `Button`, `Carousel`) rather than
writing fresh markup and a fresh `<style>` block — see "The component kit" in
`CLAUDE.md` for the list and the two Astro gotchas that bite when extending it.

---

## Accessibility

The site targets **WCAG 2.2 AA**. What's automated, and what isn't:

**Checked on every build** (`npm run a11y`, then `npm run audit`):

- Contrast of every colour pairing the site renders, recomputed from
  `tokens.css` — including the focus ring, which must clear 3:1.
- `<html lang>`, one `<h1>` per page, no skipped heading levels.
- Images without `alt`, and alt text that is junk (`"..."`, `"photo"`).
- `aria-labelledby` / `aria-controls` / `aria-describedby` pointing at ids that
  don't exist, and duplicate ids.
- Links and buttons with no accessible name.
- Positive `tabindex`, `<iframe>` without a `title`, and a viewport that
  disables zoom.

**Built in, but not machine-checkable here:** a skip link, labelled landmarks,
`aria-roledescription` on the carousel with per-slide position labels, arrow /
Home / End keys on the carousel, off-screen slides taken out of the tab order and
the screen-reader tree, `inert` on the page behind an open mobile menu, focus
returned to the control that opened a panel, and `prefers-reduced-motion`
honoured for the carousel panel, the header, and the hamburger.

Two decisions in the carousel look like bugs and are not. Both have a comment at
the code:

- **Off-screen slides use `aria-hidden` + `tabindex="-1"`, not `inert`.** `inert`
  is the tidy one-attribute version, but it also makes the subtree
  non-hit-testable, so a slide that is inert when the pointer enters it never
  fires `pointerenter` and never runs its crossfade.
- **`prefers-reduced-motion` does NOT suppress the photo crossfade.** It
  suppresses the panel's slide-up and the caret's rotate — things that _move_.
  The crossfade only animates `filter` and `opacity`; nothing travels, and a
  cross-fade is the standard replacement reduced-motion guidance recommends
  _instead of_ movement. Suppressing it made the hover highlight snap on
  instantly for everyone with the OS setting enabled. The
  `@media (prefers-reduced-motion: reduce)` block must also stay **last** in
  `Carousel.astro` — it has the same specificity as the rules it overrides, so
  source order is the only thing that makes it win.

(The stats ticker is exempt from reduced-motion on purpose too: it starts paused
and has its own play/pause button, which beats suppressing it.)

### Checking accessibility by hand

Nothing in CI runs a browser, so after touching the carousel, the mobile menu,
or anything focus-related, run `npm run preview` and walk through this:

1. Tab from the very top. The skip link appears first, and **every** control
   shows a visible focus ring — including the logo, the hamburger, and the
   carousel's toggle and close buttons.
2. In the carousel: ← and → move it, Home and End jump to the ends, and Tab does
   **not** reach slides that are scrolled out of view.
3. Open a card's panel, press **Escape** — focus lands back on the toggle that
   opened it, not at the top of the page.
4. Open a card's panel, then click a carousel arrow — focus is not lost.
5. Open the mobile menu (narrow window): Tab cycles inside it and never reaches
   the page behind; Escape closes it and returns focus to the button.
6. With VoiceOver (Safari): the carousel announces as a carousel, slides
   announce "N of M", and each photo reads its own alt text.

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
  gallery item re-processes one image instead of all of them, so steady-state builds stay a few
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

## Maintainer setup (first time)

Two things to do once, when you take this site on. The first takes fifteen
seconds and matters more than anything else in this file.

### Turn on failure notifications

**Do this before anything else.** When an edit breaks the site, or when the
weekly check notices the cleanup date has gone stale, this repository
automatically opens a **GitHub issue** describing what's wrong and how to fix it.
Those issues go to whoever is _watching_ the repository — and if nobody is, they
are written to an empty room. The site can then sit broken, or quietly advertise
an event that already happened, for as long as nobody happens to look.

To subscribe:

1. Open the repository on GitHub:
   <https://github.com/communitycleanupnyc/plgcleanup.org>
2. Click the **Watch** button near the top right (it may say "Unwatch" if you're
   already subscribed).
3. Choose **Custom**.
4. Tick **Issues**, then click **Apply**.

Choose **Custom → Issues** rather than "All Activity": you'll be told when
something is broken, without being emailed about every routine change.

**More than one person should do this.** A single watcher is one holiday — or one
changed email address, or one person moving out of the neighborhood — away from
being no watchers at all. Ask a second organizer to follow the same four steps.
If they need access in order to, see [Access](#access).

To check who is currently subscribed, open the repository's **Watch** button and
look at the list, or visit
<https://github.com/communitycleanupnyc/plgcleanup.org/watchers>.

### Installing and running Claude Code

Claude Code is an AI assistant that works on this website's files with you. You
describe what you want in plain English; it does the work and shows you before
changing anything. You need it for the dependency and Node steps in
[Twice a year, do this](#twice-a-year-do-this); you don't need it for ordinary
content edits, which are just text files on GitHub.

The walkthrough below assumes no prior experience. Budget an hour the first time
and about ten minutes on every visit after that.

The official quickstart lives at
**<https://code.claude.com/docs/en/quickstart>** — if anything below has drifted,
that page is correct and this one isn't.

**Before you start, you need:**

- **A paid Claude plan** — Pro, Max, Team, or Enterprise. The free Claude.ai plan
  does **not** include Claude Code.
- **macOS 13 or newer, or Windows 10 or newer**, with at least 4 GB of RAM.
- **A GitHub account** that has access to this repository (see [Access](#access)).

**Step 1 — Install the tools this website needs.** Two free downloads, both
"next, next, finish" installers:

- **Node.js** from <https://nodejs.org> — choose the version matching `.nvmrc` in
  this repo (currently **v24**). This is what builds the site.
- **Git** from <https://git-scm.com/downloads> — this is what downloads the code
  and sends your changes back. On Windows, accept the default options; one of
  them ("Git Bash") is used by Claude Code.

**Step 2 — Install Claude Code.** Two ways; pick one.

_The easier way — the desktop app (no terminal at all):_ download it from
<https://claude.com/download>, install it, and sign in with your Claude account.
This is the better choice if typing commands makes you nervous.

_The terminal way:_ open **Terminal** (macOS: press ⌘+Space, type "Terminal") or
**PowerShell** (Windows: press the Start key, type "PowerShell"), then paste one
line and press Enter.

On **macOS**:

```sh
curl -fsSL https://claude.ai/install.sh | bash
```

On **Windows**, in PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Check that it worked by typing `claude --version`. You should see a number
followed by `(Claude Code)`. If instead you see "command not found", close the
terminal window, open a fresh one, and try again.

**Step 3 — Download this website's code.** In the same terminal, one line at a
time:

```sh
cd ~/Documents
git clone https://github.com/communitycleanupnyc/plgcleanup.org.git
cd plgcleanup.org
npm install
```

That puts the site in a `plgcleanup.org` folder inside your Documents. You only
do this once — next time, just `cd ~/Documents/plgcleanup.org`.

**Step 4 — Start Claude Code.** From inside that folder, type:

```sh
claude
```

The first time, it opens your browser to sign in. After that it remembers you.
(If you installed the desktop app instead, open it and point it at the
`plgcleanup.org` folder.)

**Step 5 — Ask for what you need.** Type in plain English and press Enter. For
the twice-a-year checklist above, these work well, one at a time:

```text
read CLAUDE.md and the README, then do the twice-a-year maintenance
```

```text
upgrade astro to the next major version, read the migration guide first
```

```text
is the node version in .nvmrc still supported?
```

**What to expect, so nothing is alarming:**

- It **asks before changing any file** and shows you exactly what it wants to
  change. Read it; say no if it looks wrong.
- **Nothing reaches the live website** until changes are committed and pushed to
  GitHub — ask it to do that explicitly when you're happy, and it will.
- If a change is broken, **the site refuses to rebuild and the current version
  stays live**. See "If your edit doesn't appear after 2 minutes" above.
- After a dependency upgrade, ask it to run `npm run preview`, then open the
  address it prints in your browser and click the **mobile menu**, the
  **carousel**, and check the **countdown text**. Nothing automatic tests those,
  so this is the one part a person has to do.
- Type `/help` for commands, and `/exit` (or Ctrl+D twice) to quit.

**If you get stuck**, paste the error you're seeing straight into Claude Code and
ask what it means — that is genuinely the fastest route. For installation
problems specifically, see <https://code.claude.com/docs/en/troubleshoot-install>.

---

## Twice a year, do this

This site needs no routine attention — but a handful of things rot on a calendar
rather than on your commits, and each one is quiet until it isn't. Put a repeating
reminder somewhere real (June and December work) and spend twenty minutes:

1. **Take one held major update.** `astro`, `embla-carousel`, `sharp` and
   `typescript` never upgrade themselves (see Deployment & CI). Ask the Claude
   agent to read the migration guide and do one of them, then run
   `npm run preview` and click through the **mobile menu**, the **carousel**
   (open a card, use the arrows, swipe) and the **countdown copy** — CI
   builds the site but never clicks it, so those three are what a bad major
   breaks silently. One at a time, not all four at once.
2. **Check the Node version.** `.nvmrc` pins the Node release Cloudflare builds
   with. If that version is near end-of-life, bump it and confirm a deploy
   succeeds. Skipping this for years is how a site becomes unbuildable.
3. **Check that the alarms still reach someone.** More than one person should
   still be watching Issues — see
   [Turn on failure notifications](#turn-on-failure-notifications), and check the
   list at
   [/watchers](https://github.com/communitycleanupnyc/plgcleanup.org/watchers).
   GitHub also disables scheduled workflows in public repos after 60 days of no
   activity: repo → **Actions** → "site checks" → **Enable workflow** if it's off.
4. **Confirm the accounts are still in reach.** The domain registration (is
   auto-renew on, and on a card that hasn't expired?), the Cloudflare account,
   and the Google Search Console property. At least two people should be able to
   get into each. A lapsed domain ends the site in a way no code can prevent.
5. **Skim the TODO list below** and delete anything already done.

Steps 1 and 2 are the only ones that need Claude Code. If you've never used
it, [Installing and running Claude Code](#installing-and-running-claude-code)
above starts from nothing.

---

## TODO

The running list of things known to need a human. Keep it here rather than in
scattered comments, and delete a line when it's done.

**Before launch**

- [ ] **Write real quotes for six gallery items.** `chelsie.md`, `delaney.md`,
      `isaiah.md`, `spencer.md` are `title: "xyz"` with `"..."` everywhere;
      `kevin.md` has a real title but `"..."` for both caption and body;
      `abby.md` has a real caption but its body is one sentence repeated 20
      times, and its title reads `"Abby …"`. All six are live on the carousel.
      Either write them or delete the files (at least one gallery item must
      remain) — then do the next item. (Molly's was filled in on 2026-08-04.)
- [ ] **Arm the launch gate.** Remove `SEO_SKIP_PLACEHOLDER` and `SEO_SKIP_FRESH`
      per `LAUNCH.md` step A.4. Until then the audit only warns about the above.
- [ ] **Review the Volunteering Terms.** `src/content/pages/terms.md` was drafted
      by the Claude agent, not by a lawyer — read it and make it say what you
      actually mean, especially the photo-consent and under-18 paragraphs.
- [ ] **Confirm the cleanup date.** `src/data/event.json` is set to `2026-08-09`,
      a Sunday. The countdown now handles both weekend days correctly either way.
- [ ] Everything in **[LAUNCH.md](LAUNCH.md)** sections A and B.

- [ ] **Write real `alt` text for the gallery photos.** Every item now has a
      required `alt:` field, seeded as "Portrait of {name}" during the rename.
      That is accurate but thin — replace each with a description of what is
      actually in the frame. See the guidance in `.pages.yml` / `content.config.ts`.

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

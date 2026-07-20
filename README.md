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

| To change…                                                       | Edit this                                                                                                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The next cleanup's **date, time, place, counts**                 | In [Pages CMS](#pages-cms-form-based-editing), open **Event details** — or edit `src/data/event.json` directly. Bad dates/times fail the build with a message naming the field. |
| **FAQ / About / Terms / Agreements / Schedule** page text        | The matching file in `src/content/pages/` (e.g. `faq.md`). Write normal Markdown.                                                                                               |
| **Testimonials** in the home-page carousel                       | One file per person in `src/content/testimonials/` (e.g. `jaan.md`): the top block holds their name, quote, and photo; the text below is the full testimonial.                  |
| A testimonial **photo**                                          | Add the image to `src/assets/testimonials/` and point the person's `image:` at it.                                                                                              |
| **Site settings** (e.g. randomize the carousel order each build) | `src/config.ts` — flip a `true`/`false` toggle; each is documented in the file.                                                                                                 |

Prefer a form-based editor? See Pages CMS below — it edits these same files behind a friendly UI.

---

## Pages CMS (form-based editing)

[Pages CMS](https://pagescms.org) gives non-technical editors a form UI for the **testimonials**,
the **prose pages**, and the **event details** — all backed by the same plain files git already
tracks (`src/content/**` and `src/data/event.json`). It's configured in `.pages.yml`.

**Activate it (one-time):**

1. Sign in at [app.pagescms.org](https://app.pagescms.org) with GitHub.
2. Install the Pages CMS **GitHub App**, and scope the install to **only this repository** — the
   app requests broad permissions, so don't grant it your whole account.
3. Open the repo in Pages CMS; it reads `.pages.yml` and shows the editing forms.

Edits commit straight to `main` and Cloudflare Pages redeploys (see [Deployment & CI](#deployment--ci)).
A bad edit fails the build, so the last good site stays live.

**Not locked in.** `.pages.yml` is a thin adapter over the content — the files stay plain
Markdown + JSON validated by Astro at build time. Swapping to another Astro-friendly CMS
(e.g. [Decap](https://decapcms.org), [Sveltia](https://github.com/sveltia/sveltia-cms)) means
writing that CMS's config against the same files; no content migration.

---

## Stack

| Layer     | Choice                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Framework | Astro 6, `output: "static"`                                                                                                |
| Runtime   | Node 24 LTS (`.nvmrc`)                                                                                                     |
| Content   | Astro Content Collections (Markdown) + `src/data/event.ts` for event logic                                                 |
| Carousel  | [Embla](https://www.embla-carousel.com/) (`embla-carousel`) + [Floating UI](https://floating-ui.com/) (`@floating-ui/dom`) |
| Images    | Astro `<Image>` → Sharp (build-time WebP) + a custom blur-up placeholder (`src/lib/lqip.ts`)                               |
| Fonts     | Fraunces (display) + Inter (body) — self-hosted variable woff2 in `public/fonts/`                                          |
| Styling   | Hand-written CSS with design tokens — no framework                                                                         |
| Deploy    | Cloudflare Pages (push → build → deploy)                                                                                   |
| Tooling   | `astro check` (types), Prettier, Dependabot, GitHub Actions CI                                                             |

Only three runtime dependencies ship: `astro`, `embla-carousel`, `@floating-ui/dom`.

---

## Commands

```sh
npm install       # first time
npm run dev       # local dev server (also reachable from your phone on the same Wi-Fi)
npm run build     # production build → dist/
npm run preview   # serve the built dist/ locally
npm run check     # type-check (astro check)
npm run format    # auto-format with Prettier
```

---

## Repository layout

```
src/
  config.ts                ← site settings (toggles, e.g. randomize the carousel)
  content.config.ts        ← schemas for the Markdown collections below
  content/
    pages/*.md             ← FAQ, About, Terms, Agreements, Schedule (prose pages)
    testimonials/*.md       ← one per person, shown in the home carousel
  data/
    event.json             ← the editable event facts (date/time/place/counts) — Pages CMS writes this
    event.ts               ← reads event.json; derives map & calendar links, times, ISO stamps
    countdown.ts           ← "in 3 days / tomorrow / right now" state machine
  lib/
    lqip.ts                ← build-time blur-up image placeholders
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
```

Page-specific CSS lives in a scoped `<style>` in its own page (`index.astro`, `join.astro`)
or component; only genuinely shared styles are global (`src/styles/`).

---

## How a few things work

- **Content Collections** (`src/content.config.ts`) validate every page and testimonial at
  build time — a missing photo or malformed field fails the build instead of shipping broken.
- **`event.ts`** is the single source of truth for the event. The editable facts live in
  `event.json` (edited via Pages CMS); `event.ts` validates them, parses the friendly date/time,
  handles New York daylight saving, and builds the "Get directions" and "Add to calendar" links.
  `countdown.ts` turns the event time into the live "in N days" copy.
- **Carousel** — Embla owns the scroll physics; a small state machine keeps exactly one slide
  highlighted ("last interaction wins"). Testimonial bodies are Markdown, rendered server-side.
- **Site chrome** — `SiteHeader` and `MobileMenu` render as siblings so the general-sibling CSS
  that coordinates the scroll-aware nav keeps working; their scripts are plain (no framework).
- **Design tokens** — restyle the whole site from `src/styles/tokens.css` (colors, fonts, the
  `--font-body`/`--font-display` pair, and the content-column width).
- **Social share image** — the link preview on iMessage/WhatsApp/etc. features a random
  volunteer photo, chosen per build and generated as a 1200×1200 JPEG (Sharp, face-aware crop).
  See `src/lib/og.ts`.

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
- **CI** (`.github/workflows/ci.yml`): on each push/PR, runs Prettier check, `astro check`, and
  `astro build` — a broken change can't merge.
- **Git hooks** (`.githooks/`, zero-dependency, activated by `npm install` via the `prepare`
  script): **pre-commit** auto-formats staged files with Prettier so commits are always clean;
  **pre-push** runs the full CI locally (format + types + build) so `main` never goes red. Bypass
  either with `--no-verify`. Note: hooks only run on local `git` commits — edits via the GitHub web
  editor or Pages CMS skip them, so CI remains the real gate for content edits.
- **Dependencies** (`.github/dependabot.yml`): weekly grouped update PRs. Merge them once CI is
  green. (TypeScript is held on the 5.x line until `astro check` supports TS 7.)

> Note: the build is a snapshot, so the countdown reflects the last build. To advance it without
> a content commit, add a scheduled GitHub Action that pings a Cloudflare deploy hook.

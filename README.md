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

| To change…                                                | Edit this                                                                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The next cleanup's **date, time, place, counts**          | `src/data/event.ts` — the top "EDIT THESE" block. That file explains exactly how, in plain English.                                                            |
| **FAQ / About / Terms / Agreements / Schedule** page text | The matching file in `src/content/pages/` (e.g. `faq.md`). Write normal Markdown.                                                                              |
| **Testimonials** in the home-page carousel                | One file per person in `src/content/testimonials/` (e.g. `jaan.md`): the top block holds their name, quote, and photo; the text below is the full testimonial. |
| A testimonial **photo**                                   | Add the image to `src/assets/testimonials/` and point the person's `image:` at it.                                                                             |

Prefer a form-based editor? The repo is wired for [Pages CMS](https://pagescms.org) (see
`.pages.yml`) — it edits the same Markdown files behind a friendly UI.

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
  content.config.ts        ← schemas for the Markdown collections below
  content/
    pages/*.md             ← FAQ, About, Terms, Agreements, Schedule (prose pages)
    testimonials/*.md       ← one per person, shown in the home carousel
  data/
    event.ts               ← THE event: date/time/place + derived map & calendar links
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
- **`event.ts`** is the single source of truth for the event. It parses the friendly date/time
  you type, handles New York daylight saving, and builds the "Get directions" and
  "Add to calendar" links. `countdown.ts` turns the event time into the live "in N days" copy.
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
  deploys.
- **CI** (`.github/workflows/ci.yml`): on each push/PR, runs Prettier check, `astro check`, and
  `astro build` — a broken change can't merge.
- **Dependencies** (`.github/dependabot.yml`): weekly grouped update PRs. Merge them once CI is
  green. (TypeScript is held on the 5.x line until `astro check` supports TS 7.)

> Note: the build is a snapshot, so the countdown reflects the last build. To advance it without
> a content commit, add a scheduled GitHub Action that pings a Cloudflare deploy hook.

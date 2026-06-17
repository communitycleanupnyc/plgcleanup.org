# Community Cleanup PLG — Build Plan & Handoff (v3)

A staged plan for a Claude Code agent. Build the irreducible core first, get
feedback, then layer on. Every eventual feature has a named home, so nothing in
the vision is lost — but almost none of it belongs in the first ship.

---

## Operating principle

Progressive disclosure, applied to the project itself. Start at the smallest
thing that can stand alone and earn feedback (v0). Each later step adds one
coherent slice and ships on its own. The design philosophy *is* the build
philosophy: a minimal core, layered with precision — never a half-built maximal
thing.

**Two rules for the agent:** (1) Build only the phase you're told to. Agents
over-build; the value here is restraint. (2) After v0, stop and wait for
feedback before proceeding.

---

## Locked stack

- **Astro**, static output — ships zero JS by default; the page survives even if
  build tooling rots.
- **Cloudflare Pages + GitHub**, CI on push — rebuilds the static site.
- **Pages CMS** (git-native) — edits content files *directly in the GitHub repo*
  through a UI; no separate database, nothing to deploy. Config is a single
  `.pages.yml` at the repo root; editors sign in at `app.pagescms.org` with
  GitHub and their saves commit straight to the repo, triggering the build.
- **All content lives in the repo.** Editorial (copy, events, testimonials,
  merch) via Pages CMS as Markdown/YAML; the historic numeric log via a
  build-time Sheets→git merge. One source of truth: git. This makes the whole
  site forkable as-is.
- **MapLibre GL JS + Protomaps (PMTiles)** for the map page; `pnorman/maplibre-styles`.
- **Type:** Fraunces + Inter, both self-hosted, both OFL (see Design system).
- Open source at `github.com/communitycleanupnyc`. Eventual hub
  `communitycleanup.nyc` (directory / "start your own") is **deferred and separate**.

---

## Design system (intent to hand the agent)

The brief is "haute luxury for trash": refined, minimal structure carrying a
playful brand. The resolution — **let the typography be the elevated element and
let the raccoon + color be the fun.** Minimal directions live or die on precision.

### Type — locked

- **Fraunces** (variable, OFL) for **display**: the eyebrow and big confident
  headlines. This is the editorial-luxury signal; use a high optical size and a
  touch of its WONK/SOFT character so it reads elegant-but-warm, not stiff.
- **Inter** (variable, OFL) for **body, UI, buttons, and all numerals.**
- **No third face.** The CTA button uses **Inter SemiBold**, not Fraunces —
  buttons want crispness and legibility, and letting Fraunces own the headline
  alone is the more disciplined, more "luxury" move. Revisit only if a real need
  appears; the default answer is no.
- **Self-host both** (woff2, `font-display: swap`, `<link rel=preload>` the two
  files). **Critical:** load **Inter from its original files** (rsms.me or via
  Fontsource), *not* the Google Fonts CDN — the CDN build does not reliably
  expose the slashed-zero feature.

**Numerals — the precision the brief asked for.** Inter ships the OpenType `zero`
(slashed zero) and tabular figures; turn them on with `font-variant-numeric`:

```css
/* /fonts holds the self-hosted OFL woff2; Inter from its ORIGINAL files */
@font-face { font-family:"Fraunces"; src:url("/fonts/Fraunces.woff2") format("woff2-variations");
  font-weight:100 900; font-display:swap; }
@font-face { font-family:"Inter"; src:url("/fonts/Inter.woff2") format("woff2-variations");
  font-weight:100 900; font-display:swap; }

:root { --display:"Fraunces", Georgia, serif; --body:"Inter", system-ui, sans-serif; }

body            { font-family: var(--body); font-variant-numeric: slashed-zero; }      /* fancy 0 in prose; proportional figures blend with text */
h1, .headline   { font-family: var(--display); }                                       /* editorial luxury */
.stat, .weight, .counter, .trashometer {
  font-variant-numeric: tabular-nums slashed-zero;                                      /* aligned columns + slashed 0 for data */
}
```

Use `slashed-zero` (proportional) in prose, where digits only appear in dates and
the ZIP; use `tabular-nums slashed-zero` everywhere numbers are *data* (the
counter, lbs-per-cleanup, the dashboard) so columns align and the zero stays
precise. For a group whose identity is *weighing trash*, an engineered numeral is
thematically on the nose.

### Palette

- Warm near-white paper (`#FBFBF9`, *not* `#F4F1EA` cream) + warm near-black ink
  (`~#1A1A17`). This matches the single-tone logo and the raccoon's black linework.
- **One accent only: the hi-vis safety-vest green** from the existing brand
  (the Trash-a-Thon poster). Used in exactly one place — e.g. a highlight under
  the next-cleanup date. Spend color once.
- The **raccoon's warm browns are illustration, not UI colors.** Don't pull them
  into buttons or links; the mark and the green carry the interface.

### Assets (provided)

- **Logo** (`CCPLG_Logo_Single-tone-white`): the tree-in-a-cupped-hand emblem
  with circular "Community Cleanup · PLG" text. Two production notes:
  1. It's the **single-tone *white*** file — invisible on warm-white paper. You
     need a **near-black version** for the light background (trivial: it's
     single-tone, just recolor). Keep the white one for any dark sections.
  2. It's an **emblem/seal** — detailed and a touch traditional against the
     minimal direction. Use it **small and monochrome** (a corner/footer stamp),
     and let Fraunces + the raccoon carry the contemporary feel so the site reads
     modern, not "civic seal." **Vectorize to SVG later** — it's flat line art,
     so it vectorizes cleanly and will stay crisp at any size.
- **Raccoon**: the mascot / single personality element. It's a *textured,
  shaded* illustration, so **keep it as an optimized raster (WebP), do not
  vectorize.** One placement in v0 (static); it becomes the one ambient motion
  beat in Phase 1.

### Other principles

- **One idea per viewport.** The eye never chooses between more than two things.
- **Tap targets ≥ 56px**, high contrast, fat padding — built for a thumb in the
  Instagram in-app browser, not a mouse.
- **Plain-text dates** until the CMS lands. **Zero JS** by default.
- **Motion is one ambient beat** (the raccoon, reduced-motion gated) and it does
  **not** arrive until Phase 1. Test the still composition first.
- **Specificity as strategy:** real corners, real dates, real pounds — never
  generic mission-speak.

---

## The staircase

### v0 — the feedback prototype (minimal static Astro, no CMS, no JS)

A minimal **static Astro** project: one page (`src/pages/index.astro`) plus
`public/fonts/`. One screen, deliberately barer than the eventual homepage — the
point is to test the *core decision and the vibe*.

Why Astro and not a loose HTML file (a reversal worth stating): a single file is
the fastest path to *one solo look*, but the goals here are Cloudflare Pages +
fast iteration shared with the team. Starting in Astro costs ~15 min of one-time
setup and buys exactly that: `git push` → auto-build-and-deploy, and a unique
**preview URL for every branch/PR** to hand the team. It also matches the rest of
the stack — Pages CMS commits to this same repo and triggers the same build, so
there's zero re-plumbing later. And it costs nothing at runtime: Astro ships
**zero JS by default**, so the deployed artifact is the same featherweight static
HTML you'd have written by hand.

- **Logo** (near-black version), small, at top.
- Eyebrow: `SUMMER 2026` (Fraunces or Inter, small/tracked).
- Headline (Fraunces, big, confident): e.g. *"We clean Prospect Lefferts Gardens."*
- Mission one-liner: *"No registration, all supplies included. Just show up."*
  with the human line under it: *"Meet your neighbors. Have fun."*
- **One primary CTA (Inter SemiBold):** **Join the next cleanup →**, with
  `date · time · corner` directly beneath it — the single most important line,
  with the hi-vis highlight under the date and slashed-zero numerals.
- **One raccoon**, placed once (static), near the CTA.
- **Footer = socials + the essentials:** Instagram · Discord · email · **Amazon
  wishlist**, plus the brand line (`Community Cleanup PLG · plgcleanup.org ·
  @communitycleanupplg`).

Self-host Fraunces + Inter from the start (so the slashed zero is present to
evaluate). Deploy via the loop below, share the preview URL, get feedback.
*Do not add anything else.*

> Why the wishlist sits in the footer from v0: it's the one ask that costs
> nothing and directly funds supplies. Too important to bury in a later page.

#### v0 deploy & iteration loop (Cloudflare Pages) — set up once

Keep it **static** — no Cloudflare adapter. The `@astrojs/cloudflare` adapter is
for SSR (Pages Functions); a brochure site doesn't need it, and skipping it keeps
the "survives even if tooling rots" property. Recipe:

1. `npm create astro@latest` → **Empty** template, **Static** output (default),
   TypeScript optional. Put the v0 markup in `src/pages/index.astro`; fonts in
   `public/fonts/`.
2. `npm run dev` for the fast local loop (HMR).
3. `git init` and push to `github.com/communitycleanupnyc`.
4. Cloudflare dashboard → **Workers & Pages → Create → Pages → Import an existing
   Git repository** → pick the repo. Set **build command `npm run build`**,
   **output directory `dist`**, **production branch `main`**. Save and Deploy →
   live at `<project>.pages.dev`.
5. From then on: branch → push → Cloudflare auto-builds a **preview URL** to share
   with the team → open a PR → merge to `main` → production deploys automatically.

Fast-build hygiene: turn on **Build caching** (caches `node_modules` between
builds), pin a Node version (`.nvmrc` or a `NODE_VERSION` build variable) so local
and Cloudflare builds match, and keep it framework-free (no React/Vue). A one-page
Astro site builds in ~1s and deploys in well under a minute. Add the custom domain
(`plgcleanup.org`) later under **Pages → Custom domains**.

### v0.5 — still one page, still hardcoded

- **Upcoming events list** (cleans + **Trashy Hour**, the biweekly/monthly happy
  hour) — each line emphasizes *everyone is welcome, even first-timers*.
- Mailing-list signup **input** on the page.
- Link to **Community Agreements** (can be a stub).

### Phase 1 — Make it real & editable

- Scaffold the Astro repo properly; paste v0's markup into `src/pages/index.astro`.
- **Wire Pages CMS:** add `.pages.yml` at the repo root defining the content
  collections (events, mission, etc.); install the Pages CMS GitHub app scoped to
  this repo; editors then manage content at `app.pagescms.org`, committing to the
  repo and triggering the build. (No `/studio` route to build — it's the hosted app.)
- Add the **one ambient motion beat**: gently animate the raccoon (or a slow
  drop), `prefers-reduced-motion` gated.

### Phase 2 — Event detail pattern + the map

- **Event page** with **progressive disclosure**: *When* / *Where you'll meet* /
  *What you'll do* are collapsed, revealed when you click the title-with-arrow.
- **`/map`**: Protomaps PMTiles basemap + MapLibre, `pnorman/maplibre-styles`,
  **custom markers for every past corner** with **lbs collected**; marker popup
  links to that week's IG post / group photo. One JS island; the rest stays static.

### Phase 3 — The historic-data system (the hard part) + counter + dashboard

- The **Google Sheets → git** pipeline (full design below).
- **Scrollable previous-events list**: fades at the edges, scrolls all the way
  back to **2023**, lbs per event, **hover reveals the group shot**, small link
  to that week's IG post.
- **Trash counter** at the very top of the homepage (scroll animation) → clicking
  it goes to **`/trash-dash`**: metrics, an **"Include Trashathon" toggle**, and a
  beautiful **ECharts** plot. All figures derived from the git data at build time.

### Phase 4 — Story & community

- **About**: the story + **founder** history.
- **Why volunteer**: pulls in testimonials, plus links to the *"hottest clubs in
  NYC, no cover"* media coverage (Gothamist et al.).
- **Testimonials** (random rotation): the Trash Ninja and a few others, with
  **high-res, beautifully presented photos**.
- **Community Agreements / values** page.
- **FAQ** — including: *"I want to host a similar cleanup in my community" →*
  *Reach out! Our website and toolkit are open source and available here.* Also:
  *"Are you a nonprofit?"* (no; fiscal-sponsor ask + in-kind via wishlist).
- **Our Friends**: other neighborhood cleanup groups + local spots (Trashy Hour
  hosts).

### Phase 5 — Support & merch

- **Support Us**: Amazon wishlist (again, prominent), joining the board, and
  **leading a clean** with instructions for clean leads.
- **Merch**: existing **stickers / postcards / t-shirts** now. Later: the
  **$1,000 customized stainless-steel grabber** and the **embroidered safety
  vest** framed as *"supports our work for a year."*

### Phase 6 — The hub (deferred, separate project)

- `communitycleanup.nyc` umbrella/directory + "start your own cleanup group."
  Same repo philosophy; not part of the PLG site.

---

## Technical architecture (the parts you flagged as tricky)

### A. Historic trash-weight data — Sheets → git, safely

Goal: per-cleanup lbs (+ photos, IG links) that pull in automatically, update on
rebuild, can't be lost, and need almost no manual editing — while non-technical
volunteers can still add new entries.

The core move is to **separate "append" from "history."**

1. **Source of truth is a committed file in the repo** (`data/cleanups.json` or
   `.csv`). Because it's in git, you get versioned history and an automatic
   backup — a deletion can never destroy the record; the last commit survives and
   every prior version is recoverable.
2. **Volunteers only ever *append*, never edit history.** Use a **Google Form**
   that writes new rows to a Sheet, and lock the Sheet's historic rows with
   **protected ranges** (only owners can edit them). That's the standard,
   no-custom-code way to restrict edit access to historic data.
3. **Build-time pipeline** (a GitHub Action, or the Cloudflare Pages build step):
   on each rebuild, read the Sheet (published CSV or a read-only Sheets API key),
   **validate** new rows (date, lbs numeric, corner present), **merge** them into
   `data/cleanups.json`, and **commit the updated JSON back to the repo.** The
   site builds from the committed JSON, not from a live Sheet call — so a flaky
   Sheet never breaks a deploy, and the git copy is always the backup.
4. **Derived outputs are generated, never hand-edited:** running total (the
   counter), the ECharts series, and the map markers are all computed from
   `cleanups.json` at build. Volunteers add one Form entry; everything else regenerates.
5. **Backup, belt-and-suspenders:** the git JSON is backup #1; optionally a
   scheduled Action snapshots the raw Sheet to a dated file as backup #2.

Two variants — pick per how much you trust auto-merge:
- **Pragmatic (recommended to start):** validate + auto-merge + auto-commit.
- **Maximally safe:** the Action opens a **PR** with the new rows; a maintainer
  clicks merge. Historic data then changes only through reviewed commits.

> Division of labor: the **historic numeric log** stays in the Sheet→git pipeline
> (bulk tabular, protected rows, weekly Form append); **editorial + upcoming
> events + testimonials + merch** are Pages CMS collections. Both land in git, so
> there's one source of truth and the toolkit forks complete.

### B. CMS — Pages CMS (git-native)

Pages CMS is an open-source CMS for static sites in a GitHub repo. It **edits the
repo's files directly; there is no separate content database.** You add a
`.pages.yml` at the repo root defining content types and media; editors sign in
at `app.pagescms.org` with GitHub and their saves commit to the repo (which
triggers the Cloudflare build). Content is Markdown/YAML/JSON, and it works
cleanly with Astro's content collections.

Why this is the right call for *this* project: because content **and** config
live in the repo, the durability and forkability concerns evaporate — a fork gets
the code *and* the content, and another club can point Pages CMS at their fork and
start editing immediately. No vendor dataset to export or lose.

The one tradeoff to know: **editors need a (free) GitHub account**, and the repo
owner installs the Pages CMS GitHub app scoped to this repo. Editors never see Git
— the CMS UI handles commits — but the GitHub-login step is a small bit of
onboarding the Google Doc manual should cover.

A starting `.pages.yml` sketch (verify field types against the docs):

```yaml
# .pages.yml — repo root, the single source of truth for Pages CMS config
media:
  input: public/uploads
  output: /uploads
content:
  - name: events
    label: Upcoming events
    type: collection
    path: src/content/events
    fields:
      - { name: title,       type: string }
      - { name: kind,        type: select, options: { values: [Cleanup, Trashy Hour] } }
      - { name: date,        type: date }
      - { name: corner,      type: string }
      - { name: whereToMeet, label: "Where you'll meet", type: text }
      - { name: whatWeDo,    label: "What you'll do",    type: rich-text }
  - name: home
    label: Homepage
    type: file
    path: src/content/home.md
    fields:
      - { name: mission, type: text }
      - { name: human,   label: "Human line", type: string }
```

### C. The map (`/map`)

Self-host a **PMTiles extract** of the NYC/PLG area (Protomaps) on Cloudflare R2
or alongside Pages — no per-load map API bills, fully durable. Render with
**MapLibre GL JS** using `pnorman/maplibre-styles`. **Custom HTML markers** per
corner, each labeled with lbs; popup links to the IG post / group photo. It's the
only page that needs client JS — keep it an island so the rest stays zero-JS.

### D. Counter + dashboard (`/trash-dash`)

The homepage counter is a scroll-triggered animation that links to `/trash-dash`.
The dashboard reads the same `cleanups.json`: headline metrics, ECharts plot, and
an **"Include Trashathon"** toggle that filters the dataset. Nothing here is a
separate data source — it's all views over the one git file.

---

## Sitemap (final state)

```
/                  home — hero CTA, counter, upcoming events, mailing input, footer
/map               Protomaps + markers (lbs per corner)
/trash-dash        metrics + ECharts + Trashathon toggle
/events/[slug]     event detail (When / Where / What, click-to-expand)
/about             story + founder history
/why-volunteer     testimonials + media coverage
/friends           other groups + neighborhood spots
/support           wishlist · board · lead-a-clean instructions
/merch             stickers/postcards/tees → grabber/vest later
/faq               incl. "host your own → fork the toolkit"
/community-agreements
```

Content editing happens in the **Pages CMS app** (`app.pagescms.org`,
GitHub-authed, scoped to the repo) — there's no `/studio` route to build.
Navigation grows with the site: v0 has none. As routes land, add one minimal nav
(hamburger or a single top row). The homepage stays CTA-first throughout.

---

## Open source / toolkit

- Repo at `github.com/communitycleanupnyc` with a clear README, a permissive
  LICENSE, **OFL fonts committed in `/fonts`** (Fraunces + Inter both qualify —
  do not commit closed-license fonts), `.pages.yml`, and `data/cleanups.json` as
  the documented data contract.
- Because the site, its content, and its CMS config all live in the repo, a fork
  is genuinely turnkey: another club forks, points Pages CMS at their fork, swaps
  the logo/raccoon and `data/`, and is live. The FAQ's "host your own" answer
  links here.
- Keep PLG-specific content (copy, photos, data) cleanly separable from the
  template so a fork starts empty. The `communitycleanup.nyc` hub is a later,
  separate build — don't entangle it.

---

## What to hand the agent for v0 (copy/paste guardrails)

> Scaffold a **minimal static Astro** project (`npm create astro@latest`, Empty
> template, Static output, **no Cloudflare adapter**) and build **only** the v0
> page at `src/pages/index.astro`, with fonts in `public/fonts/`. One screen.
> Contents: the near-black **logo** (small, top); a `SUMMER 2026` eyebrow; a big
> **Fraunces** headline; the mission + human line; **one primary CTA** in **Inter
> SemiBold** ("Join the next cleanup →") with `date · time · corner` beneath it;
> **one static raccoon** placed once near the CTA; and a footer of socials +
> essentials (Instagram · Discord · email · Amazon wishlist · brand line).
> Type: self-host **Fraunces** (display) and **Inter** (body/UI/numerals) as woff2
> with `font-display:swap` and a `preload` — load **Inter from its original files,
> not the Google CDN**, and enable `font-variant-numeric: slashed-zero` on the body
> and `tabular-nums slashed-zero` on the date/number line. Palette: warm near-white
> + warm near-black with **one** hi-vis green accent (a highlight under the date).
> Tap targets ≥ 56px, `:focus-visible` states, responsive, plain-text date.
> **Zero JavaScript. No animation. No events list, no mailing input, no CMS, no
> map, no nav.** Connect the repo to Cloudflare Pages (build `npm run build`,
> output `dist`, branch `main`). Then stop for feedback.

# plgcleanup.org

Community Cleanup PLG — static Astro 6 site for a Brooklyn neighborhood cleanup organization.  
Live: **https://plgcleanup.pages.dev/** (Cloudflare Pages, auto-deploys on push to `main`).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro 6, `output: "static"` |
| Runtime | Node 24 LTS |
| Deploy | Cloudflare Pages (GitHub integration, push → build → deploy) |
| Fonts | Fraunces (display, variable), Hanken Grotesk (body/UI, variable) — self-hosted OFL woff2 in `public/fonts/` |
| JS | Minimal: one `<script>` in Base.astro (ticker play/pause + scroll-aware nav). Everything else is zero-JS. |

Build: `npm run build` → `dist/` (5 pages). Dev: `npm run dev`.

---

## Repository layout

```
src/
  data/
    event.ts          ← single source of truth for event constants + ET date helper
  layouts/
    Base.astro        ← shared HTML shell: head, ticker, fixed nav, <slot/>, footer, JS
  pages/
    index.astro       ← home page (hero, cleanup grid, join CTA, why section, subscribe)
    join.astro        ← /join — "We weren't kidding :)" confirmation page
    about.astro       ← /about stub
    faq.astro         ← /faq stub
    terms.astro       ← /terms stub (Volunteering Terms)
    community-agreements.astro  ← /community-agreements stub

public/
  favicon.svg         ← "P" monogram, dark rounded square
  fonts/
    Fraunces.woff2    ← variable (wght 100–900, SOFT, WONK axes)
    HankenGrotesk.woff2  ← variable (wght 100–900)
    Inter.woff2       ← unused (kept, harmless)
  images/
    logo.webp         ← used as CSS mask source (recolored to --brand via mask+background)
    raccoon.webp      ← full-color raccoon mascot in hero
```

---

## CSS design system

All CSS lives in `Base.astro` as `<style is:global>`. No CSS files, no framework. Pages add no additional styles — everything is in the base.

### Tokens (`src/layouts/Base.astro :root`)

```css
--bg: #14130f          /* warm near-black page background */
--text: #f5f4ee        /* warm near-white body text */
--muted: #9a988f       /* secondary text, labels, icons at rest */
--line: rgba(255,255,255,.14)  /* hairline dividers */
--brand: #63c9ea       /* sky-blue — logo, icon hover, link hover */
--accent: #a1d74a      /* lime green — hero CTA, nav join button */
--select: #eeb408      /* amber — ::selection background; text = --bg (dark) */
--edge: clamp(1.25rem, 5vw, 3rem)  /* universal edge inset */
--ticker-h: 2.25rem    /* sticky ticker bar height */
--nav-h: 3.5rem        /* fixed nav bar height */
```

Dark mode is the default and only mode. No `prefers-color-scheme` light variant yet.

### Typography

- **Display / headings:** Fraunces, `font-variation-settings: "SOFT" 50, "WONK" 1`
- **Body / UI:** Hanken Grotesk
- `font-variant-numeric: slashed-zero` on `body` (global)
- `font-variant-numeric: tabular-nums slashed-zero` scoped to `.ticker__track` only (stats context; removed from general text per user feedback — `tnum` looked odd in body copy)
- `::selection { background: var(--select); color: var(--bg) }` — amber bg, dark text

### Layout model

`body` has no `max-width` (full-bleed for ticker, nav, footer). `main` has `max-width: 900px; margin-inline: auto; padding-top: var(--nav-h)`. Individual sections manage their own insets.

The `.why` section breaks out of `main`'s 900px constraint to be 95vw:
```css
.why { width: 95vw; margin-left: calc(50% - 47.5vw); }
```
`body { overflow-x: clip }` prevents horizontal scroll from this breakout.

---

## Data layer (`src/data/event.ts`)

Single source of truth — imported by `index.astro` and `join.astro`:

```ts
export const CLEANUP_ISO = "2026-06-20T10:00:00-04:00";   // next event datetime
export const CLEANUP_TIME = "10–11am";
export const CLEANUP_CORNER = "Clarkson Ave & Bedford Ave";
export const CLEANUP_MAPS_URL = "https://www.google.com/maps/search/...";
export const CLEANUP_CALENDAR_URL = "https://calendar.google.com/...";  // add-to-calendar template
export const SUBSCRIBER_COUNT = 327;  // static; update by hand until custom form returns
export function etDateParts(d: Date): { y, m, day }  // parses Date to ET components via en-CA Intl
```

**Key date logic in `index.astro` (build-time, zero JS):**
- `Date.UTC` midnight diffs for whole-day countdown, dodging DST
- `whenPhrase` computed as `"10–11am this/next Saturday, June 20"` (time-first; relative word degrades gracefully for events >2 weeks out)
- Season label (`"Summer 2026"`) computed from `etDateParts` month index

---

## Pages

### `/` (`index.astro`)

Sections in order:
1. **Hero** — `padding-left: var(--edge)`, season kicker (`"Summer 2026"`) above `<h1>`, raccoon `position: absolute` behind heading
2. **Next Cleanup grid** — CSS Grid `auto auto 1fr` (icon | label | value). Calendar icon in col1 of When row = add-to-calendar easter egg (Google Calendar template URL). Countdown phrase in col2–3 span.
3. **Join CTA** — `<a href="/join" class="join-btn">`: `clamp(1.1rem,2.2vw,1.5rem)`, `border-radius: 999px`, `background: var(--accent)`, `color: var(--bg)`
4. **Why volunteer** — 95vw 3-col Config-style grid. Top + bottom `--line` rules, vertical `--line` between columns only. Fraunces `clamp(1.4rem,3vw,2rem)` column headings. Body copy is **placeholder** (clearly marked `[placeholder]`). Stacks to 1-col at 760px.
5. **Subscribe** — Substack iframe embed in a white card (`.iframe-wrap` with `border-radius: 8px; overflow: hidden; box-shadow`). Subscriber count (327) is static. Cannot observe submit or restyle form (cross-origin).

### `/join` (`join.astro`)

Confirmation page for "Join us this weekend" button. Same When/Where cleanup grid (2 rows, no countdown or reassurance rows). Fraunces headline "We weren't kidding :)". Back link to `/`.

### Stubs (`/about`, `/faq`, `/terms`, `/community-agreements`)

Minimal `<div class="stub-page">` with `<h1>`, `.stub-desc`, back link. Content TBD.

---

## Chrome (`Base.astro`)

### Ticker

Sticky `top:0 z-index:50`. Stat line: `"2,972.55 pounds this year • 300+ volunteers"` (abbreviated from original spec; update as needed). Paused by default (`animation-play-state: paused`). Play/pause button toggles `.is-playing` class + `aria-pressed`. `prefers-reduced-motion` keeps it permanently static.

Seamless loop: 10 identical `<span>` repetitions, `@keyframes ticker-scroll { to { transform: translateX(-50%) } }` — moves through 5 spans, resets seamlessly.

### Fixed nav

`position: fixed; top: var(--ticker-h); left:0; right:0; z-index:40`. Logo (CSS-masked `logo.webp`, 32px) left; ABOUT · FAQ · JOIN US right. JOIN US = small pill button (`--accent` bg, `--bg` text).

**JS scroll behavior** (rAF-throttled passive listener):
- `scrollY < 80` → remove `nav--hidden`, `nav--solid` (transparent at top)
- `scrollY > lastY` → add `nav--hidden` (`transform: translateY(-130%)`)
- `scrollY < lastY` → remove `nav--hidden`, add `nav--solid` (`rgba(20,19,15,.92) + backdrop-filter: blur(12px)`)

### Footer

Text-only, three columns (`auto auto 1fr`):
- Col 1: JOIN US / FAQ / ABOUT
- Col 2: DISCORD / EMAIL US / SUBSTACK / INSTAGRAM / SUPPORT US (Amazon wishlist)
- Right: Volunteering Terms + `© Community Cleanup PLG 2026`

All uppercase `0.6875rem` links, `--muted` color, hover to `--text`.

---

## Known tradeoffs and open items

| Item | Status |
|---|---|
| Subscriber count (327) | Static; increment by hand or revert to custom form + Cloudflare Pages Function for live +1 on subscribe |
| Substack iframe | White card on dark page — intentional; cannot restyle cross-origin. True dark form requires custom implementation. |
| Why volunteer copy | All three blocks are `[placeholder]` — needs real copy from team |
| Stub pages | `/about`, `/faq`, `/terms`, `/community-agreements` are empty stubs — Phase 4 content |
| Ticker stat | `"2,972.55 pounds this year • 300+ volunteers"` — hardcoded; Phase 3 data pipeline will source this |
| Calendar URL | Hardcoded Google Calendar template for June 20 event; update in `event.ts` for each new event |
| Amazon wishlist | Linked as "Support us" in footer; flagged in spec as important ("funds supplies") |
| Light mode | No `prefers-color-scheme` variant; dark only for now |

---

## Commit history (rounds)

| Commit | Round | Summary |
|---|---|---|
| `e492402` | 5 | Ticker, scroll-aware nav, 3-col Why grid, text footer, 4 stub pages |
| `5023c62` | 4 | Dark mode (full token rename), Why volunteer section, pill button |
| `84f0909` | 3 | `--edge` system, centered blocks, CSS Grid cleanup, Substack iframe, `/join` page, `event.ts` + `Base.astro` extracted |
| `4f26d32` | 2 | Left-aligned layout, dynamic ET dates, color tokens, normalized icons |
| `f84afb5` | font | Inter → Hanken Grotesk (self-hosted woff2) |
| `a580e68` | 1 | Static cleanup info block, subscribe form, SVG icon footer, raccoon, favicon |
| `26287eb` | — | Astro 6 upgrade, Node 24 LTS, esbuild CVE fixes |

---

## Development notes

- **Cloudflare Pages build command:** `npm run build` / output dir: `dist`
- **Testing on iPhone (or any device on the same Wi-Fi):** The dev server is configured with `server: { host: true }` in `astro.config.mjs`, so it binds to `0.0.0.0`. Run `npm run dev`, allow the incoming connection in LuLu when prompted, then open `http://<your-mac-ip>:4321` on the device. Find your Mac's IP with `ipconfig getifaddr en0`. The terminal will also print a `Network:` URL when the server starts.
- **No server-side code** — everything is `output: "static"`, build-time only
- **Date/season logic runs at build time** — the live site is a snapshot; Cloudflare's scheduled rebuild (GitHub Action, daily) keeps the countdown fresh
- **CSS mask for logo:** `background: var(--brand); mask: url(/images/logo.webp) center/contain no-repeat` on a `<div>` — recolors the logo to `--brand` without needing an SVG
- **Icon sizing:** Simple Icons (filled) at 20px; Heroicons outline at 22px — optical equivalence at those sizes
- **`en-CA` locale trick:** `Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" })` reliably produces `YYYY-MM-DD` for safe integer parsing

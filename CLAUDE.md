# CLAUDE.md — operating manual for this repo

## What this is

The website for Community Cleanup PLG, a Brooklyn volunteer street-cleanup group.
Static Astro 6 site (`output: "static"`), deployed by Cloudflare Pages on every
push to `main`. **No server, no database, no API.** Content is plain Markdown and
JSON, edited by non-technical volunteers through Pages CMS or the GitHub web
editor. Two runtime dependencies: `astro`, `embla-carousel` (plus `sharp` for
build-time image work).

The people maintaining this after hand-off are not engineers. Optimize every
change for "still works, untouched, in two years" over cleverness.

## Verify loop

Run all of this before claiming a change works:

```sh
npm run check && npm run a11y && npm run build && SEO_SKIP_PLACEHOLDER=1 npm run audit
```

`scripts/seo-audit.mjs` is the test suite — there is no test framework, by
decision. `scripts/contrast-check.mjs` (`npm run a11y`) is the second half of it:
it recomputes the WCAG contrast ratio of every colour pairing the site renders,
straight from `src/styles/tokens.css`. Drop the one env var once LAUNCH.md step
A.4 is done — it exists only because `src/content/gallery/kevin.md` is still
quoted as "..." and would otherwise fail every build.

**Neither script runs a browser**, so nothing in the automated gate exercises
client JavaScript, focus order, or keyboard behaviour. After changing the
carousel, the mobile menu, or anything focus-related, do the keyboard pass in
the README ("Checking accessibility by hand") in `npm run preview`.

## Don't touch / don't "fix"

Each of these looks like a defect and isn't. Leave them alone unless the user
explicitly asks:

- **Fonts are not subset.** Both are variable fonts using every axis; the only
  safe lever saves ~9 KB. Measured and rejected — see README.
- **Images are WebP only, no AVIF.** AVIF measured 62% larger here.
- **Photo masters live in the repo** (`src/assets/`). No R2, no remote images.
  There is a hard ceiling of 20–30 images, ever.
- **`void el.offsetHeight` in `SiteHeader.astro` and `carousel.client.ts`** is the
  canonical "flush styles to restart a CSS transition" idiom. Removing it breaks
  the animations. Lighthouse's "forced reflow" warning here is a documented
  won't-fix.
- **`overscroll-behavior: contain` on `.card__panel-body`** (Carousel.astro). The
  testimonial panel rubber-bands in Chrome and Firefox but not Safari; that is a
  WebKit difference, not a bug here, and the long comment above the property
  records the measurements. Changing it to `auto` makes the page scroll behind an
  open panel; `none` removes the bounce everywhere.
- **No `script-src` CSP.** The build emits ~22 inline module scripts whose hashes
  change every build; hash maintenance is a footgun in a repo with no full-time
  maintainer. The scripts are all first-party build output and the site takes no
  user input. `public/_headers` carries the four headers that are safe to set.
- **No pull-request requirement on `main`.** Pages CMS commits straight to `main`;
  the build is the gate. Do not add branch-protection review rules or CODEOWNERS.
- **`overrides.esbuild` in package.json** is load-bearing — see "Dependency pins"
  in the README before touching it.
- **The logic in `src/data/schedule.ts` below its header comment.** The DST
  handling is subtle and correct.

## Invariants

Things that will silently break if you don't know them:

- **`src/site.config.ts` is the only place site identity lives.** Name,
  description, theme colour, nav links, social links, structured data, and the
  feature switches. The header, mobile menu, footer, and layout all read from it,
  so adding a page means editing `SITE.nav` and nothing else. Don't reintroduce a
  hard-coded link, brand name, or URL into a component.
- **The `<title>` template lives only in `src/layouts/Base.astro`.** Pages pass
  their short title (`"FAQ"`); the layout appends `" | ${SITE.name}"`. Never
  write the site name into a page's own title.
- **`SiteHeader` and `MobileMenu` must stay direct, adjacent children of
  `<body>`.** `chrome.css` positions the menu button with general-sibling
  selectors (`.site-chrome.is-fixed ~ .nav-menu-btn`), and MobileMenu inerts the
  background by walking `document.body.children`. Wrapping either one in a
  container silently breaks the scroll behaviour and the focus containment.
- **Filenames are URLs.** Every `src/content/pages/*.md` auto-routes via
  `src/pages/[slug].astro` (`faq.md` → `/faq`). `index`, `join`, `schedule`, and
  `404` are reserved — those pages render data, so they have their own files, and
  `[slug].astro` throws a friendly error if a content file claims one.
- **The site picks the next cleanup; a human only ever adds dates.**
  `src/data/schedule.json` holds a `cleanups` list, and `src/data/schedule.ts`
  exports the first one that hasn't finished (`NEXT_CLEANUP`) plus the rest
  (`UPCOMING_CLEANUPS`). The home CTA, `/join`, and the countdown read the first;
  `/schedule` lists the next four. The daily redeploy cron is what advances it, so
  nothing needs editing after a cleanup happens. Don't reintroduce a
  "current event" field that someone has to move.
- **Gallery `alt` text is authored per photo and required** by the schema in
  `src/content.config.ts`. It used to be derived from the name; it isn't any
  more, because alt describes the _picture_, which a title can't stand in for.
  Don't regenerate it from another field, and don't make the field optional.
- **At least one gallery item must exist** — the social share image is built from
  a gallery photo (`src/lib/gallery.ts` → `src/lib/og.ts`).
- **The carousel's lead photo and the social share image are the same photo, and
  `src/lib/gallery.ts` is the only file that decides which.** Both the homepage
  and `og.ts` read `galleryOrder`/`lead` from it, so a link preview always shows
  what is at the top of the page. Don't give either one its own pick — a second
  `Math.random()` in `og.ts` is exactly the drift this replaced.
- **The lead photo rotates by the calendar day, not by build.** `deal()` seeds a
  Fisher–Yates from the cycle number so every build inside a day agrees without
  storing anything; over N days (N = number of photos) each leads exactly once,
  then the deck is reshuffled. Two builds on the same UTC day therefore share a
  lead photo — that is the design, not a stale cache. The daily redeploy cron in
  `.github/workflows/site-checks.yml` is what advances it.
- **Never delete an audit check to make CI pass.** `scripts/seo-audit.mjs` and
  `scripts/contrast-check.mjs` are the launch gate. If one fails, the site is
  wrong, not the script.
- **`Carousel.astro` holds no copy of its own.** Every string it speaks comes
  from `labels` (defaults in `carousel.types.ts`), and every item field comes
  from props. Keep it that way — it is the component most likely to be reused.
- **Off-screen carousel slides are hidden with `aria-hidden` + `tabindex="-1"`,
  not `inert`.** `inert` looks like the tidier one-attribute version and was
  tried; it also blocks hit-testing, so a slide that is inert when the pointer
  enters it fires no `pointerenter` and never runs its hover crossfade. The
  highlight visibly stops following the mouse. Don't swap it back.
- **`.pages.yml` nesting is fussy.** `settings.content` must be an object and
  commit messages must sit under `commit.templates`. A wrong shape parses fine and
  does nothing.

## The component kit

Presentation is componentised so a page is composition, not markup. Reach for
these before writing a new `<style>` block; none of them contain site copy.

| Component              | What it is                                                                       |
| ---------------------- | -------------------------------------------------------------------------------- |
| `Section.astro`        | The content column (`--site-w` + offset). `top` / `bottom` pick a spacing token. |
| `SectionHeading.astro` | Section label with the square bullet. Tune via `--heading-*` custom properties.  |
| `Button.astro`         | `.cta-primary` / `.cta-secondary`; passes extra attributes through.              |
| `Hero.astro`           | Headline + supporting paragraphs, with a `decoration` slot for ornament.         |
| `FeatureGrid.astro`    | N-column grid of slotted text blocks, collapses at 760px.                        |
| `Carousel.astro`       | The gallery. Fully props-driven — see `carousel.types.ts`.                       |
| `NavLink.astro`        | One nav/footer link from a `SiteLink`; owns the `external` rel handling.         |
| `Logo.astro`           | The logo mark. The only file that draws it.                                      |
| `Prose.astro`          | Markdown column for content pages.                                               |

Two things to know when writing a component here:

- **Astro's scoped styles don't cross a component boundary.** A rule the parent
  writes for a class it passes in compiles with the _parent's_ scope id and never
  matches. Expose the knob as a CSS custom property instead — those inherit.
  `SectionHeading` + `.carousel-header` is the worked example.
- **Astro preserves whitespace.** In an inline-level element whose text is
  underlined or background-inverted (nav links, buttons, `.prose-back`), a stray
  newline inside the tag renders as a visible extra underline. Keep the label
  tight against the tags, and comment why.

## Recipes

- **Add a page:** create `src/content/pages/<slug>.md` with `title` and
  `description` frontmatter plus a Markdown body, then add the link to
  `SITE.nav` in `src/site.config.ts`.
- **Add a gallery item:** drop the photo in `src/assets/gallery/`, create
  `src/content/gallery/<name>.md` with `title`, `caption`, `alt`, `image`,
  `order` (unique; the fallback order when `features.rotateGallery` is off) and
  a Markdown body.
- **Remove a gallery item:** delete the `.md`; the unused photo is pruned from
  the build automatically. At least one must remain.
- **Rename the site / change nav / swap social links:** `src/site.config.ts`.
- **Turn a feature off:** `SITE.features` — the ticker, the gallery rotation
  (`rotateGallery`, which drives the carousel order, the lead photo, and the
  social share image together). Flip it, confirm the build is green, then delete
  the feature's code and data if it's never coming back.
- **Change the schedule:** `src/data/schedule.json` — one row per cleanup in the
  `cleanups` list (`date` as `yyyy-mm-dd`, times like `10:00am` or `2pm`,
  `corner`). The rows sit under a key rather than at the top level of the file
  because Pages CMS only gives a list `min` and a collapsed per-row summary when
  the list is a field; see the comment on the `schedule` entry in `.pages.yml`. Rows sort
  themselves by date and past ones are ignored, so adding next month's dates is
  the whole job. Bad values fail the build with a message naming the row. The
  Pages CMS form for it is the `schedule` entry in `.pages.yml`.
- **Update stats:** `src/data/stats.json` — plain numbers, no commas.
- **Change how wide a page of words is:** `--content-w` in `src/styles/tokens.css`
  — 65% of the window on a desktop, the full site width on a phone. Every page
  but the home page opts in with `--site-w: var(--content-w)` on its container,
  and the left offset follows on its own.
- **Change colors/spacing/type:** `src/styles/tokens.css`, then `npm run a11y`.
  `--surface` is for backgrounds, `--text-muted` for dim text and icons; don't
  cross them (a previous version of this file conflated them and shipped a
  1.44:1 contrast failure — the contrast script now catches exactly that).
  Every token in the file is in use: don't add one speculatively, and if you add
  a new colour _pairing_, add it to `PAIRS` in `scripts/contrast-check.mjs`.
- **Swap the fonts:** `src/styles/fonts.css` has the three-step recipe at the top
  (files in `public/fonts/`, `@font-face`, then `--font-*` + `SITE.fonts`).

## When the build fails

The build failing is the safety net working — the previous site stays live.

1. Open the repo's **Actions** tab, click the red run, read the last red lines.
   The error names the file and the field.
2. Fix that file, or revert the commit from the GitHub UI.
3. Cloudflare dashboard → Pages → the deployment → **Rollback** is the emergency
   lever if a bad deploy did go out.

CI opens a GitHub issue on push failures, so an editor who never looks at Actions
still finds out. See "If your edit doesn't appear" in the README.

## Twice-a-year maintenance

If you're asked to "do the maintenance" or the six-monthly check, the checklist
is **"Twice a year, do this" in the README**. Follow it there rather than
improvising. The part that falls to you is taking **one** held major upgrade at a
time — read that project's migration guide first, and after upgrading say plainly
that the mobile menu, carousel, and countdown still need a human to click through
in `npm run preview`, because nothing in CI exercises client JavaScript.

## Pointers

- `LAUNCH.md` — how the site went live on plgcleanup.org (done 2026-08-23), and
  the handful of steps still owed to a human.
- `README.md` — editor-facing docs, the stack, dependency pins, the twice-a-year
  maintenance checklist, and the running TODO list.
- `.github/workflows/site-checks.yml` — what the scheduled checks do and why.

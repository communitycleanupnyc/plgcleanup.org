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
npm run check && npm run build && SEO_SKIP_FRESH=1 SEO_SKIP_PLACEHOLDER=1 npm run audit
```

`scripts/seo-audit.mjs` is the test suite — there is no test framework, by
decision. Drop both env vars once LAUNCH.md step A.4 is done (they exist only
because a past event date and unwritten testimonial copy would otherwise fail
every build pre-launch).

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
- **No `script-src` CSP.** The build emits ~22 inline module scripts whose hashes
  change every build; hash maintenance is a footgun in a repo with no full-time
  maintainer. The scripts are all first-party build output and the site takes no
  user input. `public/_headers` carries the four headers that are safe to set.
- **No pull-request requirement on `main`.** Pages CMS commits straight to `main`;
  the build is the gate. Do not add branch-protection review rules or CODEOWNERS.
- **`overrides.esbuild` in package.json** is load-bearing — see "Dependency pins"
  in the README before touching it.
- **The logic in `src/data/event.ts` below its header comment.** The DST handling
  is subtle and correct.

## Invariants

Things that will silently break if you don't know them:

- **Nav links are hand-maintained in THREE files.** Adding or renaming a page
  means editing `src/components/SiteHeader.astro`, `src/components/MobileMenu.astro`,
  and `src/components/SiteFooter.astro`. Nothing generates them.
- **The `<title>` template lives only in `src/layouts/Base.astro`.** Pages pass
  their short title (`"FAQ"`); the layout appends `" | Community Cleanup PLG"`.
  Never write the site name into a page's own title.
- **Filenames are URLs.** Every `src/content/pages/*.md` auto-routes via
  `src/pages/[slug].astro` (`faq.md` → `/faq`). `index`, `join`, and `404` are
  reserved — `[slug].astro` throws a friendly error if a content file claims one.
- **Testimonial alt text is derived, not authored.** `Carousel.astro` builds it
  from `name`. There is deliberately no `alt` field; don't add one back.
- **At least one testimonial must exist** — the social share image is built from
  the lowest-`order` one (`src/lib/og.ts`).
- **Never delete an audit check to make CI pass.** `scripts/seo-audit.mjs` is the
  launch gate. If it fails, the site is wrong, not the script.
- **`.pages.yml` nesting is fussy.** `settings.content` must be an object and
  commit messages must sit under `commit.templates`. A wrong shape parses fine and
  does nothing.

## Recipes

- **Add a page:** create `src/content/pages/<slug>.md` with `title` and
  `description` frontmatter plus a Markdown body, then add the link to
  `SiteFooter.astro` (and the header/mobile nav if it belongs there).
- **Add a testimonial:** drop the photo in `src/assets/testimonials/`, create
  `src/content/testimonials/<name>.md` with `name`, `quote`, `image`, `order`
  (unique; lowest becomes the share image) and a Markdown body.
- **Remove a testimonial:** delete the `.md`; the unused photo is pruned from the
  build automatically. At least one must remain.
- **Change the event:** `src/data/event.json` — `date` as `yyyy-mm-dd`, times like
  `10:00am` or `2pm`. Bad values fail the build with a message naming the field.
- **Update stats:** `src/data/stats.json` — plain numbers, no commas.
- **Change colors/fonts:** `src/styles/tokens.css`. `--surface` is for backgrounds,
  `--text-muted` for dim text and icons; don't cross them (a previous version of
  this file conflated them and shipped a 1.44:1 contrast failure).

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

- `LAUNCH.md` — the go-live and domain-cutover runbook, and the pre-launch
  switches that are still off.
- `README.md` — editor-facing docs, the stack, dependency pins, the twice-a-year
  maintenance checklist, and the running TODO list.
- `.github/workflows/site-checks.yml` — what the scheduled checks do and why.

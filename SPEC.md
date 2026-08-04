# Pre-launch hardening spec — plgcleanup.org

**Audience:** the implementation agent (Claude Code) executing this spec, plus the site owner
for the items marked **[HUMAN]**.
**Origin:** adversarial pre-launch review (2026-08-04): 8 review dimensions, 44 deduplicated
findings, every finding independently verified against the code before inclusion. 29 confirmed
findings are covered here; 1 was refuted (deleting a nav-linked page IS caught at push time by
the audit's internal-link check — no action needed).

**How to use this file:** work tier by tier, in order. Each tier leaves the repo consistent, so
stopping after any tier is safe. Within a tier, items are independent unless noted. Every item
has an acceptance check — run it before moving on. Delete this file when all tiers are done
(its durable content moves into LAUNCH.md, CLAUDE.md, and README.md per the items below).

**Verification loop after every change:**

```sh
npm run check && npm run build && SEO_SKIP_FRESH=1 npm run audit
```

(Drop `SEO_SKIP_FRESH=1` once T2.1 re-arms the freshness gate at launch.)

**Owner decisions already made — do not re-litigate:**

- Domain cutover to plgcleanup.org happens **at launch** and is specced here (Tier 2).
- **No new test frameworks** (no Playwright, no axe/pa11y CI). The build + `seo-audit.mjs`
  remain the test suite; several items below harden that audit instead.
- Dependabot: **minors/patches auto, majors held** (T3.3).
- Scope: everything below is in scope, priority-tiered.

**Standing guardrails (documented deliberate decisions — do NOT "fix" these):**

- Fonts are deliberately not subset. Images are webp-only (AVIF measured 62% larger). Masters
  stay in-repo (20–30 image ceiling, ever) — no R2/remote-image architecture.
- The `void el.offsetHeight` reads in SiteHeader/carousel scripts are intentional
  (transition-restart idiom). Lighthouse "forced reflow" is a documented won't-fix.
- `main` deliberately has no PR requirement (Pages CMS commits straight to main; the build is
  the gate). Do not add branch-protection review rules.

---

## Tier 1 — Launch gate

Everything here ships broken, wrong, or invisible today. Complete before going live.

### T1.1 [HUMAN + agent] Replace placeholder content on six pages

`src/content/pages/` ships visible scaffolding: `terms.md:8` ("Volunteering terms and
conditions _todo_" — the footer-linked legal page), `partners.md:13`, `faq.md:11`,
`new-york-trash-clubs.md:13`, `community-service-hours.md:6` (all `_todo…_`), and
`schedule.md:8` ("coming soon"). The audit only WARNs on "todo" (`scripts/seo-audit.mjs:24`)
and `terms.html` is on the thin-page allowlist (`:40`), so CI is green.

- **[HUMAN]** writes real Terms text and decides for each other page: finish the sentence or
  delete it. The agent may draft; the owner approves.
- **Agent:** after content lands, harden the gate in `scripts/seo-audit.mjs`: move `"todo"`
  from `warnVisible` to `forbiddenVisible`, and remove `"terms.html"` from `thinAllow`.
- **Accept:** `npm run build && SEO_SKIP_FRESH=1 npm run audit` passes; `grep -ri "todo"
src/content/` is empty; re-adding a `_todo_` to any page makes the audit exit 1.

### T1.2 [HUMAN + agent] Remove the five "xyz" placeholder testimonials

`chelsie.md`, `isaiah.md`, `spencer.md`, `delaney.md`, `molly.md` ship on the homepage
carousel with `name: "xyz"`, quote/body `"..."` — real photos, placeholder everything else
(visible as "Read xyz's testimonial" on the live homepage).

- **[HUMAN]** decides: real quotes for these five people, or delete the five files (min. one
  testimonial must remain — see T1.6).
- **Agent:** add `"xyz"` to `forbiddenVisible` in `scripts/seo-audit.mjs` so this class can
  never ship again.
- **Accept:** `grep -rl "xyz" src/content/` empty; audit passes; homepage carousel shows only
  real names.

### T1.3 Alt text: derive it, delete the footgun field

11 of 16 testimonials ship junk alt (`"..."`, `"…"`, `"help me"`). The schema forces a
non-empty value, so editors will keep typing dots forever; the audit literally lists the
junk in `junkAlts` and WARNs.

- Remove `alt` from the testimonials schema (`src/content.config.ts:33`) and from `.pages.yml`
  (line 65). In `Carousel.astro`, set the image alt to
  `` `Portrait of ${name}, Community Cleanup PLG volunteer` `` — accurate for every photo,
  self-maintaining, one less form field. Delete the `alt:` line from all 16 markdown files.
- In `scripts/seo-audit.mjs`, promote the junk-alt check (lines 337–341) from `warn` to `err`
  as the regression net.
- **Accept:** build passes; `grep -o 'alt="[^"]*"' dist/index.html | sort -u` shows only the
  derived pattern and `alt=""` (decorative); audit passes and errs if you hand-edit a junk alt
  into a fixture.

### T1.4 Wire the staleness tripwire to people who still exist _(was the review's sole blocker)_

`site-checks.yml`'s whole alerting story is "GitHub emails you" — but scheduled-run failure
mail goes only to the last committer of the workflow file (the departing maintainer), the repo
has **zero watchers**, and GitHub auto-disables crons in public repos after 60 days without
repo activity. As staged, the safety net notifies nobody and then silently dies.

- In `.github/workflows/site-checks.yml`: add top-level `permissions: { contents: read,
issues: write }` (this is also T4.3). Add a final step to the `audit` job:
  `if: failure() && github.event_name == 'schedule'`, `env: GH_TOKEN: ${{ github.token }}`,
  running: create issue titled "Site check failed — is the next cleanup date set?" with the
  run URL — or comment on it if an open one already exists
  (`gh issue list --state open --search "in:title Site check failed"` to check).
- Do the same for `ci.yml` push failures (T1.5 has the exact scoping).
- Document in LAUNCH.md (T2.1): every organizer clicks **Watch → Custom → Issues** on the
  repo; note the 60-day cron auto-disable and its re-enable path (repo → Actions → workflow →
  Enable), and that weekly Pages CMS commits reset the clock.
- **Accept:** `gh workflow run "site checks"` with a deliberately stale `event.json` date (and
  `SEO_SKIP_FRESH` removed locally in a branch) produces an issue. Revert the test change.

### T1.5 Close the editor feedback loop on build failures

A bad CMS edit fails the build 40–60 s later in places no editor looks (Actions log, Cloudflare
dashboard); the site silently freezes on the last good deploy and the carefully-written zod
error messages are never seen.

- `ci.yml`: add `issues: write` to permissions; add a final step
  `if: failure() && github.event_name == 'push'` (PR runs from Dependabot get a read-only
  token — do not fire there), `env: GH_TOKEN: ${{ github.token }}`, creating/commenting an
  issue titled "Site build failed — the latest edit did not go live" with the run URL and
  commit SHA.
- `README.md`: add an editor-facing section **"If your edit doesn't appear after 2 minutes"**:
  open the Actions tab → red run → read the last red lines (the error names the file and
  field) → re-edit or revert from the GitHub UI → paste the error to the Claude agent if
  stuck. Include the Cloudflare rescue levers: Pages → deployment → Rollback; Retry with
  "clear build cache" after dependency-ish failures.
- **Accept:** push a branch with a broken `event.json` time, open a PR — CI fails without
  attempting the issue step; on a throwaway push to a test branch of main-like config confirm
  the issue appears. Revert.

### T1.6 Guard the two silent-crash / silent-wrong paths in data code

1. **Impossible dates roll over silently.** `event.ts:76` checks shape only;
   `Date.UTC(2026, 12, 45)` happily becomes 2027-02-14, shipping a plausible countdown to a
   nonsense date (contradicts the file's own "a typo can never go live" header — note
   `parseTime` at `:91` already range-checks, the date gap is an oversight). Fix: in
   `parseDate`, round-trip: build `new Date(Date.UTC(y, m-1, d))` and throw the existing
   friendly-error style if `getUTCMonth()+1 !== m || getUTCDate() !== d`. Also change the CMS
   field to a date picker: `.pages.yml` event `date` field → `type: date` (Pages CMS saves
   `yyyy-MM-dd` by default, matching the current format; keep the regex too — GitHub-web edits
   bypass the CMS).
2. **Zero testimonials crashes every page build** via `og.ts:17` (`pick.data.image` on an
   empty collection; `Base.astro` imports it). Fix in house style:
   `if (testimonials.length === 0) throw new Error("[testimonials] The social share image
features a testimonial photo, but src/content/testimonials/ is empty. Add at least one
testimonial.");`

- **Accept:** `date: 2026-13-45` in `event.json` fails the build naming the field; an empty
  `src/content/testimonials/` fails with the friendly message; both reverted.

### T1.7 Fix the Sunday hole in the countdown

`countdown.ts:88–97` compares the cleanup date only against Saturdays, so Sunday cleanups —
including the currently staged 2026-08-09 event — never get "Is this Sunday!" / "Join us this
Sunday" copy and fall through to "in five days". The `dayName` plumbing proves Sundays were
intended.

- Replace the Saturday-only comparison with weekend buckets: map any day to its weekend's
  Saturday (`dow === 0 ? dayMs - 86_400_000 : dayMs + (6 - dow) * 86_400_000`); if the
  cleanup's weekend-Saturday equals today's → `this-weekend`; if it equals today's + 7 days →
  `next-weekend`. Keep the file pure/dependency-free.
- While here: `countdown.ts:145` `"is tomorrow!"` → `"Is tomorrow!"` (every sibling branch is
  capitalized; renders as the /join page's largest text the day before each event).
- **[HUMAN]** confirm 2026-08-09 (a Sunday) is the intended date, not a typo for Saturday
  2026-08-08.
- **Accept:** `node -e` snippet driving `computeCountdown` with a Wednesday "now" and the
  following Sunday start returns `this-weekend`/`dayName: "Sunday"`; Saturday events behave as
  before; build output for the staged event shows "Join us this Sunday".

### T1.8 Make the Event JSON-LD stop advertising past events, and rebuild daily

`join.astro:31–60` emits `eventStatus: EventScheduled` unconditionally from the single
`event.json` date — the workflow comment's claim that the post-event redeploy "flips the
JSON-LD forward" is false, and the redeploy cron (`30 15 * * 6`) is Saturday-only while the
staged event is a Sunday.

- In `join.astro`: compute `state` (already done, line 17) and omit the JSON-LD `<script>`
  entirely when `state.tag === "past"`.
- In `site-checks.yml`: change the staged redeploy cron to daily — `30 20 * * *` (≈4:30 pm
  EDT / 3:30 pm EST, after any afternoon cleanup ends) — and its job guard to match. A daily
  rebuild of a static site is free (≈365 builds/yr vs. Pages' 500/mo limit) and caps ALL
  baked-HTML staleness (CTA label, countdown line, JSON-LD removal) at 24 h for any weekday.
  Rewrite the comment block to say what a rebuild actually flips (CTA/countdown copy, JSON-LD
  removal) — not "the next cleanup".
- In `scripts/seo-audit.mjs`, fix the two false-pass paths + the missing-schema hole:
  (a) line 251: if `Number.isNaN(end.getTime())` → `err(page, "Event has unparseable
startDate/endDate")` (today Invalid Date compares false and passes as _fresh_);
  (b) line 266: change `/href="([^"#]+)"/g` to `/href="([^"]+)"/g` — the `#` exclusion makes
  the regex skip fragment links entirely (`pathToFile` already strips `#`);
  (c) after the JSON-LD loop: `err` if `join.html` contains no `@type: Event` node **unless**
  the event end date in `dist` context is past (pair with the omit-when-past change: simplest
  is to err only when the audit also sees a future event in `src/data/event.json` — read the
  JSON directly), and `err` if an Event node lacks `name`/`startDate`/`location`.
- **Accept:** with a past date in `event.json`, `npm run build` produces a `join.html` with no
  JSON-LD and the audit stays green on that page; with a future date, deleting the JSON-LD
  line from `join.astro` makes the audit exit 1. Revert test edits.

### T1.9 Make `.pages.yml` actually valid and actually strict

Two independently verified defects, one file:

1. **The settings block is silently inert.** Pages CMS requires `settings.content` to be an
   object and commit templates under `commit.templates`; the current shape means merge-mode is
   OFF (every CMS save rewrites files from the schema, dropping unmodeled keys) and the custom
   commit messages are ignored. Replace lines 11–19 with:
   ```yaml
   settings:
     content:
       merge: true
     commit:
       templates:
         create: "Add {filename} (via Pages CMS)"
         update: "Update {filename} (via Pages CMS)"
         delete: "Delete {filename} (via Pages CMS)"
   ```
2. **Required-in-build, optional-in-form.** Add `required: true` to: testimonials `image` and
   `body`; pages `body`; event `date`, `startTime`, `endTime`, `corner`; stats
   `poundsCollected`, `volunteerCount`. Add to both time fields (event.ts's parser accepts
   only 12-hour am/pm):
   ```yaml
   pattern:
     regex: "^\\s*\\d{1,2}(:[0-5]\\d)?\\s*[AaPp][Mm]\\s*$"
     message: Write it like 10:00am, 9:30am, or 2pm.
   ```
3. **New pages get date-prefixed URLs.** The `pages` collection sets no `filename`, and the
   Pages CMS default is `{year}-{month}-{day}-{primary}.md` — filenames are URLs here, so a
   Contact page created 2026-09-01 publishes at `/2026-09-01-contact`. Add
   `filename: "{fields.title}.md"` to the pages collection. Pair with a reserved-slug guard in
   `src/pages/[slug].astro` `getStaticPaths`: throw a friendly error if `page.id` is `index`,
   `join`, or `404` (those static routes win silently today, so the editor's page would vanish
   without feedback).

- **[HUMAN]** afterwards: open the repo in Pages CMS → Settings and confirm zero config
  validation errors; save one testimonial and confirm the commit message format.
- **Accept:** CMS settings editor validates clean; a testimonial saved without a photo is
  blocked in the form; `pages` collection guard: adding `src/content/pages/join.md` fails the
  build with the friendly message (then delete it).

### T1.10 Fix the invisible "← Back home" link (WCAG hard fail on 8 pages)

`Prose.astro:53` sets `color: var(--muted)` — but `--muted` is `#292929`, a dark _surface_
token: **1.44:1** on the black background (AA needs 4.5:1). The only in-content nav link on
every prose page is effectively invisible; hover-only rescue never reaches touch users.

- Add a real muted-text token in `tokens.css` (e.g. `--text-muted: #9a9a96` ≈ 7:1 on black)
  and use it in `.prose-back`. Then rename `--muted` → `--surface` across the repo
  (`grep -rn "var(--muted)"` — chrome.css and friends) so the trap can't recur; keep the old
  name as an alias only if the grep surface is large.
- **Accept:** computed contrast ≥ 4.5:1 (`node` WCAG relative-luminance check on the hex
  pair); `grep -rn "var(--muted)" src/` returns nothing (all call sites migrated).

---

## Tier 2 — Launch runbook & domain cutover

The owner has decided the plgcleanup.org cutover happens at launch. Today the launch/cutover
knowledge lives in five disconnected comment blocks; two of its staged steps are wrong.

### T2.1 Write LAUNCH.md — the single sequenced runbook

Create `LAUNCH.md` at the repo root with two sequenced milestones, each step pointing at exact
file:line, absorbing (and then slimming to one-line pointers) the comment blocks in
`site-checks.yml:35–48`, `deploy/README.md`, and `deploy/_worker.js`:

- **A. Go-live (re-arm the safety nets):**
  1. **[HUMAN]** Cloudflare dashboard → Pages project → Settings → Builds → create Deploy
     Hook; save as repo secret `CF_PAGES_DEPLOY_HOOK`.
  2. Roll `src/data/event.json` to the real next cleanup date.
  3. Uncomment both crons in `site-checks.yml` **byte-identically** (the `links`/`redeploy`
     job `if:` guards string-match the cron text — note this in the file) — using the daily
     redeploy cron from T1.8.
  4. Delete `SEO_SKIP_FRESH: "1"` from `site-checks.yml` env.
  5. **[HUMAN]** Every organizer: Watch → Custom → Issues on the repo (see T1.4; include the
     60-day cron auto-disable note).
- **B. Domain cutover (same deploy):**
  1. **[HUMAN]** Attach `plgcleanup.org` **and** `www.plgcleanup.org` as custom domains on the
     Pages project; add a zone Redirect Rule 301 `www.` → apex preserving path/query. (The
     staged plan never addressed www — unattached it's NXDOMAIN on flyers.)
  2. Flip `astro.config.mjs` `site` to `https://plgcleanup.org`.
  3. Update the hardcoded mirrors: `site-checks.yml` `SITE` env; `public/robots.txt` sitemap
     URL; `README.md:5` live URL.
  4. **[HUMAN]** Bulk Redirect for the old host — see T2.2. Enable HSTS on the plgcleanup.org
     zone (pages.dev inherited preload; .org does not).
  5. **[HUMAN]** New Google Search Console property for plgcleanup.org; submit
     `sitemap-index.xml`.
  6. `curl -sI https://plgcleanup.org/about` — expect 200, the T2.4 headers, and correct
     canonical in the body; `curl -sI https://plgcleanup.pages.dev/x?y=1` — expect 301 to
     `https://plgcleanup.org/x?y=1`.
- **C. Appendix — recreate the Pages project from scratch** (today scattered across README
  prose): project name `plgcleanup` (the pages.dev host depends on it), build command
  `npm run build`, output `dist/`, Node from `.nvmrc`, build cache ON, branch protection =
  block force-pushes + deletions only (no PR requirement — deliberate), custom domains, deploy
  hook + secret.

Link LAUNCH.md from README's Deployment & CI section.
**Accept:** every step in A/B resolves to a real file:line or dashboard path; the five old
comment blocks are pointers, except the hazard warning inside `deploy/_worker.js`'s
replacement (see T2.2) and one-line pointers beside `SITE`/`SEO_SKIP_FRESH`.

### T2.2 Replace the redirect worker with a Bulk Redirect (delete `deploy/_worker.js`)

Verified against Cloudflare docs: shipping `public/_worker.js` puts the site in advanced mode
where **`_headers`/`_redirects` files silently stop applying** (breaking T2.4's headers), and
its `endsWith(".pages.dev")` matches `<hash>.plgcleanup.pages.dev` preview hosts — every
preview deploy (the team's only pre-merge eyeball mechanism, e.g. for Dependabot PRs) would
301 to production. Previews are already `X-Robots-Tag: noindex` by default; only the bare
production host is indexable, so the worker's deindexing rationale is void.

- Delete `deploy/_worker.js`. In LAUNCH.md B.4: **[HUMAN]** Cloudflare dashboard → Account →
  Bulk Redirects → list with one rule: `https://plgcleanup.pages.dev` →
  `https://plgcleanup.org`, 301, Subpath matching + Preserve path suffix + Preserve query
  string ON, **Include subdomains OFF** (Cloudflare's own how-to enables it — that would break
  the previews). Enable the rule set.
- Fold anything still useful from `deploy/README.md` into LAUNCH.md and delete the `deploy/`
  directory.
- **Accept:** repo has no `_worker.js` anywhere; LAUNCH.md B.4 spells out the exact toggle
  states including subdomains OFF.

### T2.3 Un-hardcode the audit's origin so cutover can't strand local pushes

`package.json:10` pins `--site https://plgcleanup.pages.dev`. After cutover this makes
`npm run audit` — which the pre-push hook runs on **every push** — exit 1 with ~20 false host
errors, on every clone, forever, and `deploy/README.md`'s claim that the audit derives from
`astro.config` is false today.

- Change the script to `"audit": "node scripts/seo-audit.mjs dist"` — the script already
  infers the origin from the built index canonical (`seo-audit.mjs:93–98`), which truly does
  derive from `astro.config site`. CI keeps its pinned `SITE` env as the cross-check.
- **Accept:** `npm run audit` passes today; temporarily flipping `astro.config` `site` to
  plgcleanup.org and rebuilding, `npm run audit` still passes locally (self-truing) while
  `SITE=https://plgcleanup.pages.dev node scripts/seo-audit.mjs dist --site "$SITE"` fails —
  proving the CI cross-check still works. Revert.

### T2.4 Add `public/_headers` (baseline security headers)

No headers file exists; Cloudflare Pages sets none of these by default. Static, safe, and it
keeps working after cutover because T2.2 keeps the project on plain static serving:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Deliberately **no `script-src` CSP**: the build emits ~22 hash-varying inline module scripts;
hash maintenance is an unexploded footgun for a maintainerless repo, the scripts are all
first-party build output, and the site takes no user input. `_headers` has no comment syntax,
so record that reasoning in CLAUDE.md's don't-touch list (T3.1 item 3), not in the file.
**Accept:** after deploy (or `npx wrangler pages dev dist` locally), `curl -sI` shows all four
headers on `/` and `/about`; the Google Maps embed on /join still renders (X-Frame-Options
constrains being framed, not framing).

---

## Tier 3 — Hand-off documentation

### T3.1 Write CLAUDE.md — the operating manual for the maintenance agent

The hand-off regime explicitly includes a low-capability Claude Code agent, which auto-loads
`CLAUDE.md` — and there isn't one; the repo's invariants live in scattered comments. Create it
with exactly these sections (concise — target ≤120 lines):

1. **What this is** — static Astro 6 site, Cloudflare Pages, content via Pages CMS/GitHub UI,
   no server, no database.
2. **Verify loop** — `npm run check && npm run build && npm run audit` (note: before launch,
   prefix audit with `SEO_SKIP_FRESH=1`; remove that note at launch).
3. **Don't touch / don't "fix"** — fonts (not subset, deliberate); webp-only; masters in-repo;
   `void el.offsetHeight` idioms in SiteHeader/carousel (transition restart — Lighthouse
   forced-reflow is a won't-fix); no PR gate on main (deliberate); no script-src CSP
   (deliberate — inline build scripts); `src/data/event.ts` logic below its header comment.
4. **Invariants** — nav links are hand-maintained in THREE places (`SiteHeader.astro`,
   `MobileMenu.astro`, `SiteFooter.astro`); page `<title>` template lives only in
   `Base.astro`; content pages auto-route from `src/content/pages/*.md` (filename = URL;
   `index`/`join`/`404` are reserved); the audit script is the launch gate — never delete a
   check to make it pass.
5. **Recipes** — add a page (create `.md` with title/description frontmatter + add the footer
   link); add/remove a testimonial (min. one must remain); change the event (edit
   `event.json`, date `yyyy-mm-dd`, times like `10:00am`); update stats.
6. **When the build fails** — read the Actions log's last red lines; the error names the file
   and field; revert via GitHub UI if unsure; Cloudflare rollback exists (link README
   section from T1.5).
7. **Pointers** — LAUNCH.md (launch/cutover), README (editor docs), `site-checks.yml` (what
   the crons do).

**Accept:** file exists, ≤ ~120 lines, every claim in it is true of the current repo (grep
each file reference).

### T3.2 Fix README drift

- Replace the ghost **"Agreements"** page at lines 23 and 95 with the real page list —
  `partners`, `lost-and-found`, `community-service-hours`, `new-york-trash-clubs` are shipped,
  footer-linked, and undocumented (or write "…and the rest — the filename is the URL").
- Commands table: add `npm run audit` (what it checks, that pre-push runs it) and
  `npm run gen:logo`.
- Deployment & CI: add a short "site checks" paragraph naming `site-checks.yml` + link
  LAUNCH.md; correct the pre-push description at line ~204 — the hook runs format + types +
  build **+ the SEO audit** (`.githooks/pre-push:10`).
- Stack table + line 71: **two** runtime dependencies (see T4.4's floating-ui removal).
- Add the T1.5 editor runbook section if not already done.
- **Accept:** `grep -n "Agreements" README.md` empty; every file/command README names exists;
  every shipped page appears in the editing table.

### T3.3 Hold back majors in Dependabot (owner decision)

`.github/dependabot.yml`: majors currently arrive as ordinary green PRs a non-technical team
is told to merge; CI never executes client JS, so an Astro major that silently kills the
menu/carousel/countdown would merge green.

- Add to the npm `ignore` list, each with `update-types: [version-update:semver-major]` and a
  comment mirroring the existing TypeScript one: `astro`, `embla-carousel`, `sharp` (direct
  dep after T4.1). Comment: "Majors need a deliberate upgrade: ask the Claude agent to read
  the migration guide, upgrade, and click through menu/carousel/countdown in `npm run
preview`."
- **Accept:** `dependabot.yml` parses (push to a branch, check the Dependabot tab has no
  config error), and the ignore list covers all three.

---

## Tier 4 — Supply chain & CI hygiene

### T4.1 Declare `sharp` as a direct dependency

`src/lib/lqip.ts:2` and `scripts/gen-logo-assets.mjs:14` import it, but it's only Astro's
_optional_ dependency — a future Astro bump or a failed optional install breaks the build with
`Cannot find module 'sharp'`. Add `"sharp": "^0.34.5"` to `dependencies`, `npm install`.
**Accept:** `npm ls sharp` shows it as a direct dep; build passes.

### T4.2 Vendor `astro-delete-unused-images`

Single-maintainer package (122 lines, no tests, targets Astro 4), floating `^1.0.3`, with
delete powers inside every build — the repo's weakest trust edge, since Dependabot's grouped
minor PR would auto-roll a hijacked 1.0.4 into a green merge. Copy
`index.js`/`src/integration.js`/`src/util.js` into `src/integrations/delete-unused-images/`
(keep the MIT license header + attribution), import by relative path in `astro.config.mjs`,
`npm uninstall astro-delete-unused-images`.
**Accept:** build log still shows the "Deleting unused image …" lines and dist size is
unchanged (±1 KB); the package is gone from `package.json`/lockfile.

### T4.3 Workflow hardening

`site-checks.yml` has no `permissions:` block (ci.yml does) and runs `lycheeverse/lychee-action@v2`
— an unpinned third-party tag that receives `github.token` by default; with no PR gate on
main, a hijacked tag is a push-to-deploy path. Set top-level permissions (T1.4 already adds
`contents: read, issues: write`), and pin the action to a full commit SHA with a version
comment (Dependabot's `github-actions` ecosystem maintains SHA pins). While here, note beside
both cron `if:` guards that the strings must match the `schedule` entries byte-for-byte.
**Accept:** `grep -A2 "^permissions:" .github/workflows/site-checks.yml` shows the block;
the `uses:` line is a 40-char SHA with `# v2.x` comment.

### T4.4 Remove the dead `@floating-ui/dom` dependency

Declared, documented in README as part of the carousel — imported nowhere, absent from every
dist bundle. `npm uninstall @floating-ui/dom`; update README (T3.2 covers the two lines).
**Accept:** build + audit pass; `grep -ri floating package.json README.md src/` empty.

### T4.5 Re-test and resolve the esbuild override

`overrides: { esbuild: "^0.28.1" }` forces a version outside astro's (`^0.27.3`) and vite's
(`^0.27.0`) declared ranges; the rationale (Node-24 ESM fix + CVEs, commit 26287eb) exists
only in a commit message, and Dependabot cannot update `overrides`. Delete the override, `npm
install`, run the full verify loop on Node 24 (`node -v` vs `.nvmrc`). If green: ship the
removal (astro's own range postdates the CVE fixes). If the ESM issue reproduces: restore it
and add a **"Dependency pins"** note to README stating why it exists and the removal
condition ("drop when astro's declared esbuild range reaches ^0.28").
**Accept:** either the override is gone and CI is green, or it remains and README documents it.

### T4.6 Drop the duplicate per-push build

Every push builds three times (ci.yml, site-checks audit job, Cloudflare). Move the audit into
`ci.yml` as a step after its existing build (`node scripts/seo-audit.mjs dist --site "$SITE"`
with the env var), and limit `site-checks.yml`'s `audit` job to `schedule` +
`workflow_dispatch`. Halves Actions minutes and the red-X surface an editor sees on a failed
content edit.
**Accept:** a push triggers exactly one Actions build job (plus Cloudflare's); the Monday cron
still runs the audit with the freshness gate armed.

---

## Tier 5 — Accessibility completion

(The launch-gate a11y items — contrast T1.10, alt text T1.3 — are above. These complete the
canonical behaviors.)

### T5.1 Skip link + banner landmark

No skip link exists and the site chrome is a bare `<div>` — keyboard users tab through six
chrome stops on every page; screen readers get no banner landmark. In `Base.astro`: first
child of `<body>` → `<a href="#main" class="skip-link">Skip to content</a>` (visually hidden,
visible on focus — `.sr-only` pattern exists in `base.css:75`); `id="main"` + `tabindex="-1"`
on `<main>`. In `SiteHeader.astro:11`: change the `site-chrome` wrapper div to `<header>` —
all coordinating CSS selects by class/id, so the element swap is safe (verify the
`.site-chrome.is-fixed ~` sibling selectors still match since MobileMenu stays a sibling).
**Accept:** first Tab on any page reveals the skip link and Enter lands focus on `<main>`;
`grep -c "<header class=\"site-chrome\"" dist/index.html` = 1.

### T5.2 Mobile menu: real modality

`role="dialog" aria-modal="true"` with no focus containment — Tab walks behind the opaque
overlay; closing via the ✕ ends in `menuBtn.blur()`, stranding keyboard focus on `<body>`.
In `MobileMenu.astro`: on open, set `inert` on `#site-chrome`, `main`, and `footer` (all
siblings); remove on close. Gate the `blur()` to the touch media query it was added for
(`(hover: none) and (pointer: coarse)` — the same query already used on open), keeping focus
on the button for keyboard closes. Escape handling already correct — don't touch it.
**Accept:** with the menu open, Tab cycles only through menu links + button; Enter on ✕
returns focus to the button (visible focus ring).

### T5.3 Carousel reveal panel: focus + keyboard scroll

`openPanel()` never moves focus (panel DOM-precedes the toggle, so Tab moves _away_ from the
opened content) and `.card__panel-body` (`overflow-y: auto`) isn't keyboard-scrollable in
Safari. In `carousel.client.ts` `openPanel()`: focus the panel's `.card__panel-close`
(mirroring `closePanel`'s existing focus return). In `Carousel.astro`: `tabindex="0"`,
`role="region"`, `aria-label={`${name}'s testimonial`}` on `.card__panel-body`; add
`id`/`aria-controls` between panel and toggle.
**Accept:** keyboard: Enter on "Read X's testimonial" → focus lands on the close button →
Tab reaches the scrollable body (focusable) → Escape/close returns focus to the toggle.

### T5.4 Home heading outline

`index.astro:102`: the "Why volunteer" section label is a `<p>` while its columns are `<h3>`s
— the built outline is h1 → h3×3 → h2 (skip + inversion) on the most-visited page. Change
`.why__label` to `<h2>` (it already carries the `aria-labelledby` id; keep the styling by
class). Outline becomes h1 → h2 → h3×3 → h2.
**Accept:** `grep -o "<h[1-6]" dist/index.html` sequence shows no level skip.

---

## Tier 6 — Polish (small, do in one pass)

Each verified real; none blocks anything above.

1. **Deterministic carousel heading id** — `Carousel.astro:17` uses `Math.random()` →
   nondeterministic dist (`ch-5knz6i1` in the current build). Use a static id (one carousel
   per site) and only set `aria-labelledby` when `heading` exists.
2. **Footer copyright year** — `SiteFooter.astro:40` hardcodes 2026 →
   `{new Date().getFullYear()}` (build-time; the daily redeploy from T1.8 keeps it fresh).
3. **JSON-LD timestamps** — event start/end serialize as UTC `Z`; emit the Eastern local-offset
   ISO form Google's Event docs recommend (derive from the existing `easternDate` handling in
   `event.ts`).
4. **`gen-logo-assets.mjs` honesty** — it claims logo.svg is the source of truth but hardcodes
   `treeH = 296.1`, assumes subpath order, and reads only the first `<path>`. Replace the
   aspirational header with the honest constraints ("single `<path>`; first two subpaths are
   the tree; re-measure treeH after edits") and make it throw if the SVG has >1 `<path>`.
5. **`allowScripts` block in package.json is inert** — npm ignores it (it's a
   lavamoat/pnpm convention). Delete it, or replace with the npm-native equivalent if install
   scripts should truly be gated; don't ship config that implies protection it doesn't give.
6. **`focusPosition` free text** — add a `.pages.yml` pattern (`^\d{1,3}% \d{1,3}%$`, friendly
   message) and a matching zod `.regex()`; invalid values currently emit CSS that browsers
   silently drop.
7. **Duplicate `order` values** — six testimonials share `order: 3`; renumber uniquely and add
   to the `.pages.yml` order description: "unique number; lowest shows first, second-lowest is
   the default highlight".
8. **Repeat-name collisions** — `filename: "{fields.name}.md"`: note in the CMS name-field
   description to use "First name + last initial" when a name repeats (a second Abby would
   collide with `abby.md`).
9. **`og:locale`** + trim the six over-length page titles the audit warns about; fix the
   stale title comment in `Base.astro`.
10. **Hero image loading** — the in-viewport homepage raccoon image is `loading="lazy"`; make
    it eager with `fetchpriority="high"` (it's above the fold at most viewports).
11. **`deploy/` header comment** — obsolete after T2.2 deletes the directory; otherwise reword
    `// public/_worker.js` to `// destination: public/_worker.js`.

**Accept (tier-wide):** verify loop green; `git diff --stat` touches only the files named.

---

## Out of scope (explicitly rejected)

- Playwright / axe / pa11y / any browser-test framework (owner decision — build-as-test).
- R2 or remote-image hosting; AVIF; font subsetting (documented deliberate decisions).
- PR-requirement on main; CODEOWNERS; review gates (deliberate — CMS commits to main).
- script-src CSP (see T2.4 reasoning).
- Testimonial PII — the site publishes volunteers' photos and first names. This is a policy
  question for the owner (is consent on file? is there a takedown path — e.g. an email in the
  footer?), not a repo change; flagging it here so it isn't lost.

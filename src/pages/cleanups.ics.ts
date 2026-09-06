// ============================================================================
//  /cleanups.ics — the subscribable calendar
// ============================================================================
//
//  The first route in this repo that emits a FILE rather than a page. Astro
//  writes it to dist/cleanups.ics because the route's own filename carries the
//  extension; the site's `build.format: "file"` rule applies to pages, not to
//  endpoints, so nothing here has to work around it.
//
//  There is nothing to decide in this file. Every cleanup still to come, in the
//  order src/data/schedule.ts already put them, formatted by
//  ../lib/calendar-feed.ts. UPCOMING_CLEANUPS is passed straight through and
//  never copied or mapped: the feed identifies the next cleanup by object
//  identity, so a cloned list would quietly link every entry to /schedule.
// ============================================================================

import type { APIRoute } from "astro";
import { UPCOMING_CLEANUPS } from "../data/schedule";
import { calendarFeed } from "../lib/calendar-feed";

// The site is `output: "static"`, so every route is already built to a file at
// build time. Saying so here is insurance rather than instruction: if this
// project ever gains a server adapter, the feed stays a file instead of quietly
// becoming a function that runs on every request.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(calendarFeed(UPCOMING_CLEANUPS), {
    // Correct in `astro dev` and `astro preview`, and honest about what this is.
    // It does NOT reach production: a static build writes only the response BODY
    // to disk and discards its headers, because there is no adapter to carry
    // them. Cloudflare Pages sets the type from the file extension, and
    // public/_headers is the only lever that can override it — the rule for this
    // path lives there, and is not redundant with this line.
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });

// ============================================================================
//  ONE CLEANUP, AS EVERY MACHINE-READABLE SURFACE DESCRIBES IT
// ============================================================================
//
//  The shared vocabulary of a single cleanup: its name, what it is, and the
//  page that describes it. Two things read from here —
//
//    • eventSchema() below, the Event structured data (JSON-LD) that /join and
//      /schedule emit. The one schema type on this site with a visible search
//      surface ("things to do this weekend").
//    • ../lib/calendar-feed.ts, the subscribable .ics at /cleanups.ics.
//
//  It lives here rather than on either page because all of those surfaces
//  describe the same events, and hand-written copies of a description are
//  copies that drift. Every value comes from src/data/schedule.ts or
//  src/site.config.ts — nothing about a cleanup is typed out again here.
// ============================================================================

import { NEXT_CLEANUP, type Cleanup } from "../data/schedule";
import { SITE } from "../site.config";

// Absolute URLs, from `site` in astro.config.mjs: a search result links in from
// somewhere else, so a relative path would resolve against the wrong host.
const abs = (path: string) => new URL(path, import.meta.env.SITE).href;

/**
 * What this event is called, wherever it is named — a search-result headline
 * and an entry in someone's calendar alike. The corner is the only part that
 * changes between cleanups, which is what makes one name usable on both.
 */
export const eventName = (cleanup: Cleanup) => `${SITE.name} — ${cleanup.corner}`;

/**
 * What a cleanup is, for a reader who meets it as a search result rather than
 * on the site. The same sentence for every cleanup — what changes between them
 * is the date and the corner, which are their own fields.
 */
export const EVENT_DESCRIPTION =
  "A one-hour volunteer street cleanup in Prospect Lefferts Gardens, Brooklyn. " +
  "No registration; all supplies provided. Just show up.";

/**
 * The page that describes this cleanup. /join only ever describes the next one,
 * so a listing for a cleanup three weeks out has to land on /schedule instead —
 * otherwise the visitor arrives at a page showing a different date.
 *
 * It recognises the next cleanup by OBJECT IDENTITY against NEXT_CLEANUP, not
 * by comparing dates. Callers must therefore hand over the objects exported by
 * src/data/schedule.ts as they are: map or clone them first and every cleanup,
 * including the next one, quietly links to /schedule.
 */
export const eventUrl = (cleanup: Cleanup) =>
  cleanup === NEXT_CLEANUP ? abs("/join") : abs("/schedule");

/** One cleanup as a schema.org Event node, ready to JSON.stringify. */
export function eventSchema(cleanup: Cleanup) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventName(cleanup),
    description: EVENT_DESCRIPTION,
    // Local time + offset, not UTC — the form Google's Event docs ask for,
    // because it is the wall-clock time shown in the result.
    startDate: cleanup.isoLocal,
    endDate: cleanup.endIsoLocal,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: true,
    url: eventUrl(cleanup),
    image: abs(SITE.schema.logo),
    location: {
      "@type": "Place",
      name: cleanup.corner,
      address: {
        "@type": "PostalAddress",
        streetAddress: cleanup.corner,
        addressLocality: "Brooklyn",
        addressRegion: "NY",
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": SITE.schema.type,
      name: SITE.name,
      url: abs("/"),
    },
  };
}

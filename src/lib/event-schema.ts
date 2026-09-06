// ============================================================================
//  EVENT STRUCTURED DATA (JSON-LD)
// ============================================================================
//
//  One cleanup, described in the shape Google's event listings read — the one
//  schema type on this site with a visible search surface ("things to do this
//  weekend"). /join emits the next cleanup's node; /schedule emits one per
//  cleanup it lists.
//
//  It lives here rather than on either page because both pages describe the
//  same events, and two hand-written copies of a schema are two schemas that
//  drift. Every value comes from src/data/schedule.ts or src/site.config.ts —
//  nothing about a cleanup is typed out again here.
// ============================================================================

import { NEXT_CLEANUP, type Cleanup } from "../data/schedule";
import { SITE } from "../site.config";

// Absolute URLs, from `site` in astro.config.mjs: a search result links in from
// somewhere else, so a relative path would resolve against the wrong host.
const abs = (path: string) => new URL(path, import.meta.env.SITE).href;

/**
 * What a cleanup is, for a reader who meets it as a search result rather than
 * on the site. The same sentence for every cleanup — what changes between them
 * is the date and the corner, which are their own fields.
 */
const EVENT_DESCRIPTION =
  "A one-hour volunteer street cleanup in Prospect Lefferts Gardens, Brooklyn. " +
  "No registration; all supplies provided. Just show up.";

/**
 * The page that describes this cleanup. /join only ever describes the next one,
 * so a listing for a cleanup three weeks out has to land on /schedule instead —
 * otherwise the visitor arrives at a page showing a different date.
 */
const eventUrl = (cleanup: Cleanup) => (cleanup === NEXT_CLEANUP ? abs("/join") : abs("/schedule"));

/** One cleanup as a schema.org Event node, ready to JSON.stringify. */
export function eventSchema(cleanup: Cleanup) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${SITE.name} — ${cleanup.corner}`,
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

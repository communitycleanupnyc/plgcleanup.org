// ============================================================================
//  THE CALENDAR FEED (.ics)
// ============================================================================
//
//  Every future cleanup, as one subscribable calendar. A reader clicks
//  "Subscribe" on /schedule once; their calendar app re-fetches this file
//  forever after, so the dates an editor adds in Pages CMS turn up on their
//  phone without anyone sending anything. The daily redeploy cron in
//  .github/workflows/site-checks.yml is what republishes it.
//
//  This is the thing the per-event "Add to calendar" button can't be: that link
//  (googleCalendarUrl in src/data/schedule.ts) copies ONE date into a calendar
//  and then knows nothing about the schedule ever again.
//
//  Hand-written rather than an npm package, on purpose. The format is RFC 5545,
//  it has not changed since 2009, and the whole of what we need is four rules —
//  CRLF line endings, escaped TEXT, 75-OCTET folding, and UTC timestamps. All
//  four are below, each with the mistake it prevents written beside it.
//
//  Nothing about a cleanup is worded here. The name, the description, and the
//  page a calendar entry links to all come from ./event-schema.ts, which /join
//  and /schedule also read — so a cleanup can't be described one way in Google
//  and another way in someone's calendar.
// ============================================================================

import type { Cleanup } from "../data/schedule";
import { EVENT_DESCRIPTION, eventName, eventUrl } from "./event-schema";
import { SITE } from "../site.config";

/**
 * Where the feed lives. One value, read by the route that emits it
 * (src/pages/cleanups.ics.ts), the link that points at it (/schedule), and the
 * check that verifies it (scripts/seo-audit.mjs).
 */
export const FEED_PATH = "/cleanups.ics";

// The canonical origin, from `site` in astro.config.mjs — the same source every
// other absolute URL on this site is built from.
const ORIGIN = new URL(import.meta.env.SITE);

/** The plain address of the feed — what a Google Calendar user pastes into "From URL". */
export const FEED_URL = new URL(FEED_PATH, ORIGIN).href;

/**
 * The one-click subscribe address: the same URL as FEED_URL with the scheme
 * swapped. A browser hands `webcal://` to the operating system, which opens the
 * calendar app already asking "subscribe to this?" — where the https address
 * would merely download a file that imports once and never updates again.
 * Fetching it is plain HTTPS; only the handoff differs.
 */
export const FEED_WEBCAL_URL = `webcal://${ORIGIN.host}${FEED_PATH}`;

/**
 * How often a subscriber's calendar should re-check. Twelve hours, against a
 * site that rebuilds daily: an added date or a corrected corner is on every
 * phone within half a day. Apple honours this and Outlook honours the X- twin
 * below; GOOGLE HONOURS NEITHER — it re-fetches on a schedule of its own, often
 * 8–24 hours and sometimes days. That is Google's behaviour, not a bug in this
 * file, and it is why a same-day weather cancellation still belongs in the
 * newsletter and on Instagram rather than here.
 */
const REFRESH = "PT12H";

/**
 * Identifies the software that wrote the file (RFC 5545 §3.7.3). Required;
 * nothing displays it. Not an identity used for matching, so it is safe to
 * build from SITE.name.
 */
const PRODID = `-//${SITE.name}//plgcleanup.org calendar feed//EN`;

/**
 * An instant as a compact UTC stamp: "20260829T140000Z". The same one-liner as
 * googleCalendarUrl() in src/data/schedule.ts, deliberately, so the feed and
 * the one-shot link can never disagree about what a timestamp looks like.
 */
const stamp = (iso: string) => iso.replace(/[-:]|\.\d{3}/g, "");

/**
 * Escape one TEXT value (RFC 5545 §3.3.11). Exactly four characters are
 * special: a backslash, a semicolon, a comma, and a newline (which becomes a
 * literal "\n"). A COLON IS NOT ESCAPED, and neither is "&" — HTML habits are
 * wrong here, and escaping a colon corrupts every value that contains a URL.
 *
 * The order is load-bearing: backslashes are doubled FIRST, or the backslash
 * this function puts in front of a semicolon gets doubled a moment later.
 *
 * Two scrubs on the way past, both about strings this site happens to hold:
 *   • U+00A0 — src/data/schedule.ts puts a non-breaking space before "am"/"pm"
 *     so a time range can't wrap mid-range in a narrow column. That is a CSS
 *     concern with no meaning in a calendar app, where it renders as an odd
 *     glyph in a few clients.
 *   • control characters — not representable in TEXT at all, and there is no
 *     escape for them, so they are dropped rather than escaped.
 * Both live in here rather than at a call site, so a string somebody adds later
 * can't smuggle one through.
 */
const esc = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?|\n/g, "\n") // one line-ending form first, so the last rule catches them all
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

/** The UTF-8 size of one code point — the limit below is in OCTETS, not characters. */
const utf8Len = (cp: number) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);

/**
 * Fold one content line to 75 octets (RFC 5545 §3.1), continuing on the next
 * line after a CRLF and a single space. A reader "unfolds" by deleting every
 * CRLF-plus-one-whitespace, which restores the value exactly.
 *
 * Two traps, both live in this repo:
 *   • 75 OCTETS, not 75 characters. "Nostrand Ave & Empire Blvd" is ASCII, but
 *     the em dash in every SUMMARY is three octets on its own, so a character
 *     count would happily let a line run long.
 *   • "Multi-octet characters MUST remain contiguous" — a split in the middle
 *     of a UTF-8 sequence produces a replacement character, or a parse error,
 *     in every client. Hence for..of, which yields whole code points, and
 *     measuring each one before committing to it.
 *
 * A continuation line spends one of its 75 octets on that leading space, so it
 * carries one octet less of the value than the first line does.
 */
function fold(line: string) {
  const LIMIT = 75;
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  let budget = LIMIT;
  for (const ch of line) {
    const size = utf8Len(ch.codePointAt(0)!);
    if (bytes + size > budget) {
      out.push(current);
      current = "";
      bytes = 0;
      budget = LIMIT - 1; // the leading space the join below adds
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** One property whose value is TEXT (SUMMARY, LOCATION, DESCRIPTION, NAME…). */
const text = (name: string, value: string) => fold(`${name}:${esc(value)}`);

/**
 * One property whose value is NOT text — a URI, a timestamp, a duration, an
 * enumerated keyword. Folded but never escaped: a URL is of type URI, and
 * running one through esc() would turn every comma and semicolon in its query
 * string into a backslash pair that no client unescapes.
 */
const prop = (name: string, value: string) => fold(`${name}:${value}`);

/**
 * The identity of one cleanup, forever: its start instant, at this domain —
 * "20260829T140000Z@plgcleanup.org".
 *
 * The start is the right key because the build ALREADY guarantees it is unique:
 * src/data/schedule.ts refuses to build if two cleanups begin at the same
 * moment. So this needs no invariant of its own. And because the corner is not
 * part of it, correcting a corner UPDATES the event already sitting in a
 * subscriber's calendar instead of deleting one and adding another.
 *
 * The price, which is the deliberate trade: changing the TIME of an
 * already-published cleanup changes its identity, so subscribers see the old
 * entry disappear and a new one appear rather than an edit. Nothing important
 * is lost by that here — nobody registers and there is no RSVP — but an alarm
 * or a note someone had attached to the old entry goes with it.
 *
 * The host comes from `site` in astro.config.mjs rather than being typed out,
 * like every other URL here. If the domain ever moves, every UID changes once
 * and every subscriber re-adds every future cleanup — a one-off, and better
 * than a hardcoded domain nobody remembers to update.
 */
const uid = (cleanup: Cleanup) => `${stamp(cleanup.iso)}@${ORIGIN.host}`;

/**
 * Where everyone meets, as the one line a calendar app hands to a map. The city
 * and state come from SITE.schema.address so they aren't typed a second time.
 */
const location = (cleanup: Cleanup) =>
  [cleanup.corner, SITE.schema.address?.locality, SITE.schema.address?.region]
    .filter(Boolean)
    .join(", ");

/**
 * One cleanup as a VEVENT.
 *
 * Times are UTC ("…T140000Z") rather than a local time plus a VTIMEZONE block.
 * Both name the same instant, and the UTC form needs no timezone definition in
 * the file at all — which matters, because a hand-written VTIMEZONE is fifteen
 * lines of daylight-saving RRULEs that nobody here could maintain. What the UTC
 * form gives up is the WALL-CLOCK INTENT: it pins the moment, not "10 am
 * local", so if the United States ever changed its daylight-saving rules
 * between a build and a scheduled date, the entry would read an hour out. The
 * daily rebuild bounds that to 24 hours, because src/data/schedule.ts
 * recomputes every instant from the build machine's timezone database.
 *
 * That is only safe because every cleanup is its own explicit row. IF ANYONE
 * EVER ADDS A RECURRENCE RULE HERE, this decision has to be revisited: a
 * recurring UTC time drifts by an hour across every daylight-saving boundary.
 */
function vevent(cleanup: Cleanup, dtstamp: string) {
  return [
    "BEGIN:VEVENT",
    prop("UID", uid(cleanup)),
    // When this description of the event was written — build time. It is what a
    // strict client compares to decide that a corrected corner is newer than the
    // copy it already holds. SEQUENCE is deliberately absent: it is a revision
    // counter, there is nowhere in schedule.json to store a revision number, and
    // a constant 0 beside a moving DTSTAMP is exactly the case clients resolve
    // by DTSTAMP anyway.
    prop("DTSTAMP", dtstamp),
    prop("DTSTART", stamp(cleanup.iso)),
    prop("DTEND", stamp(cleanup.endIso)),
    text("SUMMARY", eventName(cleanup)),
    text("LOCATION", location(cleanup)),
    // The same sentence the Event structured data uses, from the same constant.
    text("DESCRIPTION", `${EVENT_DESCRIPTION}\n\nDetails: ${eventUrl(cleanup)}`),
    // /join for the next cleanup, /schedule for the ones after it — the same
    // rule the JSON-LD follows, for the same reason: /join only ever shows the
    // next date, so a tap on a cleanup three weeks out has to land on the list.
    prop("URL;VALUE=URI", eventUrl(cleanup)),
    prop("STATUS", "CONFIRMED"),
    // TRANSPARENT = does not make the subscriber look busy. This feed carries
    // every cleanup and most subscribers attend some of them, so marking all of
    // them busy would wreck the free/busy of anyone who subscribed. (The
    // one-click "Add to calendar" link in schedule.ts is the opposite case —
    // there somebody picked one date on purpose.)
    prop("TRANSP", "TRANSPARENT"),
    "END:VEVENT",
  ];
}

/**
 * Every cleanup handed in, as one .ics file.
 *
 * The caller must pass the objects out of src/data/schedule.ts unchanged —
 * eventUrl() recognises the next cleanup by object identity, so a mapped or
 * cloned list quietly sends every entry to /schedule.
 *
 * Deliberately NOT a scheduling message: there is no METHOD:PUBLISH here,
 * because RFC 5545 says a METHOD makes the file an iTIP message and RFC 5546
 * then requires an ORGANIZER — which makes some clients render a subscribed
 * cleanup as an invitation, complete with reply and decline buttons pointed at
 * a volunteer's inbox. A calendar with no METHOD is just a calendar.
 */
export function calendarFeed(cleanups: Cleanup[]) {
  // One timestamp for the whole file, read once: every event in this build was
  // written at the same moment, and asking the clock per event would be a lie
  // that also makes the output harder to diff.
  const dtstamp = stamp(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    prop("VERSION", "2.0"),
    text("PRODID", PRODID),
    // Optional — GREGORIAN is the default — but a few older parsers assume the
    // property is present.
    prop("CALSCALE", "GREGORIAN"),
    // The calendar's name in the subscriber's sidebar, twice. NAME is the
    // standard property (RFC 7986); X-WR-CALNAME is Apple's older extension,
    // and the one Google actually reads. They must always say the same thing.
    text("NAME", SITE.name),
    text("X-WR-CALNAME", SITE.name),
    text("DESCRIPTION", SITE.description),
    text("X-WR-CALDESC", SITE.description),
    // How often to re-check, twice again: RFC 7986 for Apple, Microsoft's
    // extension for Outlook. See the note on REFRESH above about Google.
    prop("REFRESH-INTERVAL;VALUE=DURATION", REFRESH),
    prop("X-PUBLISHED-TTL", REFRESH),
    // Where this file came from, so a copy of it can still find the original.
    prop("SOURCE;VALUE=URI", FEED_URL),
    ...cleanups.flatMap((cleanup) => vevent(cleanup, dtstamp)),
    "END:VCALENDAR",
  ];

  // CRLF between every line AND after the last one. RFC 5545 §3.1 ends every
  // content line with CRLF, the final END:VCALENDAR included — a file ending in
  // a bare LF, or in no line ending at all, is rejected by strict parsers and
  // silently truncated by lenient ones.
  return `${lines.join("\r\n")}\r\n`;
}

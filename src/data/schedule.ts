// ============================================================================
//  THE CLEANUP SCHEDULE
// ============================================================================
//
//  Every cleanup we have a date for lives in the "cleanups" list in
//  src/data/schedule.json — one row each: date, start time, end time, corner. Edit them the easy way in
//  Pages CMS (the "Schedule" form), or edit schedule.json directly on GitHub.
//
//  The site picks the next cleanup out of that list on its own: the first row
//  that hasn't finished yet becomes "the next cleanup" everywhere — the home
//  page button, the /join page, the map, the countdown. A rebuild every evening
//  (.github/workflows/site-checks.yml) rolls it forward, so nobody moves a date
//  after a cleanup happens. Add next month's rows and the rest follows.
//
//  /schedule lists the next few of them (src/pages/schedule.astro). Rows in the
//  past are ignored — delete them whenever you like.
//
//  Times are New York (Eastern); daylight saving is handled for you. If a date
//  or time is mistyped, the site refuses to build and names the row to fix, so
//  a typo can never go live.
//
//  Everything below is code that builds the site from those values — please
//  don't edit it.
// ============================================================================

import { z } from "astro/zod";
import scheduleData from "./schedule.json";

// Validate the editable values up front, so a missing or wrong-typed field fails
// the build with a clear message naming the field — the same safety net the
// content collections give the Markdown files.
const filled = (field: string) => z.string().trim().min(1, `${field} must not be empty.`);

const { cleanups: rows } = z
  .object({
    cleanups: z
      .array(
        z.object({
          date: filled("The cleanup date"),
          startTime: filled("The start time"),
          endTime: filled("The end time"),
          corner: filled("The street corner"),
        }),
        { error: 'src/data/schedule.json must hold a "cleanups" list, in [ … ] brackets.' },
      )
      .min(1, 'The schedule has no cleanups in it. Add one in the "Schedule" form.'),
  })
  .parse(scheduleData);

/** One cleanup: the four edited values, plus everything the pages show. */
export interface Cleanup {
  /** The day, "YYYY-MM-DD". */
  date: string;
  /** The street corner where everyone meets. */
  corner: string;
  /** Start and end as real instants. */
  start: Date;
  end: Date;
  /** The same two instants as ISO timestamps (UTC). */
  iso: string;
  endIso: string;
  /**
   * And as New York local time with an explicit offset
   * ("2026-08-09T14:00:00-04:00") instead of UTC ("…T18:00:00.000Z"). Both name
   * the identical moment, but Google's Event structured-data guidance asks for
   * the local form, because that is the wall-clock time it shows in search
   * results. Used only in the /join JSON-LD; everything else uses the UTC form.
   */
  isoLocal: string;
  endIsoLocal: string;
  /** The time as readers see it, e.g. "10–11 am" — built from the start/end. */
  time: string;
  /**
   * The same range as its two halves, "10" and "11 am". /schedule puts the dash
   * between them in a column of its own so every row's dash lines up.
   */
  timeFrom: string;
  timeTo: string;
  /** "Sunday, August 23, 2026" and "Sunday, August 23". */
  longDate: string;
  shortDate: string;
  /** The "Get directions" link — built from the corner. */
  mapsUrl: string;
  /**
   * The embeddable map (the iframe on /join) for the same corner. Uses Google's
   * keyless embed, which takes the search text directly — so it can never drift
   * from schedule.json the way a hand-pasted embed code did.
   */
  mapsEmbedUrl: string;
}

// Every cleanup is in Brooklyn, in New York (Eastern) time.
const CLEANUP_CITY = "Brooklyn, NY";
const TIME_ZONE = "America/New_York";

/** Turn one edited row into everything the pages need from it. */
function toCleanup(row: (typeof rows)[number]): Cleanup {
  const date = row.date.trim();
  const corner = row.corner.trim();
  // Name the row in every error, so a bad value in a list of twenty says which.
  const where = (field: string) => `${field} for the cleanup on "${date}"`;
  const start = easternDate(date, row.startTime, where("The start time"));
  const end = easternDate(date, row.endTime, where("The end time"));

  // Both times can be written correctly and still be in the wrong order ("2pm"
  // to "11am"). That shape passes every check above, so catch it here: otherwise
  // the page would read "2pm–11am" and the countdown would call the cleanup over
  // hours before it starts.
  if (end <= start) {
    throw new Error(
      `The cleanup on "${date}" starts at "${row.startTime}" and ends at "${row.endTime}", ` +
        `so it would end before it began. Check both times in the "Schedule" form.`,
    );
  }

  const time = formatTimeRange(start, end);

  /** The place everyone searches for, e.g. "Rogers Ave and Fenimore St, Brooklyn, NY". */
  const mapsQuery = `${corner.replace(/ & /g, " and ")}, ${CLEANUP_CITY}`;

  return {
    date,
    corner,
    start,
    end,
    iso: start.toISOString(),
    endIso: end.toISOString(),
    isoLocal: easternIsoString(start),
    endIsoLocal: easternIsoString(end),
    time: `${time.from}–${time.to}`,
    timeFrom: time.from,
    timeTo: time.to,
    longDate: formatDate(start, { year: "numeric" }),
    shortDate: formatDate(start),
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
    mapsEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`,
  };
}

/** Every cleanup in the file, earliest first. The order rows are typed in doesn't matter. */
const CLEANUPS: Cleanup[] = rows
  .map(toCleanup)
  .sort((a, b) => a.start.getTime() - b.start.getTime());

// Adding next month's rows by copying the last one is the fast way to do it, and
// forgetting to change one date is the fast way to get it wrong. Two cleanups
// starting at the same moment is that mistake every time, so refuse the build.
for (let i = 1; i < CLEANUPS.length; i++) {
  if (CLEANUPS[i].start.getTime() === CLEANUPS[i - 1].start.getTime()) {
    throw new Error(
      `The schedule lists two cleanups starting on "${CLEANUPS[i].date}" at the same time ` +
        `("${CLEANUPS[i - 1].corner}" and "${CLEANUPS[i].corner}"). Fix or remove one in the "Schedule" form.`,
    );
  }
}

/** The cleanups still to come, earliest first — what /schedule lists. */
export const UPCOMING_CLEANUPS: Cleanup[] = CLEANUPS.filter((c) => c.end > new Date());

/**
 * The one the whole site points at. Normally the next cleanup; if every row has
 * passed (nobody added the new dates), it's the most recent one, so the pages
 * still render while the countdown reads "past" and the audit script complains.
 */
export const NEXT_CLEANUP: Cleanup = UPCOMING_CLEANUPS[0] ?? CLEANUPS[CLEANUPS.length - 1];

/** Format one instant as a New York date, e.g. "Sunday, August 23". */
function formatDate(d: Date, extra: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    ...extra,
  }).format(d);
}

/** Read "2026-06-20" into its year, month, and day, or explain the mistake. */
function parseDate(value: string) {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m)
    throw new Error(`The cleanup date is "${value}". Write it like "2026-07-18" (year-month-day).`);
  const year = +m[1],
    month = +m[2],
    day = +m[3];
  // Shape alone isn't enough: JavaScript rolls impossible dates forward without
  // complaint, so "2026-13-45" would quietly become 14 February 2027 and ship a
  // perfectly plausible countdown to a date nobody chose. Round-trip it.
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  if (roundTrip.getUTCMonth() + 1 !== month || roundTrip.getUTCDate() !== day) {
    throw new Error(
      `The cleanup date is "${value}", which isn't a real date. Check the month (01–12) and the day.`,
    );
  }
  return { year, month, day };
}

/** Read "10:00am" / "2pm" into 24-hour hour+minute, or explain the mistake. */
function parseTime(value: string, field: string) {
  const m = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!m) throw new Error(`${field} is "${value}". Write it like "10:00am", "9:30am", or "2pm".`);
  let hour = +m[1];
  const minute = m[2] ? +m[2] : 0;
  if (hour < 1 || hour > 12 || minute > 59) {
    throw new Error(`${field} is "${value}". Use a 12-hour time like "10:00am" or "2:30pm".`);
  }
  if (m[3] === "am") hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  return { hour, minute };
}

/** Turn a New York wall-clock date + time into a real instant, DST and all. */
function easternDate(dateStr: string, timeStr: string, field: string) {
  const { year, month, day } = parseDate(dateStr);
  const { hour, minute } = parseTime(timeStr, field);
  // Guess the instant as if the wall time were UTC, then correct by New York's
  // offset at that moment — which is how we account for daylight saving.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const shown = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const get = (type: string) => +(shown.find((p) => p.type === type)?.value ?? "0");
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return new Date(guess.getTime() * 2 - asUTC);
}

/**
 * Write an instant as a New York local ISO string with its UTC offset, e.g.
 * "2026-08-09T14:00:00-04:00" (-05:00 in winter). Derived from the same
 * Intl round-trip easternDate() uses, so DST is handled identically.
 */
function easternIsoString(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  // en-CA renders midnight as hour "24"; normalize before both uses.
  const hour = String(+get("hour") % 24).padStart(2, "0");
  const wall = `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}`;
  // Offset = (that wall time read as if UTC) − (the real instant).
  const offsetMinutes = (Date.parse(`${wall}Z`) - d.getTime()) / 60_000;
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${wall}${sign}${hh}:${mm}`;
}

/** Read the hour, minute, and am/pm of an instant as it reads in New York. */
function etClockParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { hour: get("hour"), minute: get("minute"), period: get("dayPeriod").toLowerCase() };
}

/** Format one clock time, dropping ":00": "10", "9:30". */
function formatClock(p: { hour: string; minute: string }) {
  return p.minute === "00" ? p.hour : `${p.hour}:${p.minute}`;
}

/**
 * Split a start–end range into its two halves: "10" and "11 am", or "10 am" and
 * "2 pm" when the two straddle noon and the start's am/pm can't be left implied.
 * Halves rather than one string so /schedule can column the dash; /join joins
 * them back up.
 *
 * The space before am/pm is a non-breaking one — "11" and "am" belong on the
 * same line however narrow the column holding them gets.
 */
function formatTimeRange(start: Date, end: Date) {
  const s = etClockParts(start);
  const e = etClockParts(end);
  return {
    from: s.period === e.period ? formatClock(s) : `${formatClock(s)}\u00a0${s.period}`,
    to: `${formatClock(e)}\u00a0${e.period}`,
  };
}

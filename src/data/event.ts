// ============================================================================
//  EVENT DETAILS
// ============================================================================
//
//  The facts about the next cleanup — date, time, and place — live in
//  src/data/event.json. Edit them the easy way in Pages CMS (the "Event details"
//  form), or edit event.json directly on GitHub. The on-screen time and the
//  "Get directions" map link rebuild themselves from those values.
//  (Running totals like pounds collected and volunteers live in src/data/stats.ts.)
//
//  Times are New York (Eastern); daylight saving is handled for you. If a date
//  or time is mistyped, the site refuses to build and names the field to fix, so
//  a typo can never go live.
//
//  Everything below is code that builds the site from those values — please
//  don't edit it.
// ============================================================================

import { z } from "astro/zod";
import eventData from "./event.json";

// Validate the editable values up front, so a missing or wrong-typed field fails
// the build with a clear message naming the field — the same safety net the
// content collections give the Markdown files.
const filled = (field: string) => z.string().trim().min(1, `${field} must not be empty.`);

const event = z
  .object({
    date: filled("The cleanup date"),
    startTime: filled("The start time"),
    endTime: filled("The end time"),
    corner: filled("The street corner"),
  })
  .parse(eventData);

/** The day of the cleanup, "YYYY-MM-DD". */
export const CLEANUP_DATE = event.date;

/** The start and end times, written the friendly way ("10:00am", "2pm"). */
export const CLEANUP_START_TIME = event.startTime;
export const CLEANUP_END_TIME = event.endTime;

/** The street corner where everyone meets. */
export const CLEANUP_CORNER = event.corner;

// Every cleanup is in Brooklyn, in New York (Eastern) time.
const CLEANUP_CITY = "Brooklyn, NY";
const TIME_ZONE = "America/New_York";

/** The start and end as full timestamps, inferred from the date + times above. */
const START_DATE = easternDate(CLEANUP_DATE, CLEANUP_START_TIME, "The start time");
const END_DATE = easternDate(CLEANUP_DATE, CLEANUP_END_TIME, "The end time");

/** Standard ISO timestamps other parts of the site read. */
export const CLEANUP_ISO = START_DATE.toISOString();
export const CLEANUP_END_ISO = END_DATE.toISOString();

/** The time as readers see it, e.g. "10–11am" — built from the start/end. */
export const CLEANUP_TIME = formatTimeRange(START_DATE, END_DATE);

/** The "Get directions" link — built from the corner and city. */
export const CLEANUP_MAPS_URL = buildMapsUrl(CLEANUP_CORNER, CLEANUP_CITY);

/** Read "2026-06-20" into its year, month, and day, or explain the mistake. */
function parseDate(value: string) {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m)
    throw new Error(`The cleanup date is "${value}". Write it like "2026-07-18" (year-month-day).`);
  return { year: +m[1], month: +m[2], day: +m[3] };
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

/** Format a start–end range as "10–11am", hiding a repeated am/pm on the start. */
function formatTimeRange(start: Date, end: Date) {
  const s = etClockParts(start);
  const e = etClockParts(end);
  const startStr = s.period === e.period ? formatClock(s) : `${formatClock(s)}${s.period}`;
  return `${startStr}–${formatClock(e)}${e.period}`;
}

/** Build a Google Maps search link for a corner, e.g. "A & B" → "A and B, City". */
function buildMapsUrl(corner: string, city: string) {
  const query = encodeURIComponent(`${corner.replace(/ & /g, " and ")}, ${city}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

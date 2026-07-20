// ============================================================================
//  EVENT DETAILS — edit this file to change the cleanup date, time, and place
// ============================================================================
//
//  This file holds every fact about the next cleanup. Change a value in the
//  "EDIT THESE" section below and the whole website updates — the on-screen
//  time, the "Get directions" map link, and the "Add to calendar" link all
//  rebuild themselves. You never edit a web link, a time zone, or a date code
//  by hand.
//
//  Everything happens in New York (Eastern) time. Daylight saving is handled
//  for you — you never type a time zone.
//
//  ── How to edit on GitHub (no software needed) ──────────────────────────────
//    1. Click the pencil icon (top-right of this file) to start editing.
//    2. Change ONLY the text inside the "quotes" or the number after the `=`.
//    3. Keep every quote, comma, and semicolon exactly where it is.
//    4. Scroll down, click "Commit changes", and write a short note like
//       "Update cleanup to July 18". The site rebuilds on its own.
//
//    If you mistype a date or time, the site refuses to build and shows a
//    message telling you which line to fix — so a typo can never go live.
//
//  ── The one rule ────────────────────────────────────────────────────────────
//    Text sits inside "quotes". Numbers have no quotes. Match what you see.
//      Right:  "10:00am"     Right:  327
//      Wrong:  10:00am       Wrong:  "327"
//
// ============================================================================
//  EDIT THESE
// ============================================================================

// The day of the cleanup, written year-month-day.
//   Example: "2026-07-18"  means July 18, 2026.
export const CLEANUP_DATE = "2026-06-20";

// The start and end times. Write them the friendly way, with "am" or "pm".
//   Examples: "10:00am"   "9:30am"   "2pm"   "2:30pm"
export const CLEANUP_START_TIME = "10:00am";
export const CLEANUP_END_TIME   = "11:00am";

// The street corner where everyone meets. Write it the way you'd say it aloud.
//   Example: "Clarkson Ave & Bedford Ave"
export const CLEANUP_CORNER = "Clarkson Ave & Bedford Ave";

// The event name, as it appears in someone's calendar after they add it.
export const CLEANUP_TITLE = "Community Cleanup PLG";

// The note that fills the calendar entry. One sentence or two.
export const CLEANUP_DETAILS =
  "No registration, all supplies included. Just show up! https://plgcleanup.org";

// How many people subscribe to updates. A plain number, no quotes.
export const SUBSCRIBER_COUNT = 327;

// How many volunteers have joined so far. A plain number, no quotes.
export const VOLUNTEER_COUNT = 876;


// ============================================================================
//  Everything below is code that builds the site from the values above.
//  Please don't edit it.
// ============================================================================

// Every cleanup is in Brooklyn, in New York (Eastern) time.
const CLEANUP_CITY = "Brooklyn, NY";
const TIME_ZONE = "America/New_York";

/** The start and end as full timestamps, inferred from the date + times above. */
const START_DATE = easternDate(CLEANUP_DATE, CLEANUP_START_TIME, "CLEANUP_START_TIME");
const END_DATE   = easternDate(CLEANUP_DATE, CLEANUP_END_TIME,   "CLEANUP_END_TIME");

/** Standard ISO timestamps other parts of the site read. */
export const CLEANUP_ISO     = START_DATE.toISOString();
export const CLEANUP_END_ISO = END_DATE.toISOString();

/** The time as readers see it, e.g. "10–11am" — built from the start/end. */
export const CLEANUP_TIME = formatTimeRange(START_DATE, END_DATE);

/** The "Get directions" link — built from the corner and city. */
export const CLEANUP_MAPS_URL = buildMapsUrl(CLEANUP_CORNER, CLEANUP_CITY);

/** The "Add to calendar" link — built from the date, place, and details. */
export const CLEANUP_CALENDAR_URL = buildCalendarUrl();

/** Read "2026-06-20" into its year, month, and day, or explain the mistake. */
function parseDate(value: string) {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`CLEANUP_DATE is "${value}". Write it like "2026-07-18" (year-month-day).`);
  return { year: +m[1], month: +m[2], day: +m[3] };
}

/** Read "10:00am" / "2pm" into 24-hour hour+minute, or explain the mistake. */
function parseTime(value: string, field: string) {
  const m = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
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
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
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

/** Stamp an instant as Google Calendar wants it: "YYYYMMDDThhmmss" in New York. */
function etCalendarStamp(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour"); // some engines return "24" at midnight
  return `${get("year")}${get("month")}${get("day")}T${hour}${get("minute")}${get("second")}`;
}

/** Build the "Add to calendar" link from the values above. */
function buildCalendarUrl() {
  const dates = `${etCalendarStamp(START_DATE)}/${etCalendarStamp(END_DATE)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: CLEANUP_TITLE,
    ctz: TIME_ZONE,
    location: `${CLEANUP_CORNER}, ${CLEANUP_CITY}`,
    details: CLEANUP_DETAILS,
  });
  // Append dates unencoded so the "/" between start and end survives.
  return `https://calendar.google.com/calendar/render?${params}&dates=${dates}`;
}

/** Parse a Date into year/month/day parts in America/New_York. */
export function etDateParts(d: Date) {
  // en-CA locale reliably produces YYYY-MM-DD
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = s.split("-").map(Number);
  return { y, m, day };
}

// TODO: add comments, definitions & examples 
// TODO: infer CLEANUP_TIME from ISO format (and simplify date entry)
// TODO: infer maps URL from intersection
export const CLEANUP_ISO     = "2026-06-20T10:00:00-04:00";
export const CLEANUP_END_ISO = "2026-06-20T11:00:00-04:00";
export const CLEANUP_TIME    = "10–11am";
export const CLEANUP_CORNER = "Clarkson Ave & Bedford Ave";
export const CLEANUP_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Clarkson%20Ave%20and%20Bedford%20Ave%2C%20Brooklyn%2C%20NY";
export const CLEANUP_CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Community+Cleanup+PLG&dates=20260620T100000/20260620T110000&ctz=America%2FNew_York&location=Clarkson+Ave+%26+Bedford+Ave%2C+Brooklyn%2C+NY&details=No+registration%2C+all+supplies+included.+Just+show+up%21+https%3A%2F%2Fplgcleanup.org";
export const SUBSCRIBER_COUNT = 327;
export const VOLUNTEER_COUNT = 876;

/** Parse a Date into year/month/day parts in America/New_York. */
export function etDateParts(d: Date) {
  // en-CA locale reliably produces YYYY-MM-DD
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = s.split("-").map(Number);
  return { y, m, day };
}

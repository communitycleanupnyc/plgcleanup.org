// Countdown logic + copy for the "next cleanup is …" line on the home page and
// /join. Pure and self-contained (no imports) so the SAME code runs at build time
// in .astro frontmatter AND in the browser via src/lib/countdown.client.ts, which
// recomputes it on load so the wording never goes stale between deploys. Keeping
// this file dependency-free is deliberate: it must not pull event.ts/zod into the
// client bundle.

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

const TIME_ZONE = "America/New_York";

export type CountdownState =
  | { tag: "past" }
  | { tag: "now" }
  | { tag: "minutes"; n: number }
  | { tag: "hours"; n: number }
  | { tag: "tomorrow" }
  | { tag: "this-weekend"; dayName: string }
  | { tag: "next-weekend"; dayName: string }
  | { tag: "days"; n: number; word: string };

/** Parse a Date into year/month/day parts in America/New_York. */
function etDateParts(d: Date) {
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

/**
 * Classify how far off the cleanup is, given the current instant and the event's
 * start/end ISO timestamps. All day math is done in New York (Eastern) time.
 */
export function computeCountdown(now: Date, startIso: string, endIso: string): CountdownState {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const nowMs = now.getTime();

  if (nowMs >= startMs && nowMs < endMs) return { tag: "now" };
  if (nowMs >= endMs) return { tag: "past" };

  // Cleanup is in the future. Check if it's the same calendar day in ET.
  const cleanupParts = etDateParts(new Date(startIso));
  const nowParts = etDateParts(now);
  const isSameDay =
    cleanupParts.y === nowParts.y &&
    cleanupParts.m === nowParts.m &&
    cleanupParts.day === nowParts.day;

  if (isSameDay) {
    const minsUntil = Math.ceil((startMs - nowMs) / 60_000);
    if (minsUntil <= 60) return { tag: "minutes", n: minsUntil };
    return { tag: "hours", n: Math.round(minsUntil / 60) };
  }

  // Day-level labels
  const todayMs = Date.UTC(nowParts.y, nowParts.m - 1, nowParts.day);
  const cleanupDayMs = Date.UTC(cleanupParts.y, cleanupParts.m - 1, cleanupParts.day);
  const N = Math.round((cleanupDayMs - todayMs) / 86_400_000);

  if (N === 1) return { tag: "tomorrow" };

  const todayDow = new Date(todayMs).getUTCDay();
  const thisSatMs = todayMs + ((6 - todayDow + 7) % 7) * 86_400_000;
  const nextSatMs = thisSatMs + 7 * 86_400_000;

  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
  }).format(new Date(startIso));
  if (cleanupDayMs === thisSatMs) return { tag: "this-weekend", dayName };
  if (cleanupDayMs === nextSatMs) return { tag: "next-weekend", dayName };

  const word = N >= 0 && N < NUMBER_WORDS.length ? NUMBER_WORDS[N] : String(N);
  return { tag: "days", n: N, word };
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

// Home hero sentence. Contains a link, so it's rendered with set:html; the browser
// updater re-writes it via innerHTML.
const HOME_SUFFIX = ". Want to see why people love volunteering with us?";
export function renderHomeCountdown(state: CountdownState): string {
  const lead = (inner: string) => `The next cleanup is ${inner}${HOME_SUFFIX}`;
  const link = (text: string) => `<a href="/join">${text}</a>`;
  switch (state.tag) {
    case "past":
      return `Each cleanup is only an hour${HOME_SUFFIX}`;
    case "now":
      return lead(link("happening right now"));
    case "minutes":
      return lead(`in ${link(plural(state.n, "minute"))}`);
    case "hours":
      return lead(`in ${link(plural(state.n, "hour"))}`);
    case "tomorrow":
      return lead(link("tomorrow"));
    case "this-weekend":
      return lead(link(`this ${state.dayName}`));
    case "next-weekend":
      return lead(link(`next ${state.dayName}`));
    case "days":
      return lead(`in ${link(`${state.word} days`)}`);
  }
}

// /join line — plain text. "" means "show nothing" (the cleanup has passed).
export function renderJoinCountdown(state: CountdownState): string {
  switch (state.tag) {
    case "past":
      return "";
    case "now":
      return "Is happening right now!";
    case "minutes":
      return `Is starting in ${plural(state.n, "minute")}!`;
    case "hours":
      return `Is starting in ${plural(state.n, "hour")}!`;
    case "tomorrow":
      return "is tomorrow!";
    case "this-weekend":
      return `Is this ${state.dayName}!`;
    case "next-weekend":
      return `Is next ${state.dayName}.`;
    case "days":
      return `That's in ${state.word} days.`;
  }
}

// Home call-to-action button label — plain text.
export function renderCtaLabel(state: CountdownState): string {
  switch (state.tag) {
    case "past":
      return "Join us this weekend";
    case "now":
    case "minutes":
    case "hours":
      return "Join us today";
    case "tomorrow":
      return "Join us tomorrow";
    case "this-weekend":
      return `Join us this ${state.dayName}`;
    case "next-weekend":
      return `Join us next ${state.dayName}`;
    case "days":
      return `Join us in ${state.word} days`;
  }
}

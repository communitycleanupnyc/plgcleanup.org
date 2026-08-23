// Countdown logic + copy for the "next cleanup is …" line on the home page and
// /join. Pure and self-contained (no imports) so the SAME code runs at build time
// in .astro frontmatter AND in the browser via src/lib/countdown.client.ts, which
// recomputes it on load so the wording never goes stale between deploys. Keeping
// this file dependency-free is deliberate: it must not pull schedule.ts or zod
// into the client bundle.

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
  | {
      tag: "days";
      n: number;
      word: string;
      // The cleanup's calendar date, used once n is over a week and we switch from
      // "in N days" to a concrete date ("the 15th" / "the 15th of September").
      dayOfMonth: number;
      monthName: string;
      sameMonth: boolean; // cleanup lands in the visitor's current month
    };

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

  // Cleanups run on either weekend day, so "this weekend" can't be a single-day
  // comparison against Saturday — that silently drops every Sunday cleanup down
  // to the generic "in five days" copy. Map each day onto the Saturday of its
  // weekend instead, and compare weekends.
  //
  // The two directions differ, and that is the whole trick. A cleanup on a
  // Sunday belongs to the weekend that started the day before it. A VISITOR on a
  // Sunday has that weekend behind them: the weekend they mean by "this" is the
  // one coming up. So the cleanup looks back and the visitor always looks
  // forward. Reading the visitor backwards too is what made the Saturday six
  // days away read as "next Saturday" to anyone who opened the site on a Sunday.
  const cleanupWeekend = (dayMs: number) => {
    const dow = new Date(dayMs).getUTCDay();
    return dow === 0 ? dayMs - 86_400_000 : dayMs + (6 - dow) * 86_400_000;
  };
  const comingSaturday = (dayMs: number) => {
    const dow = new Date(dayMs).getUTCDay();
    return dayMs + ((6 - dow) % 7) * 86_400_000;
  };
  const thisWeekendMs = comingSaturday(todayMs);
  const nextWeekendMs = thisWeekendMs + 7 * 86_400_000;
  const cleanupWeekendMs = cleanupWeekend(cleanupDayMs);

  // Exactly a week out lands on the same weekday the visitor is reading on, and
  // "this Sunday" heard on a Sunday means today. Skip the weekday wording and
  // let the "in a week" line below say it plainly.
  if (N !== 7) {
    const dayName = new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      weekday: "long",
    }).format(new Date(startIso));
    if (cleanupWeekendMs === thisWeekendMs) return { tag: "this-weekend", dayName };
    if (cleanupWeekendMs === nextWeekendMs) return { tag: "next-weekend", dayName };
  }

  const word = N >= 0 && N < NUMBER_WORDS.length ? NUMBER_WORDS[N] : String(N);
  const monthName = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "long",
  }).format(new Date(startIso));
  const sameMonth = cleanupParts.y === nowParts.y && cleanupParts.m === nowParts.m;
  return { tag: "days", n: N, word, dayOfMonth: cleanupParts.day, monthName, sameMonth };
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 22 → "22nd", … */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// The date phrase used when the cleanup is more than a week out: "the 15th" in the
// current month, or "the 15th of September" once it crosses into a later month.
function onDate(state: Extract<CountdownState, { tag: "days" }>): string {
  const day = `the ${ordinal(state.dayOfMonth)}`;
  return state.sameMonth ? day : `${day} of ${state.monthName}`;
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
      return "Is tomorrow!";
    case "this-weekend":
      return `Is this ${state.dayName}!`;
    case "next-weekend":
      return `Is next ${state.dayName}.`;
    case "days":
      if (state.n === 7) return "That's in a week.";
      if (state.n > 7) return `That's on ${onDate(state)}.`;
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
      if (state.n === 7) return "Join us in a week";
      if (state.n > 7) return `Join us on ${onDate(state)}`;
      return `Join us in ${state.word} days`;
  }
}

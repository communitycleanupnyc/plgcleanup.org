import { CLEANUP_ISO, CLEANUP_END_ISO, etDateParts } from "./event";

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four",
  "five", "six", "seven", "eight", "nine",
];

export type CountdownState =
  | { tag: "past" }
  | { tag: "now" }
  | { tag: "minutes"; n: number }
  | { tag: "hours"; n: number }
  | { tag: "tomorrow" }
  | { tag: "this-weekend"; dayName: string }
  | { tag: "next-weekend"; dayName: string }
  | { tag: "days"; n: number; word: string };

export function getCountdown(now: Date): CountdownState {
  const startMs = new Date(CLEANUP_ISO).getTime();
  const endMs   = new Date(CLEANUP_END_ISO).getTime();
  const nowMs   = now.getTime();

  if (nowMs >= startMs && nowMs < endMs) return { tag: "now" };
  if (nowMs >= endMs)                    return { tag: "past" };

  // Cleanup is in the future. Check if it's the same calendar day in ET.
  const cleanupParts = etDateParts(new Date(CLEANUP_ISO));
  const nowParts     = etDateParts(now);
  const isSameDay    =
    cleanupParts.y   === nowParts.y &&
    cleanupParts.m   === nowParts.m &&
    cleanupParts.day === nowParts.day;

  if (isSameDay) {
    const minsUntil = Math.ceil((startMs - nowMs) / 60_000);
    if (minsUntil <= 60) return { tag: "minutes", n: minsUntil };
    return { tag: "hours", n: Math.round(minsUntil / 60) };
  }

  // Day-level labels
  const todayMs      = Date.UTC(nowParts.y, nowParts.m - 1, nowParts.day);
  const cleanupDayMs = Date.UTC(cleanupParts.y, cleanupParts.m - 1, cleanupParts.day);
  const N            = Math.round((cleanupDayMs - todayMs) / 86_400_000);

  if (N === 1) return { tag: "tomorrow" };

  const todayDow   = new Date(todayMs).getUTCDay();
  const thisSatMs  = todayMs + ((6 - todayDow + 7) % 7) * 86_400_000;
  const nextSatMs  = thisSatMs + 7 * 86_400_000;

  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(new Date(CLEANUP_ISO));
  if (cleanupDayMs === thisSatMs) return { tag: "this-weekend", dayName };
  if (cleanupDayMs === nextSatMs) return { tag: "next-weekend", dayName };

  const word = N >= 0 && N < NUMBER_WORDS.length ? NUMBER_WORDS[N] : String(N);
  return { tag: "days", n: N, word };
}

// ============================================================================
//  SITE STATISTICS
// ============================================================================
//
//  The running totals shown around the site — pounds of trash collected and how
//  many volunteers have joined. Edit them the easy way in Pages CMS (the
//  "Statistics" form), or edit src/data/stats.json directly on GitHub.
//
//  Enter plain numbers, no quotes and no commas (write 2972.55, not "2,972.55").
//  The comma formatting is added for you. A non-number fails the build with a
//  message naming the field, so a typo can never go live.
// ============================================================================

import { z } from "astro/zod";
import statsData from "./stats.json";

const stats = z
  .object({
    poundsCollected: z
      .number({
        error: "Pounds collected must be a plain number, e.g. 2972.55 (no quotes or commas).",
      })
      .nonnegative(),
    volunteerCount: z
      .number({ error: "The volunteer count must be a plain number, e.g. 876 (no quotes)." })
      .int()
      .nonnegative(),
  })
  .parse(statsData);

/** Total pounds of trash collected this year, e.g. 2972.55. */
export const POUNDS_COLLECTED = stats.poundsCollected;

/** Pounds with thousands separators for display, e.g. "2,972.55". */
export const POUNDS_COLLECTED_DISPLAY = stats.poundsCollected.toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** How many volunteers have joined so far. */
export const VOLUNTEER_COUNT = stats.volunteerCount;

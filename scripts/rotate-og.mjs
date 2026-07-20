// Advance the social-share "shuffle bag".
//
// Sampling technique: keep a randomly-ordered permutation of every testimonial
// (the "bag") plus a cursor. Each rotation advances the cursor by one, so every
// volunteer is featured exactly once before anyone repeats. Only when the bag is
// exhausted (or the roster changes) do we draw a *new* random order. This is the
// canonical shuffle-bag / shuffled-deck approach — uniform coverage per cycle,
// with a fresh random cycle sampled after the previous one is used up.
//
// State lives in src/data/og-cycle.json (committed) because a static build can't
// persist anything itself. Run via `npm run rotate-og`, or the rotate-og GitHub
// Action (scheduled + manual). src/lib/og.ts reads `featured` at build time.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const testimonialsDir = join(root, "src/content/testimonials");
const statePath = join(root, "src/data/og-cycle.json");

// The roster: collection entry ids (filename without .md), sorted for stable
// set-comparison. Order in the bag is randomized separately below.
const roster = readdirSync(testimonialsDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.slice(0, -3))
  .sort();

if (roster.length === 0) {
  console.error("rotate-og: no testimonials found — nothing to rotate.");
  process.exit(0);
}

// Fisher–Yates: uniform random permutation.
function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let order = [];
let index = -1;
if (existsSync(statePath)) {
  try {
    ({ order = [], index = -1 } = JSON.parse(readFileSync(statePath, "utf8")));
  } catch {
    // Corrupt state → treat as empty and reshuffle below.
  }
}

const sameRoster = order.length === roster.length && roster.every((id) => order.includes(id));

index += 1;
if (!sameRoster || index >= order.length) {
  // Bag exhausted (or roster changed): draw a new random cycle.
  order = shuffle(roster);
  index = 0;
}

const featured = order[index];
writeFileSync(statePath, JSON.stringify({ featured, index, order }, null, 2) + "\n");
console.log(`rotate-og: featured ${featured} (${index + 1}/${order.length})`);

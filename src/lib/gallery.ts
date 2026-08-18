import { getCollection, type CollectionEntry } from "astro:content";
import { SITE } from "../site.config";

// The gallery's display order, and which photo leads it.
//
// Whatever leads here is BOTH the first carousel slide on the homepage and the
// Open Graph image — the picture WhatsApp, iMessage, Facebook, Slack and the
// rest show in a link preview (see og.ts, rendered by Base.astro). One decision,
// made once, so the share preview always matches the top of the page.
//
// `features.rotateGallery` (src/site.config.ts) is the single switch:
//
//   off → the order authored in each Markdown file's `order` field; the
//         lowest-`order` photo leads. Nothing ever moves, link previews are
//         stable forever.
//   on  → the lead photo takes a fair turn (below), and the rest of the carousel
//         is dealt a fresh random order on every build.

// ── How "fair" works ────────────────────────────────────────────────────────
// A static build has no memory of the build before it, so a plain
// `Math.random()` lead can feature the same person twice running and leave
// someone else out for months. What replaces that memory here is the calendar:
//
//   cycle = floor(day / N)   → a new cycle every N days, N = number of photos
//   slot  = day % N          → which position of this cycle's order leads today
//
// Each cycle deals its own Fisher–Yates shuffle from a PRNG seeded with the
// cycle number, so every build inside a cycle computes the same running order
// without storing anything, and each new cycle deals a different one. Over N
// consecutive days every photo leads exactly once; on the day the cycle rolls
// over, the deck is reshuffled and the next round starts from scratch. It is a
// shuffle bag, dealt by the calendar instead of by saved state.
//
// The tradeoff: two builds on the SAME UTC DAY lead with the same photo (they
// have the same `day`). What turns the crank is the daily Cloudflare redeploy in
// .github/workflows/site-checks.yml — while that cron is paused (pre-launch,
// see LAUNCH.md A.3) the lead only moves when a push lands on a new UTC day.
// The carousel order below the lead still changes on every single build.
//
// Adding or removing a photo changes N, which shifts the cycle boundaries and
// deals a different order. That is fine — it self-corrects within one cycle,
// and everyone still gets exactly one turn per cycle from then on.

const DAY_MS = 86_400_000;

/**
 * mulberry32 — a tiny deterministic PRNG. Same seed in, same sequence out, on
 * any machine and any Node version, which is what makes a cycle's order
 * reproducible across the builds that happen inside it. `Math.random()` can't do
 * that: it is seeded unpredictably per process.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates: a uniform random permutation. Copies; never mutates the input. */
function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type GalleryEntry = CollectionEntry<"gallery">;

/**
 * One cycle's raw deal, decided by the cycle number alone — so every build inside
 * a cycle agrees, and any past or future cycle can be recomputed from arithmetic
 * instead of from stored state.
 */
function rawDeal(entries: readonly GalleryEntry[], cycle: number): GalleryEntry[] {
  // The multiply is a cheap hash of the cycle number. Cycles are consecutive
  // integers and mulberry32 seeded with 5 vs 6 opens with similar-looking
  // numbers; scattering them first keeps consecutive cycles unrelated.
  return shuffle(entries, mulberry32(Math.imul(cycle + 1, 0x9e3779b1)));
}

/** One cycle's deal, with the seam between cycles closed. */
function deal(entries: readonly GalleryEntry[], cycle: number): GalleryEntry[] {
  const deck = rawDeal(entries, cycle);
  // Turn-taking leaves one seam: whoever led the LAST day of the previous cycle
  // can be dealt the FIRST day of this one, and so lead two days running while
  // everyone else waits a full round. The previous cycle is just as recomputable
  // as this one, so look — no state — and swap the first two if that is about to
  // happen. Swapping preserves the permutation, so every photo still leads
  // exactly once per cycle, and every build in the cycle sees the same swap.
  //
  // `rawDeal` is the right thing to compare against: the swap only ever touches
  // positions 0 and 1, so for three photos or more the previous cycle's LAST
  // entry is the same either way. Below three, one deck is the whole rotation
  // and there is no seam worth closing — skip it rather than chase the tail.
  if (deck.length > 2) {
    const previousLead = rawDeal(entries, cycle - 1).at(-1);
    if (deck[0] === previousLead) [deck[0], deck[1]] = [deck[1], deck[0]];
  }
  return deck;
}

/** This build's running order: the day's lead photo, then everyone else, shuffled. */
function rotate(entries: readonly GalleryEntry[], now: number): GalleryEntry[] {
  const n = entries.length;
  const day = Math.floor(now / DAY_MS); // whole days since the epoch, UTC
  const cycle = Math.floor(day / n);
  const slot = day % n;
  const deck = deal(entries, cycle);
  const lead = deck[slot];
  // Everyone else is reshuffled with plain `Math.random()` — unseeded, so the
  // carousel looks freshly dealt on every deploy even on a day whose lead photo
  // is already decided.
  return [lead, ...shuffle(deck.filter((entry) => entry !== lead))];
}

const gallery = await getCollection("gallery");
// Base.astro builds the share image on every page, so an empty collection
// wouldn't fail one page — it would crash the whole build with a bare "cannot
// read image of undefined". Say what actually needs doing instead.
if (gallery.length === 0) {
  throw new Error(
    "[gallery] The homepage carousel and the social share image are built from gallery photos, but src/content/gallery/ is empty. Add at least one item.",
  );
}

const byOrder = [...gallery].sort((a, b) => a.data.order - b.data.order);

/** Every gallery item, in the order this build shows them. */
export const galleryOrder: GalleryEntry[] = SITE.features.rotateGallery
  ? rotate(byOrder, Date.now())
  : byOrder;

/** The lead photo: first carousel slide, and the social share image. */
export const lead: GalleryEntry = galleryOrder[0];

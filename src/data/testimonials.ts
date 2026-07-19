export interface TestimonialData {
  file: string;
  name: string;
  quote: string;
  /**
   * Full testimonial shown in the reveal panel.
   *
   * Formatting: just type. A blank line starts a new paragraph and a single
   * newline is a line break — no <br> or <p> tags needed. For links, write
   * <a href="https://…">label</a>; they render underlined and open in a new tab
   * automatically (target/rel are injected at render time — don't add them here).
   *
   * Use backticks `…` (not quotes) for any body with line breaks, links, or
   * apostrophes, so real newlines and double-quoted href="…" work without escaping.
   */
  body: string;
  alt: string;
  focusPosition?: string;
}

// Order === display order. Index 1 (the 2nd entry) is the default highlight.
// Images go in src/assets/testimonials/ — short-side ≥ 1400px recommended.
export const testimonials: TestimonialData[] = [
  { file: "abby.jpg", name: "Abby …", quote: "Not gonna lie", body: "Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out. Not going to stand here and pretend this is any more than it is. Just hang out.", alt: "…" },
  {
    file: "jaan.jpg", name: "Jaan", quote: "Trash club helped my mental health", body: `When I first moved here, I didn't know anyone and was experiencing depression. I forced myself to return week after week, and thanks to everyone being so open and welcoming I started to be invited to other social clubs (this neighborhood also has a walking club, film club, article club, knitting club, book clubs, and more - just ask at a cleanup!). Things slowly improved, even if I felt awkward at first and wasn't sure how to contribute or socialize - people were so welcoming.

    This community has been integral for me, so even though picking up trash can feel futile, the social zeitgeber it provides is invaluable. A friend shared a zen koan with me, when I told them no matter how hard we try the trash will return again and again: just as in meditation your breath stays with you, the trash returns.

    A monk asked Master Joshu, 'how can I become enlightened'?
    Master Joshu said: 'Well, have you eaten your gruel?'
    The monk said: 'Yes'.
    Master Joshu said: 'And then wash your bowl'.

    Apocryphally, the monk then becomes enlightened, as we might hope to become as we return, time and time again, to the rhythmic process of sanitation. We are made of spacedust, as is trash, so we are trash, and as a garbage man all I can say is 'from trash to trash, dust to dust'.

    In short, there's a reason this trash club is listed on <a href="https://www.socialfabric.nyc/">Social Fabric NYC</a> as a 'portal' of sorts through which you can become connected to other communities. It is about deep hanging out, doing the very human thing of futile goal directed activity, virtue signaling to ourselves and neighbors - which can create long term change in society, and indeed having fun and making meaning along the way through the connections we form. Recommended, would 100% be trashy again in every timeline. These are the kinds of people you want to get uploaded with.`, alt: "help me"
  },
  { file: "albert.jpg", name: "Albert …", quote: "…", body: "…", alt: "…" },
  { file: "chelsie.jpg", name: "Albert …", quote: "…", body: "…", alt: "…" },
  { file: "crosby.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "eddie.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "elana.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "hannah.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "isaiah.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "jess.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "kevin.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "mariana.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "megan.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "michelle.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "molly.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "rachael.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "shravan.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "spencer.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
];

// Site settings — flip a value here and rebuild to change site-wide behavior.
// (Edit on GitHub: change `false` to `true` or back, then commit. The site
// rebuilds on its own.)

/**
 * Shuffle the testimonial carousel into a new random order on every build.
 *
 *   false  (default) — testimonials appear in the `order` set in each file
 *                      (src/content/testimonials/*.md), smallest first.
 *   true             — the order is randomized fresh on each rebuild, so the
 *                      carousel leads with a different volunteer each deploy.
 */
export const RANDOMIZE_TESTIMONIALS = false;

/**
 * Feature a random volunteer photo in the social share (Open Graph) image —
 * the picture that shows in link previews on iMessage, WhatsApp, SMS, etc.
 *
 *   false  (default) — the share image is the first testimonial in carousel
 *                      order (the one with the lowest `order`), so link
 *                      previews stay stable from build to build.
 *   true             — a random volunteer is chosen fresh on every build.
 */
export const RANDOMIZE_OG_IMAGE = false;

// ─────────────────────────────────────────────────────────────────────────────
// SITE — everything that makes this site *this* site.
//
// This is the first file to edit when reusing this template. Name, description,
// navigation, social links, structured data, and the on/off switches for the
// optional features all live here. Nothing below this file needs editing to
// rebrand: the layout, header, mobile menu, and footer all read from `SITE`.
//
// What is deliberately NOT here (it lives outside the Astro build):
//   • the canonical origin — `site:` in astro.config.mjs
//   • the sitemap line   — public/robots.txt
//   • colors, fonts, spacing — src/styles/tokens.css
//   • the logo mark      — src/components/Logo.astro
//   • the favicons       — public/favicon.svg, favicon.png, apple-touch-icon.png
// ─────────────────────────────────────────────────────────────────────────────

/** A navigation or footer link. Set `external` to open in a new tab safely. */
export interface SiteLink {
  label: string;
  href: string;
  external?: boolean;
}

export const SITE = {
  // ── Identity ───────────────────────────────────────────────────────────────
  /** Used in <html lang> and as the base for the title template. */
  lang: "en",
  /** Open Graph locale, e.g. "en_US", "en_GB", "de_DE". */
  locale: "en_US",
  /** Appended to every page title as " | {name}" — see src/layouts/Base.astro. */
  name: "Community Cleanup PLG",
  /** Fallback <meta name="description"> for pages that don't set their own. */
  description:
    "We clean Prospect Lefferts Gardens. No registration, all supplies included. Just show up.",
  /** Browser UI tint on mobile. Usually --bg from tokens.css, or a shade of it. */
  themeColor: "#14130F",

  // ── Fonts ──────────────────────────────────────────────────────────────────
  // Preloaded in <head>. Must match the @font-face src URLs in
  // src/styles/fonts.css — see the swap recipe at the top of that file.
  fonts: ["/fonts/Inter.woff2", "/fonts/Fraunces.woff2"],

  // ── Navigation ─────────────────────────────────────────────────────────────
  // One source of truth. The header, the mobile menu, and the footer all read
  // from here, so adding a page means editing this block and nothing else.
  nav: {
    /** Header links, shown to the right of the logo on desktop. */
    header: [
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
    ] as SiteLink[],
    /** The single emphasized header link, rendered as a button. Set to null to omit. */
    headerCta: { label: "Join", href: "/join" } as SiteLink | null,

    /** Links inside the mobile slide-over menu. */
    mobile: [
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
    ] as SiteLink[],
    /** The mobile menu's two call-to-action buttons. First is primary. */
    mobileCtas: [
      { label: "Join us", href: "/join" },
      { label: "View schedule", href: "/schedule" },
    ] as SiteLink[],

    /** Footer link columns. Add or remove a column by adding or removing an array. */
    footer: [
      [
        { label: "Join", href: "/join" },
        { label: "Schedule", href: "/schedule" },
        { label: "Service hours", href: "/community-service-hours" },
        { label: "Lost Treasure", href: "/lost-treasure" },
        { label: "Partners", href: "/partners" },
        { label: "NYC trash clubs", href: "/new-york-trash-clubs" },
        { label: "FAQ", href: "/faq" },
        { label: "About", href: "/about" },
      ],
    ] as SiteLink[][],
  },

  // ── Social & contact ───────────────────────────────────────────────────────
  // Rendered as the footer's second column. Overlaps `sameAs` below on purpose:
  // this list is what humans click, `sameAs` is what search engines read.
  social: [
    {
      label: "Newsletter",
      href: "https://communitycleanupplg.substack.com/subscribe",
      external: true,
    },
    { label: "Email us!", href: "mailto:communitycleanupplg@gmail.com" },
    { label: "Discord", href: "https://discord.com/invite/H9her7r8N2", external: true },
    { label: "Instagram", href: "https://www.instagram.com/communitycleanupplg/", external: true },
    {
      label: "GitHub",
      href: "https://github.com/communitycleanupnyc/plgcleanup.org/",
      external: true,
    },
    { label: "Support us", href: "/support" },
  ] as SiteLink[],

  // ── Footer tail ────────────────────────────────────────────────────────────
  footer: {
    /** Legal/terms links, shown above the copyright. */
    legal: [{ label: "Volunteering Terms", href: "/terms" }] as SiteLink[],
    /** Rendered as "© {current year} {copyright}". */
    copyright: "Community Cleanup PLG · Brooklyn, New York",
    /**
     * The sign-off line under the copyright. It is preceded by the running
     * pounds-collected total on a split-flap counter (SplitFlap.astro), so
     * write it to read *after* a number — it starts mid-sentence on purpose.
     * Set to "" to omit the whole line, counter included.
     */
    statLine: "pounds of trash picked up.",
  },

  // ── Structured data (JSON-LD) ──────────────────────────────────────────────
  // Emitted on every page by src/layouts/Base.astro so search and AI engines
  // know who publishes this site.
  schema: {
    /** schema.org type: "Organization", "NGO", "Person", "LocalBusiness", … */
    type: "NGO",
    /** Path to the logo image used in structured data (absolutized at build). */
    logo: "/images/logo.webp",
    /** Optional — drop the line if the site isn't geographically scoped. */
    areaServed: "Prospect Lefferts Gardens, Brooklyn, NY",
    /** Profile URLs that identify this same entity elsewhere. */
    sameAs: [
      "https://www.instagram.com/communitycleanupplg/",
      "https://communitycleanupplg.substack.com/",
      "https://discord.com/invite/H9her7r8N2",
    ],
  },

  // ── Feature switches ───────────────────────────────────────────────────────
  // Everything here can be turned off without touching any other file. Turn a
  // feature off first, confirm the build is still green, then delete its code
  // and data if you never want it back.
  features: {
    /**
     * The scrolling stats ticker across the bottom of the page. Off since the
     * split-flap counter took over the same figure in the footer's sign-off
     * line — Ticker.astro is kept, wired up and one flag away, in case the
     * band is ever wanted back. Turning both off leaves src/data/stats.json +
     * stats.ts unused.
     */
    ticker: false,
    /**
     * Rotate the gallery. One switch, three effects, because they are the same
     * decision: the photo that leads the homepage carousel is also the photo in
     * every link preview (WhatsApp, iMessage, Facebook, Slack — the Open Graph
     * image), and the rest of the carousel is dealt a fresh random order on
     * every build.
     *
     * The lead photo is not a coin flip. Each photo leads for exactly one day
     * per cycle, and when everyone has had a turn the deck is reshuffled and the
     * cycle restarts — so with N photos, N days is one full round. The daily
     * Cloudflare redeploy is what advances it; two builds on the same day lead
     * with the same photo. Full explanation in src/lib/gallery.ts.
     *
     * Off → items appear in the `order` set in each Markdown file and the
     * lowest-`order` one is the share image, unchanging.
     */
    rotateGallery: true,
  },
} as const;

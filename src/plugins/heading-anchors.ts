// Gives every subheading on a Markdown page a link to itself, so a section can
// be shared by URL:
//
//   /new-york-trash-clubs#fort-tilden--breezy-point-frequently-asked-questions
//
// The link is the "#" that appears beside a heading on hover or when it takes
// keyboard focus — the convention every docs site uses. Prose.astro styles it.
// Nothing in the Markdown opts in: a heading is linkable because it is a
// heading.
//
// THE ids ARE ASTRO'S, not ours. Astro slugs every heading with github-slugger
// and those same ids are what `headings` in src/pages/[slug].astro reads, so
// this only ever appends a link to an id that already exists. It does NOT
// invent one: a second slugging rule here could disagree with Astro's, and the
// disagreement would show up as links that quietly point at nothing.
//
// That means ORDER MATTERS, in two directions, and astro.config.mjs sets it:
//   1. Astro's own rehypeHeadingIds normally runs AFTER the plugins configured
//      there, so the config runs a copy of it FIRST — otherwise the headings
//      reaching this plugin have no id yet and it does nothing at all.
//   2. This runs BEFORE collapsible-sections, so a heading that then moves into
//      a <summary> takes its link with it, and a collapsed section is linkable
//      like any other.
//
// THE LINK HOLDS NO TEXT. The "#" is drawn by CSS, and the link carries an
// aria-label for the name it speaks. A "#" text node here would be swept into
// the heading's text when Astro collects the page's headings ("Values#") —
// which is what [slug].astro matches `collapse:` against, and what any table of
// contents would print.
import { isHeading, label, rank, type Node, type Root } from "./hast";

/** The link's accessible name — a "#" drawn in CSS says nothing out loud. */
const linkLabel = (heading: string) => `Link to “${heading}”`;

function anchor(id: string, heading: string): Node {
  return {
    type: "element",
    tagName: "a",
    properties: {
      className: ["heading-anchor"],
      href: `#${id}`,
      ariaLabel: linkLabel(heading),
    },
    children: [],
  };
}

export default function headingAnchors() {
  return function transform(tree: Root) {
    visit(tree);
  };
}

/** Depth-first: headings sit at the top level of a Markdown page today, but a
    plugin that only looked there would silently stop working the day one
    doesn't. h1 is skipped — it names the page, and the page's own address
    already links there. */
function visit(node: Node) {
  for (const child of node.children ?? []) {
    const id = child.properties?.id;
    if (isHeading(child) && rank(child) > 1 && typeof id === "string" && id !== "") {
      child.children = [...(child.children ?? []), anchor(id, label(child))];
      continue;
    }
    visit(child);
  }
}

// The little bit of HTML-syntax-tree (hast) vocabulary the Markdown plugins in
// this folder share, so the two of them can't drift apart about what a heading
// is or what its text says.
//
// These shapes are declared here rather than imported from @types/hast: that
// would be a dependency, and this is the whole of what we touch.
export interface Node {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
  value?: string;
}
export interface Root extends Node {
  children: Node[];
}
export interface File {
  data?: { astro?: { frontmatter?: Record<string, unknown> } };
}

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** 2 for an <h2>. */
export const rank = (node: Node) => Number(node.tagName?.[1]);

export const isHeading = (node: Node) =>
  node.type === "element" && HEADINGS.has(node.tagName ?? "");

/** Heading text, flattened. */
export function label(node: Node): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(label).join("");
}

/** The matching rule for a heading named in frontmatter, shared with the check
    in src/pages/[slug].astro so the two can't disagree about what counts as the
    same heading: case- and whitespace-insensitive, so "our team" in the
    frontmatter finds "## Our Team". */
export const headingKey = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

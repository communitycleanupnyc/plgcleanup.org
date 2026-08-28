// Turns a named section of a Markdown page into a native <details> dropdown,
// at build time, so the Markdown stays Markdown.
//
// A page opts in from its frontmatter, naming the headings it wants collapsed:
//
//   ---
//   title: About
//   collapse:
//     - Team
//   ---
//
// The heading becomes the <summary> you click, and everything under it — up to
// the next heading of the same or higher rank — becomes the content that
// unfolds. Prose.astro styles and animates the result.
//
// WHY A BUILD PLUGIN, and not <details> typed into the Markdown: the body of a
// page is edited through Pages CMS's rich-text field by people who don't write
// HTML. Raw tags in that field are theirs to accidentally break, and a
// WYSIWYG editor is entitled to rewrite markup it doesn't recognise. A heading
// name in the frontmatter is a plain string in a form — nothing to mangle, and
// the page's Markdown never stops being ordinary Markdown.
//
// A name that matches no heading is caught in src/pages/[slug].astro, NOT here.
// It has to be: a plugin that throws inside Astro's Markdown pipeline does not
// fail the build — the error is swallowed and the page is emitted EMPTY, which
// is a far worse outcome than the typo it was meant to catch. (Verified against
// this repo: rename a collapsed heading, and /about built to nothing at all,
// silently, on a cold build.) The route throws instead, where it reliably stops
// the build the way the empty-body guard next to it does.
//
// The <details>/<summary> pair is deliberate too. It is keyboard-operable,
// announced correctly, and open/close works with JavaScript off — none of which
// a hand-rolled toggle would give us for free, in a repo with no full-time
// maintainer.
import { CARET } from "../components/caret";
import { headingKey, isHeading, label, rank, type File, type Node, type Root } from "./hast";

// Re-exported because src/pages/[slug].astro checks the `collapse:` names
// against this page's real headings with the same rule (see ./hast.ts).
export { headingKey };

function caret(): Node {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      className: ["disclosure__caret"],
      width: CARET.size,
      height: CARET.size,
      viewBox: CARET.viewBox,
      fill: "none",
      ariaHidden: "true",
    },
    children: [
      {
        type: "element",
        tagName: "path",
        properties: {
          d: CARET.path,
          stroke: "currentColor",
          strokeWidth: CARET.strokeWidth,
          strokeLinecap: CARET.strokeLinecap,
          strokeLinejoin: CARET.strokeLinejoin,
        },
        children: [],
      },
    ],
  };
}

function disclosure(heading: Node, body: Node[]): Node {
  return {
    type: "element",
    tagName: "details",
    properties: { className: ["disclosure"] },
    children: [
      {
        type: "element",
        tagName: "summary",
        // The heading goes INSIDE the summary rather than being replaced by it:
        // the page keeps its outline (and the h2 the SEO audit counts), and a
        // screen reader still announces "Team, heading 2" alongside the
        // expanded/collapsed state summary carries on its own.
        properties: { className: ["disclosure__summary"] },
        children: [heading, caret()],
      },
      {
        type: "element",
        tagName: "div",
        properties: { className: ["disclosure__body"] },
        children: body,
      },
    ],
  };
}

export default function collapsibleSections() {
  return function transform(tree: Root, file: File) {
    const wanted = file.data?.astro?.frontmatter?.collapse;
    if (!Array.isArray(wanted) || wanted.length === 0) return;

    const names = new Set<string>(
      wanted.filter((name): name is string => typeof name === "string").map(headingKey),
    );
    if (names.size === 0) return;

    const out: Node[] = [];
    const children = tree.children;

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const name = isHeading(node) ? headingKey(label(node)) : "";

      if (!name || !names.has(name)) {
        out.push(node);
        continue;
      }

      // Everything up to the next heading of the same or higher rank is this
      // section's content — the same rule a reader applies by eye.
      const depth = rank(node);
      const body: Node[] = [];
      let j = i + 1;
      for (; j < children.length; j++) {
        const next = children[j];
        if (isHeading(next) && rank(next) <= depth) break;
        body.push(next);
      }
      i = j - 1;

      out.push(disclosure(node, body));
    }

    tree.children = out;
  };
}

// Vendored copy of astro-delete-unused-images@1.0.3.
// MIT License, Copyright (c) 2024 Nicholis du Toit — full text in ./LICENSE.md.
// Upstream: https://github.com/TrueWinter/astro-delete-unused-images
//
// WHY THIS IS VENDORED rather than installed from npm:
//
// It is ~120 lines from a single maintainer, with no tests, last targeting Astro
// 4 — and it calls unlink() inside every production build. It was installed on a
// floating "^1.0.3", in a repo where Dependabot's grouped minor PR is meant to be
// merged by non-technical people once CI is green. A compromised 1.0.4 would
// therefore have arbitrary delete powers in the build, auto-proposed and merged
// on sight. Copying it here removes that trust edge entirely: the code that
// deletes files is code that lives in this repo and changes only when someone
// here changes it.
//
// It is otherwise UNMODIFIED apart from Prettier formatting and these comments.
// If you ever need to update it, diff against upstream by hand — deliberately.
import integration from "./integration.js";

const DEFAULT_PROPS = {
  filterImages: () => true,
  checkFiles: () => true,
  imageExtensions: [".jpg", ".jpeg", ".png", ".webp", ".avif"],
  checkExtensions: [".html", ".css", ".js"],
  dryRun: false,
};

/**
 * @param {Partial<typeof DEFAULT_PROPS>} [opts]
 * @returns {import('astro').AstroIntegration}
 */
export default function deleteUnusedImages(opts) {
  return integration({
    ...DEFAULT_PROPS,
    ...opts,
  });
}

export interface TestimonialData {
  file: string;
  name: string;
  quote: string;
  body: string;
  alt: string;
  focusPosition?: string;
}

// Order === display order. Index 1 (the 2nd entry) is the default highlight.
// Images go in src/assets/testimonials/ — short-side ≥ 1400px recommended.
export const testimonials: TestimonialData[] = [
  { file: "abby.jpg", name: "Abby …", quote: "…", body: "…", alt: "…" },
  { file: "albert.jpg", name: "Albert …", quote: "…", body: "…", alt: "…" },
  { file: "chelsie.jpg", name: "Albert …", quote: "…", body: "…", alt: "…" },
  { file: "crosby.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "eddie.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "elana.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "hannah.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "isaiah.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
  { file: "jaan.jpg", name: "xyz", quote: "...", body: "...", alt: "..." },
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

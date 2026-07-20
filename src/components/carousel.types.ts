import type { ImageMetadata } from "astro";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export interface CarouselItem {
  img: ImageMetadata;
  name: string;
  quote: string;
  /** Rendered Markdown body (the testimonial reveal panel). Optional. */
  Body?: AstroComponentFactory;
  alt: string;
  focusPosition?: string;
}

export interface CarouselProps {
  items: CarouselItem[];
  variant?: "natural" | "square";
  grayscale?: boolean;
  enablePopup?: boolean;
  heading?: string;
  sizePx?: { mobile: number; desktop: number };
}

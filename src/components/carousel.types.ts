import type { ImageMetadata } from 'astro';

export interface CarouselItem {
  img: ImageMetadata;
  name: string;
  quote: string;
  body?: string;
  alt: string;
  focusPosition?: string;
}

export interface CarouselProps {
  items: CarouselItem[];
  variant?: 'natural' | 'square';
  grayscale?: boolean;
  enablePopup?: boolean;
  heading?: string;
  sizePx?: { mobile: number; desktop: number };
}

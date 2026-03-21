import { SlideLayout } from '../types';

interface LayoutPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SlideLayoutConfig {
  title: LayoutPosition;
  body: LayoutPosition;
  secondary?: LayoutPosition;
}

const layouts: Record<SlideLayout, SlideLayoutConfig> = {
  'title-slide': {
    title: { x: 0.5, y: 1.5, w: 12.0, h: 1.5 },
    body: { x: 0.5, y: 3.5, w: 12.0, h: 2.0 },
  },
  'title-content': {
    title: { x: 0.5, y: 0.3, w: 12.0, h: 0.8 },
    body: { x: 0.5, y: 1.3, w: 12.0, h: 5.5 },
  },
  'two-column': {
    title: { x: 0.5, y: 0.3, w: 12.0, h: 0.8 },
    body: { x: 0.5, y: 1.3, w: 5.5, h: 5.5 },
    secondary: { x: 6.5, y: 1.3, w: 5.5, h: 5.5 },
  },
  'image-text': {
    title: { x: 0.5, y: 0.3, w: 12.0, h: 0.8 },
    body: { x: 6.5, y: 1.3, w: 5.5, h: 5.5 },
    secondary: { x: 0.5, y: 1.3, w: 5.5, h: 5.5 },
  },
  chart: {
    title: { x: 0.5, y: 0.3, w: 12.0, h: 0.8 },
    body: { x: 0.5, y: 1.3, w: 12.0, h: 5.5 },
  },
  diagram: {
    title: { x: 0.5, y: 0.3, w: 12.0, h: 0.8 },
    body: { x: 0.5, y: 1.3, w: 12.0, h: 5.5 },
  },
  'section-divider': {
    title: { x: 0.5, y: 2.0, w: 12.0, h: 2.0 },
    body: { x: 0.5, y: 4.2, w: 12.0, h: 1.5 },
  },
  conclusion: {
    title: { x: 0.5, y: 0.3, w: 12.0, h: 0.8 },
    body: { x: 0.5, y: 1.3, w: 12.0, h: 5.5 },
  },
};

export function getSlideLayout(layout: SlideLayout): SlideLayoutConfig {
  return layouts[layout] || layouts['title-content'];
}

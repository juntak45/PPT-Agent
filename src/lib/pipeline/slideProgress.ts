import { PipelineState } from '../types';

/**
 * Returns the slideNumber (1-based) of the next slide needing expression selection,
 * or null if all slides have expressions.
 */
export function findNextSlideNeedingExpression(state: PipelineState): number | null {
  const slides = state.finalPlan?.slides;
  if (!slides) return null;
  for (const slide of slides) {
    if (!state.selectedExpressions[slide.slideNumber]) {
      return slide.slideNumber;
    }
  }
  return null;
}

/**
 * Returns the slideNumber (1-based) of the next slide needing realization,
 * or null if all are done.
 * A slide needs realization if it has selectedExpression but status !== 'approved'.
 */
export function findNextSlideNeedingRealization(state: PipelineState): number | null {
  const slides = state.finalPlan?.slides;
  if (!slides) return null;
  for (const slide of slides) {
    if (slide.selectedExpression && slide.status !== 'approved') {
      return slide.slideNumber;
    }
  }
  return null;
}

/** Count slides still needing expression selection. */
export function countSlidesNeedingExpression(state: PipelineState): number {
  const total = state.confirmedSlideCount || 0;
  const selected = Object.keys(state.selectedExpressions).length;
  return Math.max(0, total - selected);
}

/** Check if all expressions are selected. */
export function allExpressionsSelected(state: PipelineState): boolean {
  return findNextSlideNeedingExpression(state) === null &&
    Object.keys(state.selectedExpressions).length > 0;
}

/** Check if all slides are realized. */
export function allSlidesRealized(state: PipelineState): boolean {
  return findNextSlideNeedingRealization(state) === null &&
    state.completedSlides.length === (state.confirmedSlideCount || 0);
}

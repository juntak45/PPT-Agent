import { StepId, PipelineState } from '../types';

export function getNextStep(current: StepId, _state: PipelineState): StepId | null {
  if (current >= 5) return null;
  return (current + 1) as StepId;
}

export function canAdvance(stepId: StepId, state: PipelineState): boolean {
  switch (stepId) {
    case 0:
      return !!state.documentAnalysis;
    case 1:
      return !!state.context && !!state.selectedDirection && !!state.confirmedSlideCount && !!state.selectedStructure;
    case 2:
      return !!state.contentSpec;
    case 3:
      return !!state.deckDesignPlan;
    case 4:
      return Object.keys(state.selectedExpressions).length === (state.confirmedSlideCount || 0);
    case 5:
      return state.completedSlides.length === (state.confirmedSlideCount || 0);
    default:
      return false;
  }
}

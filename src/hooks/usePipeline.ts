'use client';

import { useState, useCallback } from 'react';
import {
  PipelineState,
  StepId,
  SlideContent,
  DocumentAnalysis,
  ContentSpecification,
  SlideCandidate,
  StructuredData,
  OptionCandidate,
  CompositionVariant,
  AutoPlanningResult,
  DeckDesignPlan,
  FinalDeckPlan,
  SlideRoleAssignment,
  SlideGenerationStrategy,
  SlideSpec,
  ExpressionCandidate,
  ExpressionCandidatesPayload,
} from '@/lib/types';
import { getNextStep } from '@/lib/pipeline/steps';

interface UsePipelineReturn {
  state: PipelineState;
  currentOptions: OptionCandidate[];
  setDocumentAnalysis: (analysis: DocumentAnalysis) => void;
  processStructuredData: (data: StructuredData) => void;
  selectOption: (optionId: string) => void;
  selectExpression: (slideNumber: number, expression: ExpressionCandidate) => void;
  clearExpressionCandidates: () => void;
  advanceStep: () => void;
  goToStep: (stepId: StepId) => void;
  goBack: () => void;
  resetFromStep: (stepId: StepId) => void;
  setTheme: (themeId: string) => void;
  setSlideComposition: (slideIndex: number, composition: CompositionVariant) => void;
  confirmSlide: (slide: SlideContent) => void;
  setDeckDesignPlan: (plan: DeckDesignPlan) => void;
  setCurrentSlideIndex: (slideIndex: number) => void;
  clearSlideCandidates: () => void;
  reset: () => void;
}

const initialState: PipelineState = {
  currentStep: 1,
  currentSlideIndex: 0,
  completedSlides: [],
  selectedExpressions: {},
};

function buildArchitectureMermaid(spec: SlideSpec, required: string[]): string {
  const nodes = [spec.sectionName, ...required.slice(0, 3)];
  if (nodes.length < 2) return 'flowchart LR\n  A[Current System] --> B[Wrtn Integration]';
  const lines = nodes.slice(1).map((node, idx) => `  N${idx}[${nodes[0]}] --> M${idx}[${node}]`);
  return `flowchart LR\n${lines.join('\n')}`;
}

function createBaselineSlide(
  spec: SlideSpec,
  assignment: SlideRoleAssignment,
): SlideContent {
  const primary = spec.requiredElements.slice(0, assignment.density === 'high' ? 6 : assignment.density === 'medium' ? 5 : 3);
  const secondary = spec.requiredElements.slice(primary.length, primary.length + 3);
  const iconHints = primary.map((_, idx) => {
    const palette = ['🎯', '📊', '🧩', '⚙️', '🚀', '🔍'];
    return palette[idx % palette.length];
  });

  const base: SlideContent = {
    slideNumber: spec.slideNumber,
    title: spec.keyMessage,
    subTitle: `${spec.sectionName} · ${assignment.role}`,
    layout: assignment.preferredLayout,
    contentType: primary.length > 0 ? 'bullets' : 'paragraph',
    bulletPoints: primary.length > 0 ? primary.map((item) => {
      if (item.includes(':')) return item;
      return `${item}: ${spec.purpose}`;
    }) : undefined,
    bodyText: spec.purpose,
    speakerNotes: `${spec.purpose}\n전환: ${spec.transitionNote}`,
    composition: assignment.preferredComposition,
    keyMessage: spec.keyMessage,
    secondaryPoints: secondary.length > 0 ? secondary : undefined,
    footnote: spec.suggestedVisual ? `권장 시각화: ${spec.suggestedVisual}` : `${spec.sectionName} 슬라이드`,
    iconHints,
  };

  switch (assignment.role) {
    case 'cover':
      return {
        ...base,
        layout: 'title-slide',
        contentType: 'paragraph',
        bulletPoints: undefined,
        subTitle: spec.sectionName,
        bodyText: spec.purpose,
      };
    case 'toc':
      return {
        ...base,
        layout: 'title-content',
        contentType: 'bullets',
        bulletPoints: assignment.mustHaveElements.length > 0 ? assignment.mustHaveElements : primary,
        keyMessage: undefined,
        secondaryPoints: undefined,
      };
    case 'section-divider':
      return {
        ...base,
        layout: 'section-divider',
        contentType: 'paragraph',
        bulletPoints: undefined,
        keyMessage: undefined,
        bodyText: spec.purpose,
      };
    case 'data-visualization':
      return {
        ...base,
        layout: assignment.preferredLayout === 'chart' ? 'chart' : assignment.preferredLayout,
        contentType: 'chart',
        chartType: 'bar',
        chartData: {
          labels: primary.slice(0, 3).map((item) => item.split(':')[0]),
          values: primary.slice(0, 3).map((_, idx) => 35 - idx * 7),
          seriesName: spec.sectionName,
        },
      };
    case 'architecture-blueprint':
      return {
        ...base,
        layout: assignment.preferredLayout === 'diagram' ? 'diagram' : assignment.preferredLayout,
        contentType: 'diagram',
        mermaidCode: buildArchitectureMermaid(spec, assignment.mustHaveElements.length > 0 ? assignment.mustHaveElements : primary),
        bulletPoints: primary.slice(0, 4),
      };
    case 'comparison':
      return {
        ...base,
        layout: assignment.preferredLayout === 'two-column' ? 'two-column' : assignment.preferredLayout,
        composition: assignment.preferredComposition === 'comparison-table' ? 'comparison-table' : 'side-by-side',
      };
    case 'conclusion':
      return {
        ...base,
        layout: 'conclusion',
        bulletPoints: primary.slice(0, 3),
      };
    default:
      return base;
  }
}

function buildFinalPlan(
  autoPlanning: AutoPlanningResult | undefined,
  contentSpec: ContentSpecification,
  deckDesignPlan: DeckDesignPlan,
  selectedThemeId?: string,
): FinalDeckPlan | undefined {
  if (!autoPlanning) return undefined;

  const slides = contentSpec.slideSpecs.map((spec) => {
    const assignment = deckDesignPlan.roleAssignments.find((item) => item.slideNumber === spec.slideNumber);
    const plan = autoPlanning.slidePlans.find((item) => item.slideNumber === spec.slideNumber);
    if (!assignment) return null;
    const baseline = createBaselineSlide(spec, assignment);

    return {
      slideNumber: spec.slideNumber,
      sectionName: spec.sectionName,
      strategy: (plan?.strategy || 'generate') as SlideGenerationStrategy,
      referenceSlideNumber: plan?.referenceSlideNumber,
      approved: baseline,
      status: 'approved' as const,
      roleAssignment: assignment,
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    meta: {
      title: contentSpec.title,
      subtitle: contentSpec.subtitle,
      selectedThemeId,
    },
    confirmedSlideCount: autoPlanning.confirmedSlideCount,
    selectedDirection: autoPlanning.direction,
    selectedStructure: autoPlanning.structure,
    contentSpec,
    deckDesignPlan,
    slides,
  };
}

export function usePipeline(): UsePipelineReturn {
  const [state, setState] = useState<PipelineState>(initialState);
  const [currentOptions, setCurrentOptions] = useState<OptionCandidate[]>([]);

  const setDocumentAnalysis = useCallback((analysis: DocumentAnalysis) => {
    setState((prev) => ({
      ...prev,
      documentAnalysis: analysis,
      currentStep: 1,
    }));
  }, []);

  const processStructuredData = useCallback((data: StructuredData) => {
    switch (data.type) {
      case 'auto_planning': {
        const result = data.data as AutoPlanningResult;
        setState((prev) => ({
          ...prev,
          autoPlanning: result,
          context: result.context,
          selectedDirection: result.direction,
          architectureBlueprintDecision: result.blueprintDecision,
          confirmedSlideCount: result.confirmedSlideCount,
          selectedStructure: result.structure,
        }));
        // No options — single auto-decided result
        break;
      }

      case 'content_spec': {
        setState((prev) => ({
          ...prev,
          contentSpec: data.data as ContentSpecification,
        }));
        break;
      }

      case 'deck_design_plan': {
        const plan = data.data as DeckDesignPlan;
        setState((prev) => {
          const finalPlan = prev.contentSpec
            ? buildFinalPlan(prev.autoPlanning, prev.contentSpec, plan, prev.selectedThemeId)
            : prev.finalPlan;
          return {
            ...prev,
            deckDesignPlan: plan,
            finalPlan,
            completedSlides: finalPlan?.slides
              .map((slide) => slide.approved)
              .filter((slide): slide is SlideContent => Boolean(slide)) || prev.completedSlides,
          };
        });
        break;
      }

      case 'expression_candidates': {
        const ec = data.data as ExpressionCandidatesPayload;
        setState((prev) => ({
          ...prev,
          currentSlideIndex: Math.max(0, ec.slideNumber - 1),
          expressionCandidates: ec.candidates,
        }));
        setCurrentOptions(
          ec.candidates.map((c) => ({
            id: c.id,
            label: c.label,
            summary: c.description,
            detail: `${c.expressionFamily} / ${c.informationStructure}`,
          }))
        );
        break;
      }

      case 'slide_candidates': {
        const sc = data.data as { slideNumber: number; candidates: SlideCandidate[] };
        setState((prev) => {
          const slideIndex = Math.max(0, sc.slideNumber - 1);
          const updatedSlides = prev.finalPlan?.slides.map((slide) =>
            slide.slideNumber === sc.slideNumber
              ? { ...slide, candidates: sc.candidates, status: 'draft' as const }
              : slide
          );
          return {
            ...prev,
            currentSlideIndex: slideIndex,
            slideCandidates: sc.candidates,
            finalPlan: prev.finalPlan ? { ...prev.finalPlan, slides: updatedSlides || prev.finalPlan.slides } : prev.finalPlan,
          };
        });
        setCurrentOptions(
          sc.candidates.map((c) => ({
            id: c.id,
            label: c.label,
            summary: c.description,
            detail: `${c.slide.layout} / ${c.slide.composition || 'default'}`,
          }))
        );
        break;
      }

      case 'doc_analysis':
        break;
    }
  }, []);

  const selectOption = useCallback(
    (optionId: string) => {
      // Only Step 4 slide candidate highlighting — actual confirmation via confirmSlide
      // selectedOptionId is managed in ChatContainer, not here
    },
    [state]
  );

  const confirmSlide = useCallback(
    (slide: SlideContent) => {
      setState((prev) => ({
        ...prev,
        completedSlides: prev.completedSlides.some((item) => item.slideNumber === slide.slideNumber)
          ? prev.completedSlides.map((item) => item.slideNumber === slide.slideNumber ? slide : item)
          : [...prev.completedSlides, slide].sort((a, b) => a.slideNumber - b.slideNumber),
        slideCandidates: undefined,
        finalPlan: prev.finalPlan ? {
          ...prev.finalPlan,
          slides: prev.finalPlan.slides.map((item) => item.slideNumber === slide.slideNumber ? {
            ...item,
            approved: slide,
            candidates: undefined,
            status: 'approved' as const,
          } : item),
        } : prev.finalPlan,
      }));
      setCurrentOptions([]);
    },
    []
  );

  const selectExpression = useCallback((slideNumber: number, expression: ExpressionCandidate) => {
    setState((prev) => {
      const newSelected = { ...prev.selectedExpressions, [slideNumber]: expression };
      const updatedSlides = prev.finalPlan?.slides.map((s) =>
        s.slideNumber === slideNumber
          ? { ...s, selectedExpression: expression, status: 'expression-selected' as const }
          : s
      );
      return {
        ...prev,
        selectedExpressions: newSelected,
        expressionCandidates: undefined,
        finalPlan: prev.finalPlan
          ? { ...prev.finalPlan, slides: updatedSlides || prev.finalPlan.slides }
          : prev.finalPlan,
      };
    });
    setCurrentOptions([]);
  }, []);

  const clearExpressionCandidates = useCallback(() => {
    setState((prev) => ({ ...prev, expressionCandidates: undefined }));
    setCurrentOptions([]);
  }, []);

  const setDeckDesignPlan = useCallback((plan: DeckDesignPlan) => {
    setState((prev) => {
      const finalPlan = prev.contentSpec
        ? buildFinalPlan(prev.autoPlanning, prev.contentSpec, plan, prev.selectedThemeId)
        : prev.finalPlan;
      return {
        ...prev,
        deckDesignPlan: plan,
        finalPlan,
        completedSlides: finalPlan?.slides
          .map((slide) => slide.approved)
          .filter((slide): slide is SlideContent => Boolean(slide)) || prev.completedSlides,
      };
    });
  }, []);

  const advanceStep = useCallback(() => {
    const next = getNextStep(state.currentStep, state);
    if (next !== null) {
      setState((prev) => ({ ...prev, currentStep: next }));
      setCurrentOptions([]);
    }
  }, [state]);

  const goToStep = useCallback((stepId: StepId) => {
    setState((prev) => ({ ...prev, currentStep: stepId }));
    setCurrentOptions([]);
  }, []);

  const setTheme = useCallback((themeId: string) => {
    setState((prev) => ({
      ...prev,
      selectedThemeId: themeId || undefined,
      finalPlan: prev.finalPlan ? {
        ...prev.finalPlan,
        meta: {
          ...prev.finalPlan.meta,
          selectedThemeId: themeId || undefined,
        },
      } : prev.finalPlan,
    }));
  }, []);

  const setSlideComposition = useCallback((slideIndex: number, composition: CompositionVariant) => {
    setState((prev) => {
      const updated = [...prev.completedSlides];
      if (updated[slideIndex]) {
        updated[slideIndex] = { ...updated[slideIndex], composition };
      }
      return {
        ...prev,
        completedSlides: updated,
        finalPlan: prev.finalPlan ? {
          ...prev.finalPlan,
          slides: prev.finalPlan.slides.map((slide, index) => index === slideIndex && slide.approved ? {
            ...slide,
            approved: { ...slide.approved, composition },
          } : slide),
        } : prev.finalPlan,
      };
    });
  }, []);

  const setCurrentSlideIndex = useCallback((slideIndex: number) => {
    setState((prev) => ({
      ...prev,
      currentSlideIndex: Math.max(0, slideIndex),
      slideCandidates: undefined,
    }));
    setCurrentOptions([]);
  }, []);

  const clearSlideCandidates = useCallback(() => {
    setState((prev) => ({
      ...prev,
      slideCandidates: undefined,
      finalPlan: prev.finalPlan ? {
        ...prev.finalPlan,
        slides: prev.finalPlan.slides.map((slide) => slide.status === 'draft' ? {
          ...slide,
          status: slide.approved ? 'approved' : 'pending',
          candidates: undefined,
        } : slide),
      } : prev.finalPlan,
    }));
    setCurrentOptions([]);
  }, []);

  const resetFromStep = useCallback((stepId: StepId) => {
    setState((prev) => {
      const next = { ...prev, currentStep: stepId };
      if (stepId <= 1) {
        // Clear all auto-planning results
        next.autoPlanning = undefined;
        next.context = undefined;
        next.selectedDirection = undefined;
        next.architectureBlueprintDecision = undefined;
        next.confirmedSlideCount = undefined;
        next.selectedStructure = undefined;
      }
      if (stepId <= 2) {
        next.contentSpec = undefined;
      }
      if (stepId <= 3) {
        next.deckDesignPlan = undefined;
      }
      if (stepId <= 4) {
        next.expressionCandidates = undefined;
        next.selectedExpressions = {};
      }
      if (stepId <= 5) {
        next.slideCandidates = undefined;
        next.completedSlides = [];
        next.currentSlideIndex = 0;
        next.finalPlan = undefined;
      }
      return next;
    });
    setCurrentOptions([]);
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      const step = prev.currentStep;
      if (step <= 1) return prev;
      const prevStep = (step - 1) as StepId;
      return { ...prev, currentStep: prevStep };
    });
    setCurrentOptions([]);
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setCurrentOptions([]);
  }, []);

  return {
    state,
    currentOptions,
    setDocumentAnalysis,
    processStructuredData,
    selectOption,
    selectExpression,
    clearExpressionCandidates,
    advanceStep,
    goToStep,
    goBack,
    resetFromStep,
    setTheme,
    setSlideComposition,
    confirmSlide,
    setDeckDesignPlan,
    setCurrentSlideIndex,
    clearSlideCandidates,
    reset,
  };
}

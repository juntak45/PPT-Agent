'use client';

import { useState, useCallback, useMemo } from 'react';
import { SlideContent, PipelineState } from '@/lib/types';

interface UseSlidePreviewReturn {
  slides: SlideContent[];
  currentSlideIndex: number;
  totalSlides: number;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

export function useSlidePreview(pipelineState: PipelineState): UseSlidePreviewReturn {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const slides = useMemo((): SlideContent[] => {
    if (pipelineState.finalPlan) {
      return pipelineState.finalPlan.slides
        .map((slide) => slide.approved || slide.candidates?.[0]?.slide)
        .filter((slide): slide is SlideContent => Boolean(slide))
        .sort((a, b) => a.slideNumber - b.slideNumber);
    }

    // Use completedSlides directly (already have content + design)
    if (pipelineState.completedSlides.length > 0) {
      return [...pipelineState.completedSlides].sort((a, b) => a.slideNumber - b.slideNumber);
    }

    const result: SlideContent[] = [];

    // Title slide from context
    if (pipelineState.context) {
      result.push({
        slideNumber: 1,
        title: pipelineState.context.topic,
        layout: 'title-slide',
        contentType: 'paragraph',
        bodyText: pipelineState.context.goal,
        speakerNotes: '',
      });
    }

    // Skeleton slides from selected structure
    if (pipelineState.selectedStructure) {
      let num = 2;
      for (const section of pipelineState.selectedStructure.sections) {
        result.push({
          slideNumber: num,
          title: section.sectionTitle,
          layout: 'title-content',
          contentType: 'bullets',
          bulletPoints: section.keyPoints,
          speakerNotes: section.purpose,
        });
        num++;
      }
    }

    return result;
  }, [pipelineState]);

  const totalSlides = slides.length;

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSlides) {
        setCurrentSlideIndex(index);
      }
    },
    [totalSlides]
  );

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    slides,
    currentSlideIndex: Math.min(currentSlideIndex, Math.max(0, totalSlides - 1)),
    totalSlides,
    goToSlide,
    nextSlide,
    prevSlide,
  };
}

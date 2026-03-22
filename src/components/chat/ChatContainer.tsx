'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { LlmProviderType, CompositionVariant, SlideCandidate, StepId, ContentSpecification, StructuredData, SlideContent, ExpressionCandidate } from '@/lib/types';
import { useChat } from '@/hooks/useChat';
import { usePipeline } from '@/hooks/usePipeline';
import { extractStructuredData } from '@/lib/pipeline/parser';
import { findNextSlideNeedingExpression, findNextSlideNeedingRealization } from '@/lib/pipeline/slideProgress';
import { getExpressionRecommendations, getInformationStructure, getCommunicativeGoal } from '@/lib/expression/recommender';
import { scoreSlideCompleteness } from '@/lib/benchmark/scorer';
import { postProcessSlide, printCorrectionLogs } from '@/lib/benchmark/postProcessor';
import { DEFAULT_PROVIDER } from '@/lib/constants';
import StepIndicator from '@/components/steps/StepIndicator';
import LlmProviderSelect from '@/components/settings/LlmProviderSelect';
import ThemeToggle from '@/components/settings/ThemeToggle';
import PanelResizer from '@/components/ui/PanelResizer';
import { useToast } from '@/components/ui/Toast';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import PreviewPanel from '@/components/preview/PreviewPanel';
import ReferencePanel from '@/components/reference/ReferencePanel';

function detectResetStep(content: string): StepId | null {
  if (/(장수|섹션|방향|청사진|구조|슬라이드 수)/.test(content)) return 1;
  if (/(메시지|내용|핵심 메시지|논리|스토리)/.test(content)) return 2;
  if (/(톤|스타일|세련|디자인|무드|모티프|컬러)/.test(content)) return 3;
  if (/(표현|표현 방식|시각화 방식)/.test(content)) return 4;
  return null;
}

function buildFallbackSlideCandidates(pipelineState: typeof import('@/hooks/usePipeline').usePipeline extends (...args: never[]) => infer R ? R extends { state: infer S } ? S : never : never): StructuredData | null {
  const slideNumber = pipelineState.currentSlideIndex + 1;
  const targetSlide = pipelineState.finalPlan?.slides.find((slide) => slide.slideNumber === slideNumber);
  const baseSlide = targetSlide?.approved;
  if (!targetSlide || !baseSlide) return null;

  const role = targetSlide.roleAssignment.role;
  const compositionsByRole: Record<string, CompositionVariant[]> = {
    cover: ['center-highlight', 'stack-vertical', 'default'],
    toc: ['grid-cards', 'icon-list', 'stack-vertical'],
    'section-divider': ['center-highlight', 'stack-vertical', 'default'],
    'key-message': ['center-highlight', 'icon-list', 'grid-cards'],
    'detailed-explanation': ['stack-vertical', 'grid-cards', 'side-by-side'],
    comparison: ['comparison-table', 'side-by-side', 'grid-cards'],
    'data-visualization': ['side-by-side', 'grid-cards', 'center-highlight'],
    'architecture-blueprint': ['hub-spoke', 'flow-horizontal', 'flow-vertical'],
    conclusion: ['center-highlight', 'stack-vertical', 'icon-list'],
  };

  const layouts = [targetSlide.roleAssignment.preferredLayout, baseSlide.layout, role === 'comparison' ? 'two-column' : role === 'architecture-blueprint' ? 'diagram' : baseSlide.layout];
  const compositions = compositionsByRole[role] || ['default', 'grid-cards', 'stack-vertical'];

  const candidates: SlideCandidate[] = [0, 1, 2].map((index) => {
    const nextComposition = compositions[index] || baseSlide.composition || 'default';
    const nextLayout = layouts[index] || baseSlide.layout;
    const nextSlide: SlideContent = {
      ...baseSlide,
      layout: nextLayout,
      composition: nextComposition,
      footnote: index === 0
        ? baseSlide.footnote
        : index === 1
          ? `${baseSlide.footnote || ''} · 대안 레이아웃`
          : `${baseSlide.footnote || ''} · 강조형 변주`,
      secondaryPoints: baseSlide.secondaryPoints?.slice(0, index === 2 ? 2 : baseSlide.secondaryPoints.length),
    };

    return {
      id: `fallback-${slideNumber}-${index + 1}`,
      label: ['기준안', '대안 A', '대안 B'][index],
      description: `${nextLayout} / ${nextComposition}`,
      slide: nextSlide,
    };
  });

  return {
    type: 'slide_candidates',
    data: {
      slideNumber,
      candidates,
    },
  };
}

function buildFallbackExpressionCandidates(pipelineState: typeof import('@/hooks/usePipeline').usePipeline extends (...args: never[]) => infer R ? R extends { state: infer S } ? S : never : never): StructuredData | null {
  const slideNumber = pipelineState.currentSlideIndex + 1;
  const spec = pipelineState.contentSpec?.slideSpecs.find((s) => s.slideNumber === slideNumber);
  const assignment = pipelineState.deckDesignPlan?.roleAssignments.find((ra) => ra.slideNumber === slideNumber);
  if (!spec || !assignment) return null;

  const recommendations = getExpressionRecommendations(spec, assignment);
  const topFamilies = recommendations.slice(0, 3);
  if (topFamilies.length < 2) return null;

  const infoStructure = getInformationStructure(spec, assignment);
  const commGoal = getCommunicativeGoal(spec, assignment);

  const candidates: ExpressionCandidate[] = topFamilies.map((rec, i) => ({
    id: `fallback-expr-${slideNumber}-${String.fromCharCode(97 + i)}`,
    slideNumber,
    label: `${rec.family} 표현`,
    description: rec.reason,
    expressionFamily: rec.family,
    informationStructure: infoStructure,
    communicativeGoal: commGoal,
    wireframe: {
      layout: assignment.preferredLayout,
      composition: rec.suggestedComposition,
      title: spec.keyMessage,
      zones: [
        { role: 'primary' as const, placeholder: spec.requiredElements[0] || spec.purpose, position: 'center' as const },
        { role: 'label' as const, placeholder: spec.sectionName, position: 'top' as const },
      ],
    },
    recommendationScore: rec.weight,
    rationale: rec.reason,
  }));

  return {
    type: 'expression_candidates',
    data: { slideNumber, informationStructure: infoStructure, communicativeGoal: commGoal, candidates },
  };
}

export default function ChatContainer() {
  const [provider, setProvider] = useState<LlmProviderType>(DEFAULT_PROVIDER);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showDocStep, setShowDocStep] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(45);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [contentSpecReady, setContentSpecReady] = useState(false);
  const [deckDesignPlanReady, setDeckDesignPlanReady] = useState(false);
  const [autoplanReady, setAutoplanReady] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef<Record<number, number>>({});

  const [referenceCount, setReferenceCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const { messages, isStreaming, sendMessage } = useChat(provider);
  const pipeline = usePipeline();

  // Fetch reference count for header indicator
  useEffect(() => {
    fetch('/api/references')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setReferenceCount(data.length); })
      .catch(() => {});
  }, []);

  // 응답에서 structured data를 추출하고 파이프라인을 진행하는 공통 함수
  const processResponse = useCallback(
    async (
      fullText: string | null,
      currentStep: number,
      pipelineState: typeof pipeline.state,
      allowStructuredRetry = true
    ) => {
      if (!fullText) return;

      const structured = extractStructuredData(fullText);
      if (!structured) {
        if (currentStep === 4) {
          const fallback = buildFallbackExpressionCandidates(pipelineState);
          if (fallback) {
            showToast('모델 응답이 설명형으로 와서, 규칙 기반 표현 후보를 즉시 생성했습니다.', 'info');
            pipeline.processStructuredData(fallback);
            setSelectedOptionId(null);
            setProcessingStatus(null);
            setMobileTab('preview');
            return;
          }
        }
        if (currentStep === 5) {
          const fallback = buildFallbackSlideCandidates(pipelineState);
          if (fallback) {
            showToast('모델 응답이 설명형으로 와서, 로컬 슬라이드를 즉시 생성했습니다.', 'info');
            pipeline.processStructuredData(fallback);
            setSelectedOptionId(null);
            setProcessingStatus(null);
            setMobileTab('preview');
            return;
          }
        }
        if (allowStructuredRetry && currentStep >= 1 && currentStep <= 5) {
          showToast('구조화 데이터가 누락되어 현재 단계를 자동으로 한 번 더 정리합니다.', 'info');
          const retryText = await sendMessage(
            '방금 응답 내용을 유지하되, 이번에는 반드시 마지막에 STRUCTURED_DATA JSON 블록을 포함해서 다시 출력해주세요. 설명 텍스트는 간단히 하고 구조화 데이터는 완전하게 넣어주세요.',
            currentStep as StepId,
            pipelineState
          );
          await processResponse(retryText, currentStep, pipelineState, false);
          return;
        }
        showToast('응답은 생성됐지만 다음 단계로 넘길 구조화 데이터 파싱에 실패했습니다. 다시 시도해주세요.', 'error');
        return;
      }

      pipeline.processStructuredData(structured);

      switch (structured.type) {
        case 'auto_planning':
          setAutoplanReady(true);
          setContentSpecReady(false);
          setDeckDesignPlanReady(false);
          setProcessingStatus(null);
          setMobileTab('preview');
          break;
        case 'content_spec':
          setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
          setContentSpecReady(false);
          setDeckDesignPlanReady(false);
          setMobileTab('preview');
          if (currentStep === 2) {
            const contentSpec = structured.data as ContentSpecification;
            const nextStep: StepId = 3;
            const nextState = {
              ...pipelineState,
              currentStep: nextStep,
              contentSpec,
            };
            pipeline.advanceStep();
            setProcessingStatus('콘텐츠 명세를 바탕으로 디자인 플랜을 생성하고 있습니다...');
            const nextText = await sendMessage(
              '콘텐츠 명세서를 바탕으로 Deck Design Plan을 생성해주세요.',
              nextStep,
              nextState
            );
            await processResponse(nextText, nextStep, nextState);
          }
          break;
        case 'deck_design_plan':
          setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
          setContentSpecReady(false);
          setDeckDesignPlanReady(true);
          setProcessingStatus(null);
          setMobileTab('preview');
          break;
        case 'expression_candidates':
          setSelectedOptionId(null);
          setProcessingStatus(null);
          setMobileTab('preview');
          break;
        case 'slide_candidates': {
          // Step 5: post-process → coverage check → retry loop → confirm → chain
          if (currentStep === 5) {
            const sc = structured.data as { slideNumber: number; candidates: SlideCandidate[] };
            if (sc.candidates.length >= 1) {
              let slide = sc.candidates[0].slide;
              const slideNum = slide.slideNumber;

              // Post-process: auto-correct role violations
              const spec = pipelineState.contentSpec?.slideSpecs.find((s) => s.slideNumber === slideNum);
              const assignment = pipelineState.deckDesignPlan?.roleAssignments.find((ra) => ra.slideNumber === slideNum);
              if (spec && assignment) {
                const { corrected, logs } = postProcessSlide(slide, assignment, spec);
                slide = corrected;
                printCorrectionLogs(logs);

                // Coverage check
                const coverage = scoreSlideCompleteness(spec, slide);
                const retries = retryCountRef.current[slideNum] || 0;

                if (coverage.score < 0.9 && retries < 2) {
                  retryCountRef.current[slideNum] = retries + 1;
                  setProcessingStatus(`슬라이드 ${slideNum}번 커버리지 ${(coverage.score * 100).toFixed(0)}% — 누락 요소 보완 재시도 (${retries + 1}/2)...`);
                  const missingList = coverage.missing.map((m) => `- "${m}" — 구체적 수치나 사례와 함께 포함하세요`).join('\n');
                  const retryMsg = `슬라이드 ${slideNum}번에서 다음 필수 요소가 누락되었습니다:\n${missingList}\n\n기존 슬라이드 내용은 유지하되, 위 요소를 반드시 bulletPoints에 "항목명: 구체적 설명(수치 포함)" 형태로 추가해서 다시 완성해주세요. 추상적 표현 금지.`;
                  const retryText = await sendMessage(retryMsg, 5, pipelineState);
                  await processResponse(retryText, 5, pipelineState, false);
                  return;
                }

                if (coverage.score < 0.9) {
                  console.warn(`[경고] 슬라이드 ${slideNum} 커버리지 ${(coverage.score * 100).toFixed(0)}% — 2회 재시도 후에도 미달. 현재 결과로 확정.`);
                }
              }

              // Confirm and chain to next
              pipeline.confirmSlide(slide);
              const updatedState = {
                ...pipelineState,
                completedSlides: [...pipelineState.completedSlides.filter((s) => s.slideNumber !== slideNum), slide],
              };
              const nextSlide = findNextSlideNeedingRealization(updatedState);
              if (nextSlide) {
                pipeline.setCurrentSlideIndex(nextSlide - 1);
                setProcessingStatus(`슬라이드 ${nextSlide}번을 완성하고 있습니다...`);
                const nextState = { ...updatedState, currentStep: 5 as StepId, currentSlideIndex: nextSlide - 1 };
                const nextText = await sendMessage(
                  `슬라이드 ${nextSlide}번을 선택된 표현 방식으로 완성해주세요.`,
                  5,
                  nextState
                );
                await processResponse(nextText, 5, nextState);
              } else {
                setCompletedSteps((prev) => [...new Set([...prev, 5])]);
                setProcessingStatus(null);
                setMobileTab('preview');
              }
              return;
            }
          }
          setSelectedOptionId(null);
          setProcessingStatus(null);
          setMobileTab('preview');
          break;
        }
      }
    },
    [pipeline, sendMessage, showToast]
  );

  const handleSend = useCallback(
    async (content: string) => {
      const resetStep = detectResetStep(content);
      let stepToUse = pipeline.state.currentStep;
      let stateToUse = pipeline.state;

      if (resetStep !== null && pipeline.state.currentStep >= resetStep) {
        pipeline.resetFromStep(resetStep);
        stepToUse = resetStep;
        stateToUse = {
          ...pipeline.state,
          currentStep: resetStep,
          ...(resetStep <= 1 ? {
            autoPlanning: undefined,
            context: undefined,
            selectedDirection: undefined,
            architectureBlueprintDecision: undefined,
            confirmedSlideCount: undefined,
            selectedStructure: undefined,
            contentSpec: undefined,
            deckDesignPlan: undefined,
            expressionCandidates: undefined,
            selectedExpressions: {},
            finalPlan: undefined,
            slideCandidates: undefined,
            completedSlides: [],
            currentSlideIndex: 0,
          } : {}),
          ...(resetStep === 2 ? {
            contentSpec: undefined,
            deckDesignPlan: undefined,
            expressionCandidates: undefined,
            selectedExpressions: {},
            finalPlan: undefined,
            slideCandidates: undefined,
            completedSlides: [],
            currentSlideIndex: 0,
          } : {}),
          ...(resetStep === 3 ? {
            deckDesignPlan: undefined,
            expressionCandidates: undefined,
            selectedExpressions: {},
            slideCandidates: undefined,
          } : {}),
          ...(resetStep === 4 ? {
            expressionCandidates: undefined,
            selectedExpressions: {},
            slideCandidates: undefined,
            completedSlides: [],
          } : {}),
        };
        setAutoplanReady(false);
        setContentSpecReady(false);
        setDeckDesignPlanReady(false);
      }

      setProcessingStatus(stepToUse === 1
        ? '자동 기획을 다시 계산하고 있습니다...'
        : stepToUse === 2
          ? '콘텐츠 명세를 다시 정리하고 있습니다...'
          : stepToUse === 3
            ? '디자인 스타일을 다시 생성하고 있습니다...'
            : '요청을 처리하고 있습니다...');
      const fullText = await sendMessage(content, stepToUse, stateToUse);
      await processResponse(fullText, stepToUse, stateToUse);
    },
    [sendMessage, pipeline, processResponse]
  );

  const handleConfirmAutoPlanning = useCallback(async () => {
    setAutoplanReady(false);
    setIsProcessing(true);
    setProcessingStatus('확정된 구조를 바탕으로 콘텐츠 명세를 작성하고 있습니다...');
    try {
      setCompletedSteps((prev) => [...new Set([...prev, 1])]);
      pipeline.advanceStep();

      const nextStep: StepId = 2;
      const nextState = { ...pipeline.state, currentStep: nextStep };
      const msg = '확정된 슬라이드 구조를 기반으로 콘텐츠 명세서를 작성해주세요.';
      const fullText = await sendMessage(msg, nextStep, nextState);
      await processResponse(fullText, nextStep, nextState);
    } finally {
      setIsProcessing(false);
    }
  }, [pipeline, sendMessage, processResponse]);

  const handleSelectOption = useCallback((optionId: string) => {
    setSelectedOptionId(optionId);
    pipeline.selectOption(optionId);
  }, [pipeline]);

  const handleOptionConfirm = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Step 4: expression selection
      if (pipeline.state.currentStep === 4 && pipeline.state.expressionCandidates) {
        const selected = pipeline.state.expressionCandidates.find((c: ExpressionCandidate) => c.id === selectedOptionId);
        if (!selected) return;

        pipeline.selectExpression(selected.slideNumber, selected);
        setSelectedOptionId(null);

        // Check if more slides need expression
        const updatedState = { ...pipeline.state, selectedExpressions: { ...pipeline.state.selectedExpressions, [selected.slideNumber]: selected } };
        const nextSlide = findNextSlideNeedingExpression(updatedState);

        if (nextSlide) {
          pipeline.setCurrentSlideIndex(nextSlide - 1);
          setProcessingStatus(`슬라이드 ${nextSlide}번의 표현 방식을 생성하고 있습니다...`);
          const nextState = { ...updatedState, currentSlideIndex: nextSlide - 1 };
          const fullText = await sendMessage(
            `슬라이드 ${nextSlide}번의 시각 표현 방식 후보를 생성해주세요.`,
            4,
            nextState
          );
          await processResponse(fullText, 4, nextState);
        } else {
          // All expressions selected → advance to Step 5
          setCompletedSteps((prev) => [...new Set([...prev, 4])]);
          pipeline.advanceStep();
          const step5State = { ...updatedState, currentStep: 5 as StepId };
          const firstSlide = findNextSlideNeedingRealization(step5State);
          if (firstSlide) {
            pipeline.setCurrentSlideIndex(firstSlide - 1);
            setProcessingStatus(`슬라이드 ${firstSlide}번을 완성하고 있습니다...`);
            const nextState = { ...step5State, currentSlideIndex: firstSlide - 1 };
            const fullText = await sendMessage(
              `슬라이드 ${firstSlide}번을 선택된 표현 방식으로 완성해주세요.`,
              5,
              nextState
            );
            await processResponse(fullText, 5, nextState);
          }
        }
        return;
      }

      // Step 5 or legacy: slide candidate confirmation
      if (pipeline.state.slideCandidates) {
        setProcessingStatus('선택한 슬라이드를 baseline deck에 반영하고 있습니다...');
        const selected = pipeline.state.slideCandidates.find((c: SlideCandidate) => c.id === selectedOptionId);
        if (!selected) return;

        pipeline.confirmSlide(selected.slide);
        setSelectedOptionId(null);
        pipeline.clearSlideCandidates();
        setCompletedSteps((prev) => [...new Set([...prev, pipeline.state.currentStep])]);
        setProcessingStatus(null);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [pipeline, selectedOptionId, sendMessage, processResponse]);

  const handleConfirmContentSpec = useCallback(async () => {
    setContentSpecReady(false);
    setIsProcessing(true);
    setProcessingStatus('콘텐츠 명세를 바탕으로 디자인 플랜을 생성하고 있습니다...');
    try {
      pipeline.advanceStep();
      const nextStep: StepId = 3;
      const nextState = { ...pipeline.state, currentStep: nextStep };
      const msg = '콘텐츠 명세서를 바탕으로 Deck Design Plan을 생성해주세요.';
      const nextText = await sendMessage(msg, nextStep, nextState);
      await processResponse(nextText, nextStep, nextState);
    } finally {
      setIsProcessing(false);
    }
  }, [pipeline, sendMessage, processResponse]);

  const handleConfirmDeckDesignPlan = useCallback(async () => {
    setDeckDesignPlanReady(false);
    setIsProcessing(true);
    try {
      pipeline.advanceStep(); // 3 → 4
      setCompletedSteps((prev) => [...new Set([...prev, 3])]);

      const firstSlide = findNextSlideNeedingExpression(pipeline.state);
      if (firstSlide) {
        pipeline.setCurrentSlideIndex(firstSlide - 1);
        const nextState = { ...pipeline.state, currentStep: 4 as StepId, currentSlideIndex: firstSlide - 1 };
        setProcessingStatus(`슬라이드 ${firstSlide}번의 표현 방식을 생성하고 있습니다...`);
        const fullText = await sendMessage(
          `슬라이드 ${firstSlide}번의 시각 표현 방식 후보를 생성해주세요.`,
          4,
          nextState
        );
        await processResponse(fullText, 4, nextState);
      }
      setMobileTab('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [pipeline, sendMessage, processResponse]);

  const handleSelectTheme = useCallback((themeId: string) => {
    pipeline.setTheme(themeId);
  }, [pipeline]);

  const handleUpdateSlideComposition = useCallback((slideIndex: number, composition: CompositionVariant) => {
    pipeline.setSlideComposition(slideIndex, composition);
  }, [pipeline]);

  const handleRequestNewOptions = useCallback(async () => {
    setSelectedOptionId(null);
    setIsProcessing(true);
    const slideNum = pipeline.state.currentSlideIndex + 1;
    try {
      if (pipeline.state.currentStep === 4) {
        setProcessingStatus(`슬라이드 ${slideNum}번의 다른 표현 방식을 생성하고 있습니다...`);
        const fullText = await sendMessage(
          `슬라이드 ${slideNum}번의 시각 표현 방식 후보를 다시 생성해주세요. 이전과 다른 expressionFamily를 사용해주세요.`,
          4,
          pipeline.state
        );
        await processResponse(fullText, 4, pipeline.state);
      } else {
        setProcessingStatus(`슬라이드 ${slideNum}번의 대안을 생성하고 있습니다...`);
        const fullText = await sendMessage(
          `슬라이드 ${slideNum}번을 레퍼런스 스타일은 유지하되 다른 안으로 제안해주세요.`,
          pipeline.state.currentStep,
          pipeline.state
        );
        await processResponse(fullText, pipeline.state.currentStep, pipeline.state);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [sendMessage, pipeline, processResponse]);

  const handleRegenerateSlide = useCallback(async (slideIndex: number) => {
    setSelectedOptionId(null);
    setIsProcessing(true);
    const slideNum = slideIndex + 1;
    setProcessingStatus(`슬라이드 ${slideNum}번의 표현 방식을 생성하고 있습니다...`);
    try {
      pipeline.setCurrentSlideIndex(slideIndex);
      const nextState = {
        ...pipeline.state,
        currentStep: 4 as StepId,
        currentSlideIndex: slideIndex,
      };
      pipeline.goToStep(4);
      const msg = `슬라이드 ${slideNum}번의 시각 표현 방식 후보를 생성해주세요.`;
      const fullText = await sendMessage(msg, 4, nextState);
      await processResponse(fullText, 4, nextState);
      setMobileTab('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [pipeline, sendMessage, processResponse]);

  const handleCloseSlideCandidates = useCallback(() => {
    setSelectedOptionId(null);
    pipeline.clearSlideCandidates();
    setProcessingStatus(null);
  }, [pipeline]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadingFile(file.name);
      setProcessingStatus('업로드한 문서를 열고 텍스트를 추출하고 있습니다...');
      setShowDocStep(true);
      setContentSpecReady(false);
      setDeckDesignPlanReady(false);
      setAutoplanReady(false);
      pipeline.resetFromStep(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('provider', provider);

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || '파일 업로드 실패');
        }
        const { text } = await uploadRes.json();
        setProcessingStatus('요구사항과 제약조건을 분석하고 있습니다...');

        const analyzeRes = await fetch('/api/analyze-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, provider }),
        });
        if (!analyzeRes.ok) {
          const err = await analyzeRes.json();
          throw new Error(err.error || '문서 분석 실패');
        }
        const analysis = await analyzeRes.json();
        analysis.rawText = text;
        setUploadingFile(null);
        setProcessingStatus('레퍼런스를 반영해 전체 발표 구조를 자동 기획하고 있습니다...');

        pipeline.setDocumentAnalysis(analysis);
        setCompletedSteps((prev) => [...new Set([...prev, 0])]);

        // Step 1: 맥락 분석 + 방향 설정 (병합)
        const pipelineStateWithDoc = { ...pipeline.state, documentAnalysis: analysis, currentStep: 1 as const };
        const fullText = await sendMessage(
          `문서가 분석되었습니다: ${file.name}\n\n요약: ${analysis.summary}`,
          1,
          pipelineStateWithDoc
        );
        await processResponse(fullText, 1, pipelineStateWithDoc);
      } catch (error) {
        console.error('Document processing error:', error);
        setProcessingStatus(null);
        showToast(error instanceof Error ? error.message : '문서 처리 중 오류가 발생했습니다', 'error');
      } finally {
        setUploadingFile(null);
      }
    },
    [provider, pipeline, sendMessage, processResponse]
  );

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          PPT Agent
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReferencePanel(true)}
            className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
          >
            참고 제안서 {referenceCount > 0 && `(${referenceCount})`}
          </button>
          <LlmProviderSelect value={provider} onChange={setProvider} />
          <ThemeToggle />
        </div>
      </header>

      {/* Step Indicator */}
      <StepIndicator
        currentStep={pipeline.state.currentStep}
        completedSteps={completedSteps as any}
        onStepClick={(id) => pipeline.goToStep(id)}
        showDocStep={showDocStep}
      />

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            mobileTab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          채팅
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            mobileTab === 'preview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          미리보기
        </button>
      </div>

      {/* Main content: 2-panel layout */}
      <div ref={mainContentRef} className="flex-1 flex min-h-0">
        {/* Left: Chat panel */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className={`flex flex-col shrink-0 ${
            mobileTab === 'chat' ? 'flex' : 'hidden'
          } md:flex`}
        >
          <MessageList messages={messages} isStreaming={isStreaming} />

          {/* 옵션이 있으면 안내 메시지 */}
          {pipeline.currentOptions.length > 0 && !isStreaming && pipeline.state.currentStep === 4 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                오른쪽 패널에서 후보를 비교하고 선택하세요
              </p>
            </div>
          )}

          <ChatInput
            onSend={handleSend}
            onFileUpload={handleFileUpload}
            disabled={isStreaming}
            hasMessages={messages.length > 0}
            uploadingFileName={uploadingFile}
            uploadingStatusText={processingStatus}
          />
        </div>

        {/* Resizer handle */}
        <PanelResizer onResize={setLeftPanelWidth} containerRef={mainContentRef} />

        {/* Right: Preview panel */}
        <div
          className={`flex-1 min-w-0 ${
            mobileTab === 'preview' ? 'flex' : 'hidden'
          } md:flex flex-col`}
        >
          <PreviewPanel
            pipelineState={pipeline.state}
            options={pipeline.currentOptions}
            selectedOptionId={selectedOptionId}
            onSelectOption={handleSelectOption}
            onConfirmOption={handleOptionConfirm}
            onRequestNewOptions={handleRequestNewOptions}
            onSelectTheme={handleSelectTheme}
            onUpdateSlideComposition={handleUpdateSlideComposition}
            contentSpecReady={contentSpecReady}
            onConfirmContentSpec={handleConfirmContentSpec}
            deckDesignPlanReady={deckDesignPlanReady}
            onConfirmDeckDesignPlan={handleConfirmDeckDesignPlan}
            autoplanReady={autoplanReady}
            onConfirmAutoPlanning={handleConfirmAutoPlanning}
            onRegenerateSlide={handleRegenerateSlide}
            onCloseSlideCandidates={handleCloseSlideCandidates}
            isStreaming={isStreaming}
            isProcessing={isProcessing}
            statusMessage={processingStatus}
          />
        </div>
      </div>

      {/* Reference panel (slide-out drawer) */}
      <ReferencePanel
        open={showReferencePanel}
        onClose={() => {
          setShowReferencePanel(false);
          fetch('/api/references')
            .then((res) => res.json())
            .then((data) => { if (Array.isArray(data)) setReferenceCount(data.length); })
            .catch(() => {});
        }}
        provider={provider}
      />
    </div>
  );
}

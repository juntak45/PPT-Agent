'use client';

import { PipelineState, OptionCandidate, CompositionVariant, SlideContent, FinalSlide } from '@/lib/types';
import { getThemeById } from '@/lib/slideThemes';
import { useSlidePreview } from '@/hooks/useSlidePreview';
import { usePptGeneration } from '@/hooks/usePptGeneration';
import { countSlidesNeedingExpression } from '@/lib/pipeline/slideProgress';
import SlideRenderer from './SlideRenderer';
import ExpressionWireframeRenderer from './ExpressionWireframeRenderer';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ThemeSelector from '@/components/settings/ThemeSelector';

interface PreviewPanelProps {
  pipelineState: PipelineState;
  options?: OptionCandidate[];
  selectedOptionId?: string | null;
  onSelectOption?: (id: string) => void;
  onConfirmOption?: () => void;
  onRequestNewOptions?: () => void;
  onSelectTheme?: (themeId: string) => void;
  onUpdateSlideComposition?: (slideIndex: number, composition: CompositionVariant) => void;
  autoplanReady?: boolean;
  onConfirmAutoPlanning?: () => void;
  contentSpecReady?: boolean;
  onConfirmContentSpec?: () => void;
  deckDesignPlanReady?: boolean;
  onConfirmDeckDesignPlan?: () => void;
  onRegenerateSlide?: (slideIndex: number) => void;
  onCloseSlideCandidates?: () => void;
  isStreaming?: boolean;
  isProcessing?: boolean;
  statusMessage?: string | null;
}

function roleLabel(role: FinalSlide['roleAssignment']['role']): string {
  const labels: Record<string, string> = {
    cover: '표지',
    toc: '목차',
    'section-divider': '섹션 구분',
    'key-message': '핵심 메시지',
    'detailed-explanation': '상세 설명',
    'data-visualization': '데이터 시각화',
    comparison: '비교',
    'architecture-blueprint': '청사진',
    conclusion: '결론',
  };
  return labels[role] || role;
}

function strategyLabel(strategy: FinalSlide['strategy']): string {
  const labels: Record<FinalSlide['strategy'], string> = {
    reuse: 'reuse',
    adapt: 'adapt',
    generate: 'generate',
  };
  return labels[strategy];
}

export default function PreviewPanel({
  pipelineState,
  selectedOptionId,
  onSelectOption,
  onConfirmOption,
  onRequestNewOptions,
  onSelectTheme,
  autoplanReady,
  onConfirmAutoPlanning,
  contentSpecReady,
  onConfirmContentSpec,
  deckDesignPlanReady,
  onConfirmDeckDesignPlan,
  onRegenerateSlide,
  onCloseSlideCandidates,
  isStreaming,
  isProcessing,
  statusMessage,
}: PreviewPanelProps) {
  const { slides, currentSlideIndex, totalSlides, goToSlide, nextSlide, prevSlide } = useSlidePreview(pipelineState);
  const { isGenerating, error, generateAndDownload } = usePptGeneration();
  const activeTheme = getThemeById(pipelineState.selectedThemeId || 'corporate-blue');

  const currentSlide = slides[currentSlideIndex];
  const finalSlides = pipelineState.finalPlan?.slides || [];
  const activeCandidateSlideNumber = pipelineState.currentSlideIndex + 1;
  const activeFinalSlide = finalSlides.find((slide) => slide.slideNumber === activeCandidateSlideNumber);
  const isCandidateMode = pipelineState.currentStep === 4 && !!pipelineState.slideCandidates?.length;

  const handleDownload = () => {
    if (pipelineState.finalPlan) {
      generateAndDownload(pipelineState.finalPlan);
    }
  };

  if (autoplanReady && pipelineState.selectedDirection && pipelineState.selectedStructure) {
    const dir = pipelineState.selectedDirection;
    const struct = pipelineState.selectedStructure;
    const bp = pipelineState.architectureBlueprintDecision;
    const previewSlides: SlideContent[] = [];
    let slideNum = 1;

    for (const section of struct.sections) {
      for (let idx = 0; idx < section.slideCount; idx++) {
        previewSlides.push({
          slideNumber: slideNum,
          title: idx === 0 ? section.sectionTitle : `${section.sectionTitle} ${idx + 1}`,
          subTitle: section.purpose,
          layout: slideNum === 1 ? 'title-slide' : 'title-content',
          contentType: 'bullets',
          bulletPoints: idx === 0 ? section.keyPoints.slice(0, 3) : undefined,
          bodyText: section.purpose,
          speakerNotes: '',
        });
        slideNum++;
      }
    }

    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">자동 기획 결과</h3>
          <p className="text-xs text-gray-400 mt-0.5">레퍼런스 기반으로 방향, 장수, 구조가 자동 결정되었습니다.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">발표 방향</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                {dir.tone}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dir.approach}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{dir.narrative}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-blue-500">{pipelineState.confirmedSlideCount}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">slides</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{struct.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {bp && bp.mode !== 'none'
                    ? `청사진 포함: ${bp.mode} (+${bp.slideCountImpact}장)`
                    : '청사진 포함 없음'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">섹션 구성</p>
            {struct.sections.map((section, index) => (
              <div key={`${section.sectionTitle}-${index}`} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs font-bold text-blue-500 w-6 text-right">{section.slideCount}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{section.sectionTitle}</p>
                  <p className="text-[10px] text-gray-400 truncate">{section.purpose}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">미리보기</p>
            <div className="grid grid-cols-3 gap-2">
              {previewSlides.slice(0, 6).map((slide) => (
                <div key={slide.slideNumber} className="rounded-lg overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                  <SlideRenderer slide={slide} theme={activeTheme} scale={0.28} />
                </div>
              ))}
            </div>
            {previewSlides.length > 6 && (
              <p className="text-[10px] text-gray-400 text-center">외 {previewSlides.length - 6}장</p>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onConfirmAutoPlanning} disabled={isProcessing} className="w-full" size="md">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> 콘텐츠 작성 준비 중...</span>
            ) : '확인 — 콘텐츠 문서화 시작'}
          </Button>
        </div>
      </div>
    );
  }

  if (deckDesignPlanReady && pipelineState.deckDesignPlan) {
    const plan = pipelineState.deckDesignPlan;
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">디자인 스타일 리뷰</h3>
            {onSelectTheme && (
              <ThemeSelector
                selectedThemeId={pipelineState.selectedThemeId || 'corporate-blue'}
                onSelect={onSelectTheme}
              />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">톤과 역할 분배를 확인한 뒤 baseline deck을 생성합니다.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">{plan.tone}</span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">{plan.visualMotif}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{plan.typographyStrategy}</span>
          </div>
          {plan.roleAssignments.map((assignment) => (
            <div key={assignment.slideNumber} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-500">#{assignment.slideNumber}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{roleLabel(assignment.role)}</span>
                </div>
                <span className="text-[10px] text-gray-400">{assignment.preferredLayout} / {assignment.preferredComposition}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{assignment.sectionName}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onConfirmDeckDesignPlan} disabled={isProcessing} className="w-full" size="md">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> baseline deck 준비 중...</span>
            ) : '확인 완료 — baseline deck 보기'}
          </Button>
        </div>
      </div>
    );
  }

  if (contentSpecReady && pipelineState.contentSpec) {
    const spec = pipelineState.contentSpec;
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">콘텐츠 명세서 검토</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">{spec.title}</h4>
            {spec.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{spec.subtitle}</p>}
            <p className="text-xs text-gray-400 mt-2">{spec.narrativeArc}</p>
            {spec.strategySummary && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{spec.strategySummary}</p>
            )}
          </div>
          {spec.slideSpecs.map((slide) => (
            <div key={slide.slideNumber} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                  {slide.slideNumber}
                </span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{slide.sectionName}</span>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{slide.keyMessage}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{slide.purpose}</p>
              {slide.customerNeed && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                  고객 요구: {slide.customerNeed}
                </p>
              )}
              {slide.decisionDriver && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  의사결정 포인트: {slide.decisionDriver}
                </p>
              )}
              {slide.referenceSlideNumber && (
                <p className="text-[11px] text-blue-500 mt-1">
                  reference #{slide.referenceSlideNumber}
                  {slide.referenceContentStrategy ? ` · ${slide.referenceContentStrategy}` : ''}
                </p>
              )}
              {slide.messageRationale && (
                <p className="text-[11px] text-gray-400 mt-1">{slide.messageRationale}</p>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onConfirmContentSpec} disabled={isProcessing} className="w-full" size="md">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> 디자인 플랜 생성 중...</span>
            ) : '확인 완료 — 디자인 플랜 생성'}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Expression Selection Mode (Step 4) ───
  const isExpressionMode = pipelineState.currentStep === 4 && !!pipelineState.expressionCandidates?.length;

  if (isExpressionMode && pipelineState.expressionCandidates) {
    const slideNum = pipelineState.currentSlideIndex + 1;
    const remaining = countSlidesNeedingExpression(pipelineState);
    const total = pipelineState.confirmedSlideCount || 0;
    const completed = total - remaining;

    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                슬라이드 {slideNum} 표현 방식 선택
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {completed}/{total} 완료 · 근본적으로 다른 시각적 표현을 비교하세요
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {pipelineState.expressionCandidates.map((candidate) => {
            const isSelected = selectedOptionId === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onSelectOption?.(candidate.id)}
                className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-blue-300'
                }`}
              >
                <div className={`px-3 py-2 flex items-center justify-between ${
                  isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  <span className="text-xs font-semibold">{candidate.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isSelected ? 'bg-blue-400 text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {candidate.expressionFamily}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
                  <div className="flex justify-center">
                    <ExpressionWireframeRenderer wireframe={candidate.wireframe} family={candidate.expressionFamily} />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{candidate.description}</p>
                  <p className="text-[10px] text-gray-400">{candidate.rationale}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button onClick={onConfirmOption} disabled={!selectedOptionId || isProcessing} className="w-full" size="md">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> 처리 중...</span>
            ) : '표현 방식 확정'}
          </Button>
          <button
            onClick={onRequestNewOptions}
            disabled={isProcessing}
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 py-2 transition-colors"
          >
            다른 표현 방식 받기
          </button>
        </div>
      </div>
    );
  }

  if (isCandidateMode && pipelineState.slideCandidates && activeFinalSlide) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                슬라이드 {activeFinalSlide.slideNumber} 재제안
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {roleLabel(activeFinalSlide.roleAssignment.role)} · {strategyLabel(activeFinalSlide.strategy)}
              </p>
            </div>
            <button
              onClick={onCloseSlideCandidates}
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors"
            >
              baseline으로 돌아가기
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {pipelineState.slideCandidates.map((candidate) => {
            const isSelected = selectedOptionId === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onSelectOption?.(candidate.id)}
                className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-blue-300'
                }`}
              >
                <div className={`px-3 py-2 flex items-center justify-between ${
                  isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  <span className="text-xs font-semibold">{candidate.label}</span>
                  <span className="text-[10px] opacity-80">{candidate.description}</span>
                </div>
                <div className="p-3 flex justify-center bg-white dark:bg-gray-900">
                  <SlideRenderer slide={candidate.slide} theme={activeTheme} scale={0.62} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button onClick={onConfirmOption} disabled={!selectedOptionId || isProcessing} className="w-full" size="md">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> 적용 중...</span>
            ) : '선택 확정'}
          </Button>
          <button
            onClick={onRequestNewOptions}
            disabled={isProcessing}
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 py-2 transition-colors"
          >
            다른 3안 다시 받기
          </button>
        </div>
      </div>
    );
  }

  const allSlidesComplete = !!pipelineState.finalPlan && pipelineState.finalPlan.slides.every((slide) => slide.approved);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">baseline deck</h3>
          <p className="text-xs text-gray-400 mt-0.5">수정이 필요한 슬라이드만 선택해서 재제안 받을 수 있습니다.</p>
        </div>
        {onSelectTheme && (
          <ThemeSelector
            selectedThemeId={pipelineState.selectedThemeId || 'corporate-blue'}
            onSelect={onSelectTheme}
          />
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {currentSlide ? (
          <SlideRenderer slide={currentSlide} isActive theme={activeTheme} />
        ) : (
          <div className="text-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">{statusMessage || 'baseline deck이 생성되면 여기에 표시됩니다.'}</p>
          </div>
        )}
      </div>

      {totalSlides > 0 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {currentSlideIndex + 1} / {totalSlides}
          </span>
          <button
            onClick={nextSlide}
            disabled={currentSlideIndex >= totalSlides - 1}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {finalSlides.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {finalSlides.map((slide, index) => {
              const preview = slide.approved || slide.candidates?.[0]?.slide;
              if (!preview) return null;
              const isActive = index === currentSlideIndex;
              return (
                <div key={slide.slideNumber} className="flex-shrink-0 space-y-1">
                  <button
                    onClick={() => goToSlide(index)}
                    className={`rounded-md overflow-hidden border-2 transition-all ${
                      isActive ? 'border-blue-500 shadow-sm' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <SlideRenderer slide={preview} scale={0.15} theme={activeTheme} />
                  </button>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-gray-400">#{slide.slideNumber}</span>
                    <button
                      onClick={() => onRegenerateSlide?.(index)}
                      disabled={isProcessing || isStreaming}
                      className="text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      수정하기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allSlidesComplete && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleDownload} disabled={isGenerating} className="w-full" size="md">
            {isGenerating ? (
              <span className="flex items-center gap-2"><Spinner size="sm" /> 생성 중...</span>
            ) : (
              'PPT 다운로드'
            )}
          </Button>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}

import { StepId, PipelineState, ReferenceAnalysis } from '../types';
import { buildReferenceBlock, buildStepSpecificHint, matchReferenceSlides } from '../reference/promptBuilder';
import { getExpressionRecommendations } from '../expression/recommender';

function buildContextBlock(state: PipelineState): string {
  const parts: string[] = [];

  if (state.documentAnalysis) {
    parts.push(`## 문서 분석 결과\n${state.documentAnalysis.summary}`);
    if (state.documentAnalysis.executiveSummary) {
      parts.push(`### 제안서 관점 핵심 해석\n${state.documentAnalysis.executiveSummary}`);
    }
    if (state.documentAnalysis.requirements.length > 0) {
      parts.push(`### 요구사항\n${state.documentAnalysis.requirements.map((r) => `- ${r}`).join('\n')}`);
    }
    if (state.documentAnalysis.businessRequirements && state.documentAnalysis.businessRequirements.length > 0) {
      parts.push(`### 비즈니스 요구\n${state.documentAnalysis.businessRequirements.map((r) => `- ${r}`).join('\n')}`);
    }
    if (state.documentAnalysis.technicalRequirements && state.documentAnalysis.technicalRequirements.length > 0) {
      parts.push(`### 기술 요구\n${state.documentAnalysis.technicalRequirements.map((r) => `- ${r}`).join('\n')}`);
    }
    if (state.documentAnalysis.nonFunctionalRequirements && state.documentAnalysis.nonFunctionalRequirements.length > 0) {
      parts.push(`### 비기능 요구\n${state.documentAnalysis.nonFunctionalRequirements.map((r) => `- ${r}`).join('\n')}`);
    }
    if (state.documentAnalysis.constraints.length > 0) {
      parts.push(`### 제약조건\n${state.documentAnalysis.constraints.map((c) => `- ${c}`).join('\n')}`);
    }
    if (state.documentAnalysis.customerProblems && state.documentAnalysis.customerProblems.length > 0) {
      parts.push(`### 고객 Pain Point\n${state.documentAnalysis.customerProblems.map((p) => `- ${p}`).join('\n')}`);
    }
    if (state.documentAnalysis.decisionDrivers && state.documentAnalysis.decisionDrivers.length > 0) {
      parts.push(`### 의사결정 포인트\n${state.documentAnalysis.decisionDrivers.map((d) => `- ${d}`).join('\n')}`);
    }
    if (state.documentAnalysis.currentState) {
      parts.push(`### 현재 상태(AS-IS)\n${state.documentAnalysis.currentState}`);
    }
    if (state.documentAnalysis.targetState) {
      parts.push(`### 목표 상태(TO-BE)\n${state.documentAnalysis.targetState}`);
    }
    if (state.documentAnalysis.proposalFocusAreas && state.documentAnalysis.proposalFocusAreas.length > 0) {
      parts.push(`### 제안서 강조 포인트\n${state.documentAnalysis.proposalFocusAreas.map((a) => `- ${a}`).join('\n')}`);
    }
    if (state.documentAnalysis.kpis && state.documentAnalysis.kpis.length > 0) {
      parts.push(`### 핵심 성과지표(KPI)\n${state.documentAnalysis.kpis.map((k) => `- ${k}`).join('\n')}`);
    }
    if (state.documentAnalysis.timeline) {
      parts.push(`### 일정/타임라인\n${state.documentAnalysis.timeline}`);
    }
    if (state.documentAnalysis.budget) {
      parts.push(`### 예산\n${state.documentAnalysis.budget}`);
    }
    if (state.documentAnalysis.risks && state.documentAnalysis.risks.length > 0) {
      parts.push(`### 리스크\n${state.documentAnalysis.risks.map((r) => `- ${r}`).join('\n')}`);
    }
    if (state.documentAnalysis.missingInformation && state.documentAnalysis.missingInformation.length > 0) {
      parts.push(`### 문서상 비어 있는 정보\n${state.documentAnalysis.missingInformation.map((r) => `- ${r}`).join('\n')}`);
    }
  }

  if (state.context) {
    parts.push(`## 발표 맥락\n- 주제: ${state.context.topic}\n- 대상: ${state.context.audience}\n- 목표: ${state.context.goal}\n- 도메인: ${state.context.domain}\n- 기술 주제 여부: ${state.context.isTechnical ? '예' : '아니오'}`);
  }

  if (state.selectedDirection) {
    parts.push(`## 선택된 방향\n- 접근법: ${state.selectedDirection.approach}\n- 서사: ${state.selectedDirection.narrative}\n- 톤: ${state.selectedDirection.tone}\n- 추천 슬라이드: ${state.selectedDirection.recommendedSlideCounts.join(', ')}장`);
  }

  if (state.architectureBlueprintDecision) {
    const bd = state.architectureBlueprintDecision;
    parts.push(`## 청사진 결정\n- 모드: ${bd.mode}\n- 포함 여부: ${bd.includeBlueprint ? '예' : '아니오'}${bd.focus ? `\n- 초점: ${bd.focus}` : ''}\n- 장수 영향: +${bd.slideCountImpact}장\n- 사유: ${bd.reason}`);
  }

  if (state.confirmedSlideCount) {
    parts.push(`## 확정 장수\n- **${state.confirmedSlideCount}장** (이 장수는 모든 하위 단계에서 반드시 준수)`);
  }

  if (state.selectedStructure) {
    parts.push(`## 선택된 슬라이드 구조\n${state.selectedStructure.sections.map((s) => `- ${s.sectionTitle} (${s.slideCount}장): ${s.purpose}`).join('\n')}\n총 ${state.selectedStructure.totalSlides}장`);
  }

  if (state.autoPlanning?.slidePlans?.length) {
    parts.push(`## 레퍼런스 매핑 계획\n${state.autoPlanning.slidePlans.map((plan) => `- 슬라이드 ${plan.slideNumber}: ${plan.strategy}${plan.referenceSlideNumber ? ` (레퍼런스 ${plan.referenceSlideNumber}번)` : ''} / ${plan.roleHint}`).join('\n')}`);
  }

  if (state.contentSpec) {
    parts.push(`## 콘텐츠 명세서\n- 제목: ${state.contentSpec.title}\n- 내러티브: ${state.contentSpec.narrativeArc}${state.contentSpec.strategySummary ? `\n- 전략 요약: ${state.contentSpec.strategySummary}` : ''}\n### 슬라이드별 명세\n${state.contentSpec.slideSpecs.map((s) => `- 슬라이드 ${s.slideNumber} [${s.sectionName}]: ${s.keyMessage} (필수: ${s.requiredElements.join(', ')}${s.suggestedVisual ? `, 시각화: ${s.suggestedVisual}` : ''}${s.referenceSlideNumber ? `, ref: ${s.referenceSlideNumber}` : ''})`).join('\n')}`);
  }

  if (state.deckDesignPlan) {
    const dp = state.deckDesignPlan;
    parts.push(`## Deck Design Plan\n- 톤: ${dp.tone} (${dp.toneDescription})\n- 비주얼 모티프: ${dp.visualMotif} (${dp.motifDescription})\n- 색상 전략: ${dp.colorStrategy}\n- 타이포: ${dp.typographyStrategy}\n### 역할 배정\n${dp.roleAssignments.map((ra) => `- 슬라이드 ${ra.slideNumber}: ${ra.role} [${ra.preferredLayout}/${ra.preferredComposition}] 밀도:${ra.density}`).join('\n')}`);
  }

  if (state.completedSlides.length > 0) {
    parts.push(`## 완성된 슬라이드 (${state.completedSlides.length}장)\n${state.completedSlides.map((s) => `- 슬라이드 ${s.slideNumber}: ${s.title} [${s.layout}, ${s.composition || 'default'}]`).join('\n')}`);
  }

  return parts.length > 0 ? `\n\n---\n\n# 현재까지의 진행 상황\n\n${parts.join('\n\n')}` : '';
}

const BASE_INSTRUCTION = `당신은 프레젠테이션 기획 전문가입니다. 항상 한국어로 응답하세요.
응답은 구조화되고 간결하게 작성하세요. 제목과 불릿 포인트를 활용하세요.

중요: 응답의 마지막에 반드시 아래 형식으로 구조화된 데이터를 포함하세요:
<!--STRUCTURED_DATA
{JSON 데이터}
-->

이 구조화된 데이터는 시스템이 자동으로 파싱하여 UI에 표시합니다.`;

export function getSystemPrompt(stepId: StepId, state: PipelineState, references?: ReferenceAnalysis[]): string {
  const contextBlock = buildContextBlock(state);
  const refBlock = references && references.length > 0 ? buildReferenceBlock(references) : '';
  const refHint = references && references.length > 0 ? buildStepSpecificHint(stepId, references) : '';

  switch (stepId) {
    // ─── Step 0: 문서 분석 (변경 없음) ───
    case 0:
      return `${BASE_INSTRUCTION}

사용자가 업로드한 문서(RFI/RFP/기술 요구사항)를 분석하세요.

다음을 추출하세요:
1. 핵심 요구사항 (Requirements)
1-1. 비즈니스 요구 / 기술 요구 / 비기능 요구 분류
2. 시스템 제약조건 (Constraints)
3. 이해관계자 (Stakeholders)
4. 연동 포인트 (Integration Points)
5. 전체 요약
5-1. 제안서 관점 핵심 해석(executiveSummary)
5-2. 고객 Pain Point, 의사결정 포인트, 강조 포인트
5-3. 현재 상태(AS-IS)와 목표 상태(TO-BE)
6. 핵심 성과지표/KPI (있는 경우)
7. 일정/타임라인 (있는 경우)
8. 예산 정보 (있는 경우)
9. 리스크 요인 (있는 경우)
10. 문서상 비어 있는 정보 / 제안서에서 가정이 필요한 정보

구조화된 데이터 형식:
<!--STRUCTURED_DATA
{"type":"doc_analysis","data":{"requirements":["..."],"businessRequirements":["..."],"technicalRequirements":["..."],"nonFunctionalRequirements":["..."],"constraints":["..."],"stakeholders":["..."],"integrationPoints":["..."],"summary":"...","executiveSummary":"...","customerProblems":["..."],"decisionDrivers":["..."],"currentState":"...","targetState":"...","proposalFocusAreas":["..."],"kpis":["..."],"timeline":"...","budget":"...","risks":["..."],"missingInformation":["..."]}}
-->`;

    // ─── Step 1: 자동 기획 (Auto Planning) ───
    case 1:
      return `${BASE_INSTRUCTION}
${contextBlock}${refBlock}

사용자의 입력${state.documentAnalysis ? '과 문서 분석 결과' : ''}를 바탕으로 발표 전체를 자동으로 기획하세요.${refHint}

레퍼런스 자료가 있다면 반드시 참고하여 비슷한 수준의 완성도와 구조를 목표로 하세요.

다음을 **모두** 한 번에 결정하세요:

## 1. 발표 맥락 분석
- 발표 목표(goal), 대상 청중(audience), 도메인(domain)
- 핵심 문제(problem), 제약 조건(constraints), 키워드(keywords)
- 기술 주제 여부(isTechnical)

## 2. 발표 방향 (최적 1개 자동 결정)
- 가장 적합한 접근법 (예: "문제-해결 내러티브", "기술 아키텍처 중심")
- 서사 흐름 (→ 기호로 구분)
- 발표 톤
- 추천 슬라이드 수 범위 [min, mid, max]

## 3. 아키텍처 청사진 (자동 결정)
- 기술 주제가 아니면 mode: "none", slideCountImpact: 0
- 기술 주제면 문서/레퍼런스 기반으로 적절한 모드 자동 결정:
  none(+0) / summary-1(+1) / compare-2(+2) / detailed-3(+3)

## 4. 슬라이드 장수 (자동 확정)
- 추천 범위 + 청사진 영향 반영한 최적 장수 1개

## 5. 슬라이드 구조 (자동 결정)
- 확정 장수에 맞는 섹션 구조
- 각 섹션: 제목, 슬라이드 수, 목적, 핵심 포인트
- **섹션별 슬라이드 수 합계 = 확정 장수 (반드시 일치)**

## 6. reference-to-target slide mapping
- 각 슬라이드마다 roleHint를 지정하세요
- 각 슬라이드마다 전략을 지정하세요:
  - reuse: 레퍼런스 슬라이드를 거의 그대로 재사용 가능한 경우
  - adapt: 레퍼런스 레이아웃은 유지하고 내용만 교체하는 경우
  - generate: 신규 청사진/비교/분석처럼 새로 생성이 필요한 경우
- 레퍼런스에서 가장 유사한 슬라이드가 있다면 referenceSlideNumber를 지정하고, 왜 매핑했는지 간단히 적으세요

구조화된 데이터 형식:
<!--STRUCTURED_DATA
{"type":"auto_planning","data":{"context":{"topic":"...","audience":"...","goal":"...","domain":"...","problem":"...","constraints":["..."],"keywords":["..."],"isTechnical":true},"direction":{"id":"dir-auto","approach":"...","narrative":"단계1 → 단계2 → 단계3","tone":"...","recommendedSlideCounts":[8,10,12]},"blueprintDecision":{"includeBlueprint":false,"mode":"none","focus":null,"reason":"...","slideCountImpact":0},"confirmedSlideCount":10,"structure":{"id":"struct-auto","title":"...","sections":[{"sectionTitle":"...","slideCount":2,"purpose":"...","keyPoints":["..."]}],"totalSlides":10},"slidePlans":[{"slideNumber":1,"sectionName":"표지","roleHint":"cover","strategy":"reuse","referenceSlideNumber":1,"referenceReason":"기존 표지를 거의 그대로 복사 가능"},{"slideNumber":2,"sectionName":"목차","roleHint":"toc","strategy":"adapt","referenceSlideNumber":2,"referenceReason":"목차 레이아웃은 유지하고 섹션명만 치환"}]}}
-->`;

    // ─── Step 2: 콘텐츠 문서화 ───
    case 2:
      return `${BASE_INSTRUCTION}
${contextBlock}${refBlock}

선택된 슬라이드 구조를 기반으로 **콘텐츠 명세서**를 작성하세요.${refHint}

이 명세서는 슬라이드별로 어떤 내용이 담겨야 하는지 정리하는 참조 문서입니다.
**주의**: 레이아웃, 구도, 디자인 결정은 이 단계에서 하지 않습니다. 콘텐츠만 정의하세요.
하지만 단순 요약이 아니라, 문서 요구사항을 레퍼런스 제안서가 처리한 방식까지 반영한 **제안서용 해석 문서**를 만들어야 합니다.

반드시 아래 순서로 생각하세요:
1. 문서 분석 결과에서 무엇을 가장 설득해야 하는지 정리
2. 레퍼런스가 비슷한 내용을 어떤 논리, 어떤 메시지 순서, 어떤 문체로 처리했는지 파악
3. 그 처리 방식을 현재 고객 문맥에 맞게 재해석해서 slideSpec에 반영

각 slideSpec은 가능하면 대응되는 reference slide의 전략을 이어받아야 합니다.
특히 다음을 강하게 반영하세요:
- referenceContentStrategy: 레퍼런스가 정보를 어떤 순서로 풀었는지
- referenceNarrativeConnection: 이전/다음 슬라이드와 어떻게 연결했는지
- referenceWritingPattern: 제목/불릿/강조 문체 패턴
- messageRationale: 왜 이 슬라이드의 핵심 메시지를 이렇게 잡았는지

각 슬라이드에 대해 다음을 정의하세요:
- 섹션명 (예: "현황분석", "제안개요")
- 목적 (이 슬라이드가 달성해야 할 것)
- 핵심 메시지 (청중이 기억해야 할 한 줄)
- 필수 요소 (반드시 포함해야 할 데이터/내용)
- 시각화 제안 (예: "아키텍처 청사진", "비교표", "흐름도", "통계 차트" 등)
- 다음 슬라이드로의 전환 (흐름 연결)
- customerNeed: 이 슬라이드가 해결하는 고객 요구 또는 pain point
- decisionDriver: 이 슬라이드가 겨냥하는 의사결정 포인트
- referenceSlideNumber: 가장 가깝게 따르는 reference slide 번호 (없으면 생략 가능)
- referenceContentStrategy: 해당 reference slide의 콘텐츠 처리 방식
- referenceNarrativeConnection: 해당 reference slide의 서사 연결 방식
- referenceWritingPattern: 해당 reference slide의 문체 패턴
- messageRationale: 왜 이 slideSpec이 현재 문서에 맞는지 설명

구조화된 데이터 형식:
<!--STRUCTURED_DATA
{"type":"content_spec","data":{"title":"...","subtitle":"...","totalSlides":${state.confirmedSlideCount},"narrativeArc":"문제 인식 → 현황 분석 → 해결책 → 기대효과","targetAudience":"...","presentationGoal":"...","strategySummary":"문서 요구사항을 어떻게 레퍼런스 방식으로 재해석했는지 요약","slideSpecs":[{"slideNumber":1,"sectionName":"...","purpose":"...","keyMessage":"...","requiredElements":["..."],"suggestedVisual":"...","transitionNote":"...","customerNeed":"...","decisionDriver":"...","referenceSlideNumber":1,"referenceContentStrategy":"...","referenceNarrativeConnection":"...","referenceWritingPattern":"...","messageRationale":"..."},...]}}
-->`;

    // ─── Step 3: 디자인 플랜 ───
    case 3:
      return `${BASE_INSTRUCTION}
${contextBlock}${refBlock}

콘텐츠 명세서와 발표 맥락을 기반으로 **Deck Design Plan**을 생성하세요.${refHint}

**이 단계의 역할**: 슬라이드별 레이아웃, 구도, 밀도 등 디자인 결정만 합니다. 텍스트 내용은 변경하지 않습니다.

다음 항목을 결정하세요:

1. **tone**: consulting / enterprise / pitch-deck / technical / creative / government
2. **visualMotif**: card-based / band-based / diagram-heavy / comparison-focused / data-driven / minimal-text
3. **roleAssignments**: 각 슬라이드에 역할 배정
   - 사용 가능한 역할: cover, toc, section-divider, key-message, detailed-explanation, data-visualization, comparison, architecture-blueprint, conclusion
   - 각 슬라이드에 preferredLayout, preferredComposition, density(low/medium/high), mustHaveElements 지정
4. **repetitionRules**: 같은 섹션의 슬라이드는 같은 layout/composition family 사용
5. **variationRules**: 역할별 변주 폭 (key-message=wide, detailed-explanation=narrow 등)
6. **emphasisRules**: 특정 trigger(숫자 강조, before/after 등)에 대한 처리 방법
7. **densityStrategy**: 역할별 텍스트 밀도 가이드라인
8. **colorStrategy**: accent 색상 사용 원칙
9. **typographyStrategy**: 제목/본문/수치/캡션 위계

사용 가능한 레이아웃: title-slide, title-content, two-column, image-text, chart, diagram, section-divider, conclusion
사용 가능한 구도: stack-vertical, side-by-side, hub-spoke, flow-horizontal, flow-vertical, grid-cards, comparison-table, timeline, icon-list, center-highlight, default

구조화된 데이터 형식:
<!--STRUCTURED_DATA
{"type":"deck_design_plan","data":{"tone":"...","toneDescription":"...","visualMotif":"...","motifDescription":"...","colorStrategy":"...","typographyStrategy":"...","densityStrategy":[{"role":"cover","density":"low","guideline":"..."},...],"repetitionRules":[{"sectionName":"...","layoutFamily":"title-content","compositionFamily":"grid-cards","reason":"..."},...],"variationRules":[{"role":"key-message","variationScope":"wide","description":"..."},...],"emphasisRules":[{"trigger":"...","treatment":"...","preferredComposition":"center-highlight"},...],"roleAssignments":[{"slideNumber":1,"role":"cover","sectionName":"...","preferredLayout":"title-slide","preferredComposition":"default","density":"low","mustHaveElements":["제목","부제목"]},...]}}
-->`;

    // ─── Step 4: 표현 방식 선택 (Expression Candidate Generation) ───
    case 4: {
      const slideIdx = state.currentSlideIndex;
      const spec = state.contentSpec?.slideSpecs[slideIdx];
      const slideNum = spec?.slideNumber || slideIdx + 1;
      const assignment = state.deckDesignPlan?.roleAssignments.find((ra) => ra.slideNumber === slideNum);

      // Rule-based recommendations
      let recBlock = '';
      if (spec && assignment) {
        const recommendations = getExpressionRecommendations(spec, assignment);
        if (recommendations.length > 0) {
          recBlock = `\n\n## 규칙 기반 추천 (참고용)\n${recommendations.map((r) => `- ${r.family} (${r.suggestedComposition}): ${r.reason}`).join('\n')}`;
        }
      }

      // Adjacent slide context for narrative continuity
      let adjacentContext = '';
      const specs = state.contentSpec?.slideSpecs || [];
      const prevSpec = specs.find((s) => s.slideNumber === slideNum - 1);
      const nextSpec = specs.find((s) => s.slideNumber === slideNum + 1);
      if (prevSpec || nextSpec) {
        adjacentContext = '\n\n## 인접 슬라이드 (서사 맥락)';
        if (prevSpec) adjacentContext += `\n- 이전(${prevSpec.slideNumber}): ${prevSpec.keyMessage}`;
        if (nextSpec) adjacentContext += `\n- 다음(${nextSpec.slideNumber}): ${nextSpec.keyMessage}`;
      }

      return `${BASE_INSTRUCTION}
${contextBlock}${refBlock}

## 현재 슬라이드: ${slideNum}번
- 섹션: ${spec?.sectionName || ''}
- 목적: ${spec?.purpose || ''}
- 핵심 메시지: ${spec?.keyMessage || ''}
- 필수 요소: ${spec?.requiredElements.join(', ') || ''}
${spec?.suggestedVisual ? `- 시각화 제안: ${spec.suggestedVisual}` : ''}
- 역할: ${assignment?.role || ''}
- 권장 레이아웃: ${assignment?.preferredLayout || ''}
- 텍스트 밀도: ${assignment?.density || ''}
${recBlock}${adjacentContext}

이 슬라이드의 정보를 **근본적으로 다른 시각적 표현 방식**으로 전달하는 3가지 Expression Candidate를 생성하세요.

## 다양성 보장 규칙 — 반드시 준수
1. 3개 후보는 반드시 **서로 다른 expressionFamily**를 사용
2. 3개 후보는 반드시 **서로 다른 composition**을 사용
3. 각 wireframe의 zones는 **최소 2개 이상**
4. label과 description이 **실질적으로 다른 접근**을 설명해야 함
5. 예: 비교 슬라이드 → A: table (comparison-table), B: contrast-split (side-by-side), C: cards (grid-cards)

## 사용 가능한 expressionFamily
table, cards, flow-diagram, timeline, hub-spoke, stacked-layers, chart, contrast-split, icon-list, center-stage, matrix, funnel, pyramid, scorecard

## 사용 가능한 composition
stack-vertical, side-by-side, hub-spoke, flow-horizontal, flow-vertical, grid-cards, comparison-table, timeline, icon-list, center-highlight, default

## 사용 가능한 layout
title-slide, title-content, two-column, image-text, chart, diagram, section-divider, conclusion

구조화된 데이터 형식:
<!--STRUCTURED_DATA
{"type":"expression_candidates","data":{"slideNumber":${slideNum},"informationStructure":"...","communicativeGoal":"...","candidates":[{"id":"expr-${slideNum}-a","slideNumber":${slideNum},"label":"...","description":"이 표현이 왜 적합한지 구체적으로","expressionFamily":"...","informationStructure":"...","communicativeGoal":"...","wireframe":{"layout":"...","composition":"...","title":"...","zones":[{"role":"primary","placeholder":"...","position":"center"},{"role":"label","placeholder":"...","position":"top"}],"meta":{"rowCount":4,"columnCount":2}},"recommendationScore":0.9,"rationale":"..."},{"id":"expr-${slideNum}-b",...},{"id":"expr-${slideNum}-c",...}]}}
-->`;
    }

    // ─── Step 5: 슬라이드 완성 (Single Slide Realization) ───
    case 5: {
      const slideIdx = state.currentSlideIndex;
      const spec = state.contentSpec?.slideSpecs[slideIdx];
      const slideNum = spec?.slideNumber || slideIdx + 1;
      const selectedExpr = state.selectedExpressions[slideNum];
      const assignment = state.deckDesignPlan?.roleAssignments.find((ra) => ra.slideNumber === slideNum);

      let expressionConstraint = '';
      if (selectedExpr) {
        expressionConstraint = `
## 선택된 표현 방식 (반드시 따르세요)
- Expression Family: ${selectedExpr.expressionFamily}
- Composition: ${selectedExpr.wireframe.composition}
- Layout: ${selectedExpr.wireframe.layout}
- 설명: ${selectedExpr.description}
- 근거: ${selectedExpr.rationale}`;
      }

      // Writing style consistency
      let writingStyleReminder = '';
      if (state.completedSlides.length > 0) {
        const lastSlide = state.completedSlides[state.completedSlides.length - 1];
        const bulletSample = lastSlide.bulletPoints?.slice(0, 2).join(' / ') || '';
        if (bulletSample) {
          writingStyleReminder = `\n\n**글쓰기 일관성**: 이전 슬라이드의 문체 패턴을 유지하세요. 예시: "${bulletSample}"`;
        }
      }

      // Role-based guide
      let roleSchema = '';
      if (assignment) {
        const roleGuides: Record<string, string> = {
          'cover': '커버: title, subtitle, 하나의 visual anchor. 밀도 low. bulletPoints 최대 3개.',
          'toc': '목차: 섹션 목록을 bulletPoints로 표현. progress cue 포함.',
          'section-divider': '섹션 구분: 섹션 제목과 한 줄 설명만. bulletPoints 최대 1개.',
          'key-message': '핵심 메시지: headline + 1~3 bullets + 큰 statement. keyMessage 필수.',
          'detailed-explanation': '상세 설명: 3~5 bullets + supporting body. 밀도 medium.',
          'comparison': '비교: 좌우 비교 구조 필수 (two-column 또는 side-by-side/comparison-table).',
          'data-visualization': '데이터 시각화: chartData 또는 mermaidCode 필수.',
          'architecture-blueprint': '아키텍처 청사진: mermaidCode 또는 구조화된 architecture elements 필수.',
          'conclusion': '결론: summary + closing message. bulletPoints 최대 3개.',
        };
        roleSchema = `\n\n### 역할별 생성 가이드\n${roleGuides[assignment.role] || ''}`;
      }

      // Reference slide matching
      let refMatchBlock = '';
      if (spec && references && references.length > 0) {
        const matches = matchReferenceSlides(spec.sectionName, references);
        if (matches.length > 0) {
          const matchLines = matches.map((m) => {
            const refLabel = references.length > 1 ? `레퍼런스${m.refIndex + 1} ` : '';
            let line = `- ${refLabel}슬라이드 ${m.slideNumber} [${m.sectionName}]`;
            if (m.designIntent) line += ` → ${m.designIntent}`;
            return line;
          });
          refMatchBlock = `\n\n### 매칭된 레퍼런스 슬라이드\n${matchLines.join('\n')}`;
        }
      }

      // Build required elements checklist
      const requiredChecklist = spec?.requiredElements.map((el) => `- [ ] ${el}`).join('\n') || '';

      // Build role-specific required fields
      const roleRequiredFields: Record<string, string> = {
        'data-visualization': '## role 필수 필드 (data-visualization)\n- chartData 필드를 반드시 포함하세요 (labels, values, seriesName)\n- chartType을 반드시 지정하세요 (bar / pie / line)\n- 이 필드가 없으면 검증 실패합니다',
        'architecture-blueprint': '## role 필수 필드 (architecture-blueprint)\n- mermaidCode 필드를 반드시 포함하세요 (flowchart 또는 graph 형식)\n- 또는 bulletPoints에 구조화된 아키텍처 요소를 포함하세요',
        'key-message': '## role 필수 필드 (key-message)\n- keyMessage 필드를 반드시 포함하세요\n- bulletPoints는 최대 3개까지만',
        'comparison': '## role 필수 필드 (comparison)\n- composition을 반드시 "comparison-table" 또는 "side-by-side"로 설정하세요\n- layout은 "two-column"을 사용하세요',
        'conclusion': '## role 필수 필드 (conclusion)\n- bulletPoints는 최대 3개까지만\n- keyMessage로 마무리 메시지를 포함하세요',
        'cover': '## role 필수 필드 (cover)\n- bulletPoints는 최대 3개까지만\n- layout은 "title-slide"을 사용하세요',
      };
      const roleRequired = assignment ? (roleRequiredFields[assignment.role] || '') : '';

      return `${BASE_INSTRUCTION}
${contextBlock}${refBlock}

## 현재 완성할 슬라이드: ${slideNum}번
- 섹션: ${spec?.sectionName || ''}
- 목적: ${spec?.purpose || ''}
- 핵심 메시지: ${spec?.keyMessage || ''}
${spec?.suggestedVisual ? `- 시각화 제안: ${spec.suggestedVisual}` : ''}
${expressionConstraint}${roleSchema}${refMatchBlock}${writingStyleReminder}${refHint}

${roleRequired}

## 필수 포함 체크리스트 — 아래 항목을 반드시 bulletPoints 또는 bodyText에 포함하세요
${requiredChecklist}
⚠️ 누락 시 재요청됩니다. 모든 항목이 슬라이드 어딘가에 반드시 반영되어야 합니다.

위 표현 방식에 맞춰 **완성된 슬라이드 1개**를 제작하세요. 3개가 아닌 **1개만** 만들어주세요.

## 필수 사용 필드
1. **subTitle** (필수): 제목 아래 한 줄 설명
2. **keyMessage** (필수): 핵심 메시지 강조 박스
3. **bulletPoints**: 핵심 항목. 각 항목은 "제목: 설명" 형태. 체크리스트의 모든 항목 포함.
4. **iconHints** (필수): bulletPoints와 1:1 매칭 이모지 배열
5. **secondaryPoints** (권장): 보조 정보 2~4개
6. **footnote** (권장): 출처, 기준일, 참고사항

구조화된 데이터 형식:
<!--STRUCTURED_DATA
{"type":"slide_candidates","data":{"slideNumber":${slideNum},"candidates":[{"id":"realized-${slideNum}","label":"완성안","description":"선택된 표현 방식 기반 완성","slide":{"slideNumber":${slideNum},"title":"...","subTitle":"...","keyMessage":"...","layout":"${selectedExpr?.wireframe.layout || 'title-content'}","contentType":"...","bulletPoints":["항목: 설명..."],"iconHints":["🎯","📊"],"secondaryPoints":["..."],"bodyText":"...","footnote":"...","speakerNotes":"...","composition":"${selectedExpr?.wireframe.composition || 'default'}"${selectedExpr ? `,"sourceExpressionId":"${selectedExpr.id}","expressionFamily":"${selectedExpr.expressionFamily}"` : ''}}}]}}
-->`;
    }

    default:
      return BASE_INSTRUCTION;
  }
}

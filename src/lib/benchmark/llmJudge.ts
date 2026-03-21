import { FinalDeckPlan, SlideContent, DocumentAnalysis } from '../types';
import { LlmJudgeResult } from './types';

/**
 * Build the LLM evaluation prompt.
 * This returns a system prompt + user prompt pair.
 * The caller is responsible for sending it to an LLM provider.
 */
export function buildJudgePrompt(
  plan: FinalDeckPlan,
  documentAnalysis?: DocumentAnalysis,
): { systemPrompt: string; userPrompt: string } {
  const approvedSlides = plan.slides
    .map((s) => s.approved)
    .filter((s): s is SlideContent => !!s);

  const slidesSummary = approvedSlides.map((s) => ({
    slideNumber: s.slideNumber,
    title: s.title,
    subTitle: s.subTitle,
    layout: s.layout,
    composition: s.composition,
    keyMessage: s.keyMessage,
    bulletPoints: s.bulletPoints,
    bodyText: s.bodyText,
    expressionFamily: s.expressionFamily,
  }));

  const docContext = documentAnalysis
    ? `## 원본 문서 요약\n${documentAnalysis.summary}\n\n### 요구사항\n${documentAnalysis.requirements.map((r) => `- ${r}`).join('\n')}`
    : '(원본 문서 정보 없음)';

  const specContext = plan.contentSpec.slideSpecs.map((s) =>
    `- 슬라이드 ${s.slideNumber} [${s.sectionName}]: ${s.keyMessage} (필수: ${s.requiredElements.join(', ')})`
  ).join('\n');

  const systemPrompt = `당신은 프레젠테이션 품질을 정량적으로 평가하는 전문 평가관입니다.
주어진 슬라이드를 6개 기준으로 1~5점 평가하고, 슬라이드별 코멘트를 작성하세요.
반드시 JSON으로만 응답하세요. 설명 텍스트 없이 JSON만 출력하세요.`;

  const userPrompt = `${docContext}

## 콘텐츠 명세서 (각 슬라이드가 달성해야 했던 것)
${specContext}

## 발표 기본 정보
- 제목: ${plan.meta.title}
- 총 슬라이드: ${plan.confirmedSlideCount}장
- 방향: ${plan.selectedDirection.approach}
- 톤: ${plan.deckDesignPlan.tone}

## 생성된 슬라이드
${JSON.stringify(slidesSummary, null, 2)}

## 평가 기준 (각 1~5점)
1. informationCoverage: 문서 핵심 요구사항이 빠짐없이 반영됐는가
2. logicalFlow: 슬라이드 순서와 전환이 자연스러운가
3. expressionFit: 각 슬라이드의 시각화 방식(composition)이 내용에 적합한가
4. messageClarify: 핵심 메시지가 즉시 파악 가능한가
5. audienceRelevance: 대상 청중 수준과 관심사에 맞는가
6. overallQuality: 실제 발표에 사용할 수 있는 수준인가

아래 JSON 형식으로만 응답하세요:
{
  "informationCoverage": 4,
  "logicalFlow": 3,
  "expressionFit": 4,
  "messageClarify": 4,
  "audienceRelevance": 3,
  "overallQuality": 4,
  "strengths": ["잘 된 점 1", "잘 된 점 2"],
  "improvements": ["개선 필요 점 1", "개선 필요 점 2"],
  "slideSpecificNotes": [
    {"slideNumber": 1, "score": 4, "note": "코멘트"},
    {"slideNumber": 2, "score": 3, "note": "코멘트"}
  ]
}`;

  return { systemPrompt, userPrompt };
}

/**
 * Parse LLM judge response into LlmJudgeResult.
 * Handles both raw JSON and JSON wrapped in markdown code blocks.
 */
export function parseJudgeResponse(response: string): LlmJudgeResult | null {
  try {
    // Strip markdown code fences if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    const required = ['informationCoverage', 'logicalFlow', 'expressionFit', 'messageClarify', 'audienceRelevance', 'overallQuality'];
    for (const field of required) {
      if (typeof parsed[field] !== 'number' || parsed[field] < 1 || parsed[field] > 5) {
        return null;
      }
    }

    return {
      informationCoverage: parsed.informationCoverage,
      logicalFlow: parsed.logicalFlow,
      expressionFit: parsed.expressionFit,
      messageClarify: parsed.messageClarify,
      audienceRelevance: parsed.audienceRelevance,
      overallQuality: parsed.overallQuality,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      slideSpecificNotes: Array.isArray(parsed.slideSpecificNotes) ? parsed.slideSpecificNotes : [],
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

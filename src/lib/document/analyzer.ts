import { createLlmProvider } from '../llm/factory';
import { LlmProviderType, DocumentAnalysis } from '../types';

export async function analyzeDocument(
  text: string,
  provider: LlmProviderType
): Promise<DocumentAnalysis> {
  const llm = createLlmProvider(provider);

  const systemPrompt = `당신은 문서 분석 전문가입니다. 주어진 문서의 내용을 분석하여 다음 정보를 JSON 형식으로 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "requirements": ["요구사항1", "요구사항2"],
  "businessRequirements": ["비즈니스 요구1", "비즈니스 요구2"],
  "technicalRequirements": ["기술 요구1", "기술 요구2"],
  "nonFunctionalRequirements": ["비기능 요구1", "비기능 요구2"],
  "constraints": ["제약조건1", "제약조건2"],
  "stakeholders": ["이해관계자1", "이해관계자2"],
  "integrationPoints": ["연동포인트1", "연동포인트2"],
  "summary": "문서 전체 요약 (2~3문장)",
  "executiveSummary": "제안서 관점에서 가장 중요한 해석 요약 (2~3문장)",
  "customerProblems": ["고객 pain point 1", "고객 pain point 2"],
  "decisionDrivers": ["의사결정 포인트 1", "의사결정 포인트 2"],
  "currentState": "현재 시스템/운영 상태 요약",
  "targetState": "문서가 암시하는 목표 상태 요약",
  "proposalFocusAreas": ["제안서에서 강조해야 할 포인트 1", "포인트 2"],
  "kpis": ["핵심성과지표1", "핵심성과지표2"],
  "timeline": "일정/타임라인 요약 (없으면 빈 문자열)",
  "budget": "예산 정보 요약 (없으면 빈 문자열)",
  "risks": ["리스크1", "리스크2"],
  "missingInformation": ["문서에 없어 제안서에서 가정이 필요한 정보 1"]
}

주의:
- requirements는 전체 요구사항 요약입니다.
- businessRequirements / technicalRequirements / nonFunctionalRequirements는 가능한 경우에만 분류하세요.
- executiveSummary는 "이 문서로 제안서를 만들 때 무엇을 설득해야 하는가" 관점으로 쓰세요.
- customerProblems, decisionDrivers, proposalFocusAreas는 제안서 구조 설계에 직접 쓸 수 있게 구체적으로 쓰세요.
- currentState / targetState / missingInformation은 문서에 근거해 추론하되 과도한 상상은 하지 마세요.
- 값이 없으면 빈 배열/빈 문자열로 두세요.`;

  const stream = llm.streamChat({
    messages: [{ role: 'user', content: `다음 문서를 분석해주세요:\n\n${text}` }],
    systemPrompt,
    temperature: 0.3,
  });

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON을 찾을 수 없습니다');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      rawText: text,
      requirements: parsed.requirements || [],
      businessRequirements: parsed.businessRequirements?.length ? parsed.businessRequirements : undefined,
      technicalRequirements: parsed.technicalRequirements?.length ? parsed.technicalRequirements : undefined,
      nonFunctionalRequirements: parsed.nonFunctionalRequirements?.length ? parsed.nonFunctionalRequirements : undefined,
      constraints: parsed.constraints || [],
      stakeholders: parsed.stakeholders || [],
      integrationPoints: parsed.integrationPoints || [],
      summary: parsed.summary || '',
      executiveSummary: parsed.executiveSummary || undefined,
      customerProblems: parsed.customerProblems?.length ? parsed.customerProblems : undefined,
      decisionDrivers: parsed.decisionDrivers?.length ? parsed.decisionDrivers : undefined,
      currentState: parsed.currentState || undefined,
      targetState: parsed.targetState || undefined,
      proposalFocusAreas: parsed.proposalFocusAreas?.length ? parsed.proposalFocusAreas : undefined,
      kpis: parsed.kpis?.length ? parsed.kpis : undefined,
      timeline: parsed.timeline || undefined,
      budget: parsed.budget || undefined,
      risks: parsed.risks?.length ? parsed.risks : undefined,
      missingInformation: parsed.missingInformation?.length ? parsed.missingInformation : undefined,
    };
  } catch {
    return {
      rawText: text,
      requirements: [],
      constraints: [],
      stakeholders: [],
      integrationPoints: [],
      summary: '문서 분석에 실패했습니다. 직접 내용을 입력해주세요.',
    };
  }
}

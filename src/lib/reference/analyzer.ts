import { createLlmProvider } from '../llm/factory';
import { LlmProviderType, ReferenceAnalysis, SlideDetailedAnalysis, SlideLayoutBlueprint, ProgressCallback } from '../types';

const ANALYSIS_PROMPT = `당신은 제안서 분석 전문가입니다. 주어진 제안서의 슬라이드별 텍스트를 분석하여 패턴을 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "sectionFlow": ["표지", "목차", "현황분석", ...],
  "slidePatterns": [
    {
      "slideNumber": 1,
      "sectionName": "표지",
      "layoutType": "title-slide",
      "contentDensity": "low",
      "hasChart": false,
      "hasDiagram": false,
      "sampleText": "첫 100자..."
    }
  ],
  "writingStyle": {
    "tone": "격식체, 전문적, 설득적",
    "sentencePatterns": ["대표 문장 3~5개"],
    "commonPhrases": ["자주 사용되는 표현들"],
    "bulletStyle": "명사형 종결 또는 ~합니다체 등"
  },
  "structuralNotes": "이 제안서의 구조적 특징 요약 (1~2문장)",
  "totalSlideCount": 15
}

분석 기준:
1. sectionFlow: 제안서의 큰 섹션 흐름을 순서대로 나열
2. slidePatterns: 각 슬라이드의 레이아웃/밀도/차트유무 분석
   - layoutType: title-slide, title-content, two-column, bullets, chart, diagram, section-divider, conclusion 중 선택
   - contentDensity: 텍스트/데이터 양에 따라 low/medium/high
3. writingStyle: 제안서 전체의 문체, 톤, 불릿 패턴 분석
4. structuralNotes: 독특하거나 효과적인 구조적 특징`;

const DETAILED_SLIDE_ANALYSIS_PROMPT = `당신은 제안서 슬라이드 분석 전문가입니다.
각 슬라이드의 텍스트 내용과 레이아웃 배치 정보를 종합하여, 슬라이드마다 **매우 디테일한 분석**을 작성합니다.

분석 목적: 이 분석을 읽고 동일한 스타일/구조/전략의 새 제안서를 만들 수 있어야 합니다.

각 슬라이드별로 다음을 분석하세요:
1. **purpose**: 이 슬라이드가 전체 발표에서 어떤 역할을 하는지 (예: "고객의 Pain Point를 3가지로 정리하여 문제의 심각성을 부각", "기술 아키텍처를 시각적으로 보여 신뢰성 확보")
2. **keyMessage**: 이 슬라이드가 전달하는 핵심 메시지 한 문장
3. **contentStrategy**: 정보를 어떤 순서와 방식으로 배치했는지 구체적으로 기술 (예: "상단에 문제 정의 → 중앙에 3개 카드로 원인 분석 → 하단에 해결 방향 제시", "좌측에 AS-IS 현재 프로세스를 4단계로 → 우측에 TO-BE 개선 프로세스를 4단계로 대비")
4. **designIntent**: 왜 이 레이아웃/배치를 선택했는지 (예: "좌우 비교 레이아웃으로 Before/After 효과를 극대화", "중앙에 허브를 두고 주변에 요소를 배치해 시스템 연결성을 직관적으로 표현")
5. **visualElements**: 각 시각 요소(차트, 다이어그램, 이미지, 아이콘 등)가 어떤 역할을 하고 왜 그 위치에 있는지
6. **writingPattern**: 이 슬라이드에서 사용한 문체, 불릿 구조, 강조 기법 (예: "동사형 종결로 행동 유도 '-하겠습니다'", "3개 불릿 각각 [아이콘] + 제목 + 설명 2줄 구조", "핵심 수치를 크게 강조하고 부연 설명을 작은 글씨로")
7. **narrativeConnection**: 이전/다음 슬라이드와의 스토리 연결 (예: "앞 슬라이드에서 제기한 문제의 해결책을 제시", "여기서 정리한 요구사항을 다음 슬라이드의 아키텍처 설계로 연결")
8. **notableTechniques**: 효과적인 기법이나 참고할 만한 점 (예: "핵심 숫자를 48pt로 크게 배치하여 시각적 앵커 역할", "프로세스 5단계를 화살표 흐름도로 한눈에 파악 가능하게 구성")

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "slideAnalyses": [
    {
      "slideNumber": 1,
      "purpose": "...",
      "keyMessage": "...",
      "contentStrategy": "...",
      "designIntent": "...",
      "visualElements": [
        { "element": "중앙 로고 이미지", "role": "브랜드 아이덴티티 전달", "placementReason": "시선이 가장 먼저 가는 중앙에 배치하여 첫인상 형성" }
      ],
      "writingPattern": "...",
      "narrativeConnection": "...",
      "notableTechniques": ["...", "..."]
    }
  ]
}

**중요**: 분석은 최대한 구체적이고 상세하게 작성하세요. 추상적인 표현(예: "효과적인 레이아웃")이 아니라, 구체적으로 어떤 요소가 어디에 왜 있는지를 서술해야 합니다.`;

async function callLlm(
  systemPrompt: string,
  userMessage: string,
  provider: LlmProviderType
): Promise<string> {
  const llm = createLlmProvider(provider);

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = llm.streamChat({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt,
      temperature: 0.2,
    });
  } catch (err) {
    throw new Error(`LLM 스트림 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
  } catch (err) {
    // Stream error — might have partial result
    console.error('[callLlm] 스트림 읽기 에러:', err instanceof Error ? err.message : err);
    if (result.length > 0) {
      console.log('[callLlm] 부분 응답 사용 (' + result.length + '자)');
    } else {
      throw new Error(`LLM 응답 스트림 에러: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!result || result.trim().length === 0) {
    throw new Error('LLM이 빈 응답을 반환했습니다');
  }

  console.log('[callLlm] 응답 첫 200자:', result.slice(0, 200));
  return result;
}

function parseJson<T>(text: string): T {
  // Check for common error patterns from LLM providers
  if (text.includes('rate limit') || text.includes('Rate limit')) {
    throw new Error('API 속도 제한에 걸렸습니다. 잠시 후 다시 시도하세요.');
  }
  if (text.includes('context_length_exceeded') || text.includes('maximum context length')) {
    throw new Error('입력이 너무 깁니다. 더 짧은 텍스트로 재시도합니다.');
  }

  // Try to find the outermost JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`JSON을 찾을 수 없습니다. 응답 앞 300자: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // LLM output may be truncated — try to fix incomplete JSON
    let jsonStr = jsonMatch[0];
    // Remove trailing incomplete entries and close arrays/objects
    jsonStr = jsonStr.replace(/,\s*$/, '');
    // Count open/close brackets and add missing ones
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    // Remove any trailing incomplete string/value
    jsonStr = jsonStr.replace(/,\s*"[^"]*$/, '');
    jsonStr = jsonStr.replace(/,\s*\{[^}]*$/, '');
    jsonStr = jsonStr.replace(/:\s*"[^"]*$/, ': ""');
    for (let i = 0; i < openBrackets - closeBrackets; i++) jsonStr += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) jsonStr += '}';
    return JSON.parse(jsonStr);
  }
}

/**
 * Truncate slide texts to fit within LLM context limits.
 * Each slide is capped at maxCharsPerSlide, total capped at maxTotalChars.
 */
function truncateForAnalysis(
  slideTexts: string[],
  maxCharsPerSlide = 500,
  maxTotalChars = 20000
): string[] {
  const truncated = slideTexts.map((text) =>
    text.length > maxCharsPerSlide
      ? text.slice(0, maxCharsPerSlide) + '...(생략)'
      : text
  );

  // If total still too long, reduce per-slide proportionally
  const total = truncated.reduce((sum, t) => sum + t.length, 0);
  if (total > maxTotalChars) {
    const ratio = maxTotalChars / total;
    return truncated.map((text) => {
      const limit = Math.max(100, Math.floor(text.length * ratio));
      return text.length > limit ? text.slice(0, limit) + '...(생략)' : text;
    });
  }

  return truncated;
}

/**
 * Truncate a single large text (e.g. from PDF) for LLM input.
 */
function truncateText(text: string, maxChars = 20000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n...(이하 생략, 전체 ' + text.length + '자 중 ' + maxChars + '자만 포함)';
}

function buildAnalysisResult(parsed: Record<string, unknown>): ReferenceAnalysis {
  return {
    sectionFlow: (parsed.sectionFlow as string[]) || [],
    slidePatterns: ((parsed.slidePatterns as Record<string, unknown>[]) || []).map((p) => ({
      slideNumber: (p.slideNumber as number) || 0,
      sectionName: (p.sectionName as string) || '',
      layoutType: (p.layoutType as string) || 'title-content',
      contentDensity: (p.contentDensity as 'low' | 'medium' | 'high') || 'medium',
      hasChart: (p.hasChart as boolean) || false,
      hasDiagram: (p.hasDiagram as boolean) || false,
      sampleText: (p.sampleText as string) || '',
    })),
    writingStyle: {
      tone: (parsed.writingStyle as Record<string, unknown>)?.tone as string || '',
      sentencePatterns: (parsed.writingStyle as Record<string, unknown>)?.sentencePatterns as string[] || [],
      commonPhrases: (parsed.writingStyle as Record<string, unknown>)?.commonPhrases as string[] || [],
      bulletStyle: (parsed.writingStyle as Record<string, unknown>)?.bulletStyle as string || '',
    },
    structuralNotes: (parsed.structuralNotes as string) || '',
    totalSlideCount: (parsed.totalSlideCount as number) || 0,
  };
}

async function analyzeBasicPatterns(
  userMessage: string,
  provider: LlmProviderType
): Promise<ReferenceAnalysis> {
  // Try with full message first, then retry with progressively shorter input
  const attempts = [
    userMessage.length > 20000 ? userMessage.slice(0, 20000) + '\n\n...(이하 생략)' : userMessage,
    userMessage.length > 10000 ? userMessage.slice(0, 10000) + '\n\n...(이하 생략)' : null,
    userMessage.length > 5000 ? userMessage.slice(0, 5000) + '\n\n...(이하 생략)' : null,
  ].filter(Boolean) as string[];

  let lastError: Error | null = null;

  for (const msg of attempts) {
    try {
      console.log(`[레퍼런스 분석] 시도 중... 입력 길이: ${msg.length}자`);
      const result = await callLlm(ANALYSIS_PROMPT, msg, provider);
      console.log(`[레퍼런스 분석] LLM 응답 길이: ${result.length}자`);
      const parsed = parseJson<Record<string, unknown>>(result);
      return buildAnalysisResult(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[레퍼런스 분석] 실패 (입력 ${msg.length}자):`, lastError.message);
      // Try next attempt with shorter input
    }
  }

  throw new Error(`레퍼런스 분석 결과를 파싱할 수 없습니다: ${lastError?.message || '알 수 없는 오류'}`);
}

/**
 * 슬라이드별 디테일 분석 (텍스트 + 레이아웃 정보를 종합)
 */
/**
 * Build per-slide info string combining text + layout blueprint
 */
function buildSlideInfo(
  text: string,
  slideNum: number,
  layoutBlueprints: SlideLayoutBlueprint[] | undefined
): string {
  let info = `--- 슬라이드 ${slideNum} ---\n`;
  info += `[텍스트 내용]\n${text || '(텍스트 없음)'}\n`;

  const blueprint = layoutBlueprints?.find((bp) => bp.slideNumber === slideNum);
  if (blueprint) {
    info += `\n[레이아웃 배치 정보]\n`;
    info += `구성 요약: ${blueprint.compositionSummary}\n`;
    info += `컴포넌트 ${blueprint.shapes.length}개:\n`;
    for (const shape of blueprint.shapes) {
      const pos = `위치(${shape.position.x}%, ${shape.position.y}%) 크기(${shape.position.w}%x${shape.position.h}%)`;
      const extra = shape.subType ? `[${shape.subType}]` : '';
      const textInfo = shape.text ? ` 내용: "${shape.text}"` : '';
      const visualInfo: string[] = [];
      if (shape.fillColor) visualInfo.push(`배경:${shape.fillColor}`);
      if (shape.fontFace) visualInfo.push(`폰트:${shape.fontFace}`);
      if (shape.fontSize) visualInfo.push(`크기:${shape.fontSize}pt`);
      const visualStr = visualInfo.length > 0 ? ` [${visualInfo.join(', ')}]` : '';
      info += `  - ${shape.type}${extra} ${pos}${textInfo}${visualStr}\n`;
    }
  }

  return info;
}

function parseSlideAnalyses(result: string): SlideDetailedAnalysis[] {
  const parsed = parseJson<{ slideAnalyses: Record<string, unknown>[] }>(result);
  return (parsed.slideAnalyses || []).map((sa) => ({
    slideNumber: (sa.slideNumber as number) || 0,
    purpose: (sa.purpose as string) || '',
    keyMessage: (sa.keyMessage as string) || '',
    contentStrategy: (sa.contentStrategy as string) || '',
    designIntent: (sa.designIntent as string) || '',
    visualElements: ((sa.visualElements as Record<string, string>[]) || []).map((ve) => ({
      element: ve.element || '',
      role: ve.role || '',
      placementReason: ve.placementReason || '',
    })),
    writingPattern: (sa.writingPattern as string) || '',
    narrativeConnection: (sa.narrativeConnection as string) || '',
    notableTechniques: (sa.notableTechniques as string[]) || [],
  }));
}

/**
 * 슬라이드별 디테일 분석 — 큰 파일은 청크로 나눠서 LLM에 전송
 */
async function analyzeSlideDetails(
  slideTexts: string[],
  layoutBlueprints: SlideLayoutBlueprint[] | undefined,
  provider: LlmProviderType,
  onProgress?: ProgressCallback
): Promise<SlideDetailedAnalysis[]> {
  const truncatedTexts = truncateForAnalysis(slideTexts, 600, 50000);

  // Build all slide infos
  const slideInfos = truncatedTexts.map((text, i) =>
    buildSlideInfo(text, i + 1, layoutBlueprints)
  );

  // Split into chunks of ~10 slides to stay within LLM limits
  const CHUNK_SIZE = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < slideInfos.length; i += CHUNK_SIZE) {
    chunks.push(slideInfos.slice(i, i + CHUNK_SIZE));
  }

  // Process chunks (sequentially to avoid rate limits, but could parallelize for speed)
  const allAnalyses: SlideDetailedAnalysis[] = [];

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const startSlide = ci * CHUNK_SIZE + 1;
    const endSlide = Math.min(startSlide + chunk.length - 1, slideTexts.length);
    onProgress?.(`슬라이드 디테일 분석 중... (${startSlide}-${endSlide} / ${slideTexts.length}장)`);

    const userMessage = `다음은 제안서의 슬라이드별 텍스트 내용과 레이아웃 배치 정보입니다.
각 슬라이드를 매우 디테일하게 분석해주세요.

${chunk.join('\n\n')}`;

    try {
      const result = await callLlm(DETAILED_SLIDE_ANALYSIS_PROMPT, userMessage, provider);
      const analyses = parseSlideAnalyses(result);
      allAnalyses.push(...analyses);
    } catch (err) {
      console.error(`슬라이드 디테일 분석 청크 파싱 실패:`, err);
      // Continue with other chunks even if one fails
    }
  }

  return allAnalyses;
}

export async function analyzeReferenceFromPptx(
  slideTexts: string[],
  provider: LlmProviderType,
  layoutBlueprints?: SlideLayoutBlueprint[],
  onProgress?: ProgressCallback
): Promise<ReferenceAnalysis> {
  const truncatedTexts = truncateForAnalysis(slideTexts);
  const slidesFormatted = truncatedTexts
    .map((text, i) => `--- 슬라이드 ${i + 1} ---\n${text}`)
    .join('\n\n');

  // 블루프린트 요약을 기본 분석에도 포함하여 차트/다이어그램 유무를 정확하게 판단
  let basicMessage = `다음은 제안서의 슬라이드별 텍스트입니다. 분석해주세요:\n\n${slidesFormatted}`;
  if (layoutBlueprints && layoutBlueprints.length > 0) {
    const blueprintSummary = layoutBlueprints.map((bp) => {
      const shapeTypes = bp.shapes.map((s) => s.type + (s.subType ? `[${s.subType}]` : '')).join(', ');
      return `슬라이드${bp.slideNumber}: ${bp.compositionSummary} (${shapeTypes || '없음'})`;
    }).join('\n');
    basicMessage += `\n\n--- 레이아웃 배치 요약 ---\n각 슬라이드의 실제 컴포넌트(차트/다이어그램/이미지 등) 존재 여부를 참고하세요:\n${blueprintSummary}`;
  }

  // 1단계: 기본 패턴 분석 + 2단계: 슬라이드별 디테일 분석 병렬 실행
  onProgress?.(`기본 패턴 분석 + 디테일 분석 시작 (${slideTexts.length}장)`);
  const [basicAnalysis, detailedAnalyses] = await Promise.all([
    analyzeBasicPatterns(basicMessage, provider),
    analyzeSlideDetails(slideTexts, layoutBlueprints, provider, onProgress),
  ]);

  basicAnalysis.slideDetailedAnalyses = detailedAnalyses;
  return basicAnalysis;
}

export async function analyzeReferenceFromText(
  text: string,
  provider: LlmProviderType,
  layoutBlueprints?: SlideLayoutBlueprint[],
  onProgress?: ProgressCallback
): Promise<ReferenceAnalysis> {
  // For text/PDF: split by page breaks or double newlines to approximate slides
  const pages = text.split(/\n{3,}|\f/).filter((p) => p.trim().length > 0);

  // Truncate text for LLM input
  const truncatedText = truncateText(text, 20000);

  // 1단계: 기본 패턴 분석
  onProgress?.('기본 패턴 분석 중...');
  const basicAnalysis = await analyzeBasicPatterns(
    `다음은 제안서의 내용입니다. 분석해주세요:\n\n${truncatedText}`,
    provider
  );

  // 2단계: 페이지/섹션별 디테일 분석 (2페이지 이상이면)
  if (pages.length > 1) {
    try {
      const detailedAnalyses = await analyzeSlideDetails(pages, layoutBlueprints, provider, onProgress);
      basicAnalysis.slideDetailedAnalyses = detailedAnalyses;
    } catch (err) {
      console.error('텍스트 레퍼런스 디테일 분석 실패:', err);
      // 기본 분석은 유지, 디테일만 스킵
    }
  }

  return basicAnalysis;
}

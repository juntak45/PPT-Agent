import { nanoid } from 'nanoid';
import { analyzeDocument } from '../document/analyzer';
import { LlmProviderType, ReferenceAnalysis } from '../types';
import { generateJson } from './llm';
import { ArchitectureExtractionResult, CustomerComponent } from './types';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const COMPONENT_RULES: Array<{ pattern: RegExp; type: CustomerComponent['type']; label: string; aliases?: string[] }> = [
  { pattern: /(genesys|콜센터|voice|voice bot|aicc|상담|customer voice|zendesk|ivr)/i, type: 'channel', label: '고객 채널', aliases: ['Genesys', 'Zendesk'] },
  { pattern: /(crm|cs history|order history|고객정보|학사정보|erp|portal|업무 시스템)/i, type: 'customer-system', label: '고객 업무 시스템', aliases: ['CRM', 'ERP', 'Portal'] },
  { pattern: /(검색|search|규정검색|지식검색|retrieval|api gateway|gateway|연동)/i, type: 'integration', label: '검색/연동 서비스', aliases: ['Search', 'API Gateway'] },
  { pattern: /(workflow|결재|승인|프로세스|라이프사이클|approval)/i, type: 'integration', label: '업무 워크플로우', aliases: ['Workflow'] },
  { pattern: /(admin|관리자|운영|배포|activation|versioning|ops|governance)/i, type: 'admin', label: '운영/Admin 도구', aliases: ['Admin'] },
  { pattern: /(dashboard|analytics|kpi|리포트|통계|모니터링|bi|report)/i, type: 'analytics', label: '분석/대시보드', aliases: ['Dashboard', 'Analytics'] },
  { pattern: /(tibero|db|database|파일 시스템|storage|kms|s3|redis|cache)/i, type: 'data-store', label: '데이터 저장소', aliases: ['Tibero', 'DB'] },
  { pattern: /(sso|ldap|security|보안|rbac|권한|인증|auth)/i, type: 'security', label: '보안/인증', aliases: ['Security', 'SSO', 'LDAP'] },
];

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

function inferComponentSpec(raw: string): { label: string; type: CustomerComponent['type']; importance: CustomerComponent['importance'] } {
  for (const rule of COMPONENT_RULES) {
    if (!rule.pattern.test(raw)) continue;
    const alias = rule.aliases?.find((item) => new RegExp(item, 'i').test(raw));
    return {
      label: alias || raw.trim() || rule.label,
      type: rule.type,
      importance: rule.type === 'channel' || rule.type === 'customer-system' ? 'high' : 'medium',
    };
  }
  return {
    label: raw.trim(),
    type: 'customer-system',
    importance: 'medium',
  };
}

function uniqueByLabel(components: CustomerComponent[]): CustomerComponent[] {
  const merged = new Map<string, CustomerComponent>();
  components.forEach((component) => {
    const key = normalizeLabel(component.label);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, component);
      return;
    }
    merged.set(key, {
      ...existing,
      description: existing.description || component.description,
      sourceEvidence: [...new Set([...existing.sourceEvidence, ...component.sourceEvidence])],
      inferredFrom: existing.inferredFrom === 'user-input' || component.inferredFrom === 'user-input' ? 'user-input' : existing.inferredFrom,
      importance: existing.importance === 'high' || component.importance === 'high' ? 'high' : 'medium',
    });
  });
  return Array.from(merged.values());
}

function inferProjectTitle(rawText: string, analysis: Awaited<ReturnType<typeof analyzeDocument>> | null): string {
  const explicitMatches = [
    rawText.match(/([^\n]{0,40}(?:구축|고도화|개선|전환|도입|개발)\s*(?:사업|제안서|프로젝트))/),
    rawText.match(/([^\n]{0,40}(?:규정관리시스템|AICC|지식검색|RAG|CRM)[^\n]{0,20})/i),
  ]
    .map((match) => match?.[1]?.trim())
    .filter(Boolean) as string[];

  const analysisCandidates = [
    analysis?.proposalFocusAreas?.[0],
    analysis?.summary?.split('.').shift(),
    analysis?.requirements?.[0],
  ].filter(Boolean) as string[];

  const title = [...explicitMatches, ...analysisCandidates].find((candidate) => candidate && candidate.length >= 4);
  if (!title) return '고객사 아키텍처 제안';
  return title.replace(/\s+/g, ' ').slice(0, 80);
}

function inferIntegrationPoints(rawText: string, manualNotes?: string): string[] {
  const combined = `${rawText}\n${manualNotes || ''}`;
  const patterns = [
    { pattern: /(ldap|sso)/i, label: '사내 인증 체계 연동' },
    { pattern: /(crm|고객정보)/i, label: 'CRM/고객정보 연동' },
    { pattern: /(tibero|db|database)/i, label: '기존 데이터베이스 연동' },
    { pattern: /(검색|규정검색|지식검색)/i, label: '규정/지식 검색 연동' },
    { pattern: /(workflow|승인|결재)/i, label: '승인/워크플로우 연동' },
    { pattern: /(dashboard|analytics|리포트)/i, label: '분석/대시보드 연동' },
  ];

  return patterns.filter((item) => item.pattern.test(combined)).map((item) => item.label);
}

function componentFromRule(label: string, evidence: string, inferredFrom: CustomerComponent['inferredFrom'], index: number): CustomerComponent {
  const inferred = inferComponentSpec(label);
  return {
    id: `component-${index}-${nanoid(4)}`,
    label: inferred.label,
    type: inferred.type,
    description: evidence,
    sourceEvidence: [evidence],
    inferredFrom,
    importance: inferred.importance,
  };
}

function heuristicComponents(text: string, manualNotes?: string): CustomerComponent[] {
  const combined = `${text}\n${manualNotes || ''}`;
  const components: CustomerComponent[] = [];

  COMPONENT_RULES.forEach((rule, index) => {
    const match = combined.match(rule.pattern);
    if (match) {
      const rawEvidence = match[0];
      const inferred = inferComponentSpec(rawEvidence);
      components.push({
        id: `component-${index}-${nanoid(4)}`,
        label: inferred.label,
        type: inferred.type,
        description: rawEvidence,
        sourceEvidence: [rawEvidence],
        inferredFrom: text.includes(rawEvidence) ? 'rfi' : 'user-input',
        importance: inferred.importance,
      });
    }
  });

  const manualItems = (manualNotes || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  manualItems.forEach((item, index) => {
    components.push(componentFromRule(item, item, 'user-input', COMPONENT_RULES.length + index));
  });

  return uniqueByLabel(components);
}

function mergeManualComponents(base: CustomerComponent[], manualNotes?: string): CustomerComponent[] {
  if (!manualNotes) return base;
  const manualItems = manualNotes
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  const next = [...base];
  manualItems.forEach((item, index) => {
    const found = next.find((component) => component.label.toLowerCase() === item.toLowerCase());
    if (found) {
      found.description = item;
      found.sourceEvidence = [...new Set([...found.sourceEvidence, item])];
      found.inferredFrom = 'user-input';
      return;
    }
    next.push(componentFromRule(item, item, 'user-input', index + 100));
  });
  return next;
}

function buildFallbackExtraction(
  projectTitle: string,
  analysis: Awaited<ReturnType<typeof analyzeDocument>> | null,
  rawText: string,
  manualNotes?: string,
): ArchitectureExtractionResult {
  const baseComponents = mergeManualComponents(heuristicComponents(rawText, manualNotes), manualNotes);
  return {
    projectTitle,
    executiveSummary: analysis?.executiveSummary || analysis?.summary || `${projectTitle}의 고객사 시스템 구조를 Wrtn 기술과 연결하는 아키텍처 제안`,
    customerProblems: analysis?.customerProblems || analysis?.requirements?.slice(0, 3) || [],
    decisionDrivers: analysis?.decisionDrivers || analysis?.proposalFocusAreas || [],
    currentState: analysis?.currentState || '고객사 기존 시스템과 운영 도구가 분산되어 있으며, 연동 구조를 한 장으로 설명할 필요가 있습니다.',
    targetState: analysis?.targetState || '고객사 시스템 위에 Wrtn 기술을 연결한 통합 아키텍처를 제시합니다.',
    customerComponents: baseComponents,
    integrationPoints: analysis?.integrationPoints?.length ? analysis.integrationPoints : inferIntegrationPoints(rawText, manualNotes),
    missingInformation: analysis?.missingInformation || (baseComponents.length === 0 ? ['고객사 시스템 구성요소가 문서에서 명확하지 않습니다.'] : []),
  };
}

export async function extractArchitecture(
  rfiText: string,
  manualNotes: string | undefined,
  provider: LlmProviderType,
  references: ReferenceAnalysis[],
): Promise<ArchitectureExtractionResult> {
  let analysis: Awaited<ReturnType<typeof analyzeDocument>> | null = null;
  try {
    analysis = await withTimeout(analyzeDocument(rfiText, provider), 12000);
  } catch {
    analysis = null;
  }

  const projectTitle = inferProjectTitle(rfiText, analysis);

  const styleHints = references
    .slice(0, 1)
    .map((ref) => `섹션 흐름: ${ref.sectionFlow.join(' → ')} / 구조적 특징: ${ref.structuralNotes}`)
    .join('\n');

  const systemPrompt = `당신은 엔터프라이즈 솔루션 아키텍처 분석가입니다. 반드시 JSON만 반환하세요.
JSON 형식:
{
  "projectTitle": "...",
  "executiveSummary": "...",
  "customerProblems": ["..."],
  "decisionDrivers": ["..."],
  "currentState": "...",
  "targetState": "...",
  "customerComponents": [{"label":"...","type":"channel|customer-system|integration|data-store|admin|analytics|security","description":"...","sourceEvidence":["..."],"importance":"high|medium|low"}],
  "integrationPoints": ["..."],
  "missingInformation": ["..."]
}`;

  const userPrompt = `RFI 텍스트:
${rfiText}

문서 분석:
${JSON.stringify(analysis, null, 2)}

사용자 보완 입력:
${manualNotes || '(없음)'}

레퍼런스 스타일 참고:
${styleHints || '(없음)'}

위 정보를 바탕으로 고객사 기술/운영/데이터/연동 요소를 컴포넌트 단위로 분해하세요.
Wrtn 기술은 넣지 말고 고객사 현재 구조만 추출하세요.`;

  const generated = await withTimeout(
    generateJson<ArchitectureExtractionResult & { customerComponents: Array<Omit<CustomerComponent, 'id' | 'inferredFrom'>> }>(
      provider,
      systemPrompt,
      userPrompt,
    ),
    12000,
  );

  if (!generated || !Array.isArray(generated.customerComponents) || generated.customerComponents.length === 0) {
    return buildFallbackExtraction(projectTitle, analysis, rfiText, manualNotes);
  }

  const customerComponents = mergeManualComponents(
    generated.customerComponents.map((component, index) => ({
      ...component,
      ...inferComponentSpec(component.label || component.description || `component-${index + 1}`),
      id: `component-${index}-${nanoid(4)}`,
      inferredFrom: 'rfi' as const,
      sourceEvidence: component.sourceEvidence || [],
    })),
    manualNotes,
  );

  return {
    projectTitle: generated.projectTitle || projectTitle,
    executiveSummary: generated.executiveSummary || analysis?.executiveSummary || analysis?.summary || projectTitle,
    customerProblems: generated.customerProblems || [],
    decisionDrivers: generated.decisionDrivers || [],
    currentState: generated.currentState || analysis?.currentState || '',
    targetState: generated.targetState || analysis?.targetState || '',
    customerComponents: uniqueByLabel(customerComponents),
    integrationPoints: generated.integrationPoints?.length
      ? generated.integrationPoints
      : analysis?.integrationPoints?.length
        ? analysis.integrationPoints
        : inferIntegrationPoints(rfiText, manualNotes),
    missingInformation: generated.missingInformation || analysis?.missingInformation || [],
  };
}

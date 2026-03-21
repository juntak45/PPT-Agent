import { nanoid } from 'nanoid';
import { ArchitectureConnection, ArchitectureExtractionResult, ArchitectureGroup, ArchitectureOverlayPlan, LayoutStyle, WrtnModuleMapping } from './types';

const MAPPING_RULES: Array<{
  match: RegExp;
  module: WrtnModuleMapping['wrtnModule'];
  label: string;
  rationale: string;
}> = [
  { match: /(genesys|voice|콜센터|채널|aicc|상담|ivr|zendesk)/i, module: 'stt', label: 'Wrtn STT', rationale: '고객 음성/상담 채널을 실시간 텍스트 입력으로 변환합니다.' },
  { match: /(genesys|voice|콜센터|ivr|search|검색|규정검색|질의|zendesk)/i, module: 'intent-engine', label: 'Intent Engine', rationale: '고객 질의를 분류하고 의도를 해석합니다.' },
  { match: /(규정|문서|검색|retrieval|지식)/i, module: 'policy-retrieval', label: 'Policy Retrieval', rationale: '문서와 규정 기반 답변을 위한 검색/회수 계층이 필요합니다.' },
  { match: /(승인|프로세스|workflow|라이프사이클)/i, module: 'workflow-engine', label: 'Workflow Engine', rationale: '업무 절차와 승인 흐름을 오케스트레이션합니다.' },
  { match: /(genesys|crm|cs history|고객|상담|portal|erp)/i, module: 'agent-orchestrator', label: 'Agent Orchestrator', rationale: '고객 맥락과 업무 액션을 연결하는 에이전트 계층입니다.' },
  { match: /(analytics|dashboard|kpi|리포트|모니터링)/i, module: 'analytics-dashboard', label: 'Analytics Dashboard', rationale: '성과 및 운영 상태를 시각화합니다.' },
  { match: /(admin|운영|배포|관리자)/i, module: 'admin-console', label: 'Admin Console', rationale: '운영자 중심 설정 및 관리 콘솔이 필요합니다.' },
  { match: /(security|ldap|sso|보안|권한)/i, module: 'security-layer', label: 'Security Layer', rationale: '보안 및 권한 제어 계층을 분리합니다.' },
];

function inferLayoutStyle(extraction: ArchitectureExtractionResult): LayoutStyle {
  if (extraction.customerComponents.length >= 8) return 'enterprise-grid';
  if (extraction.integrationPoints.length >= 3) return 'layered-flow';
  return 'platform-stack';
}

function buildGroups(): ArchitectureGroup[] {
  return [
    { id: 'group-input', title: 'Input / Channel', role: 'input' },
    { id: 'group-customer', title: 'Customer Systems', role: 'customer-layer' },
    { id: 'group-wrtn', title: 'Wrtn Core Modules', role: 'wrtn-core' },
    { id: 'group-ops', title: 'Operations & Governance', role: 'operations' },
    { id: 'group-analytics', title: 'Analytics & Monitoring', role: 'analytics' },
    { id: 'group-data', title: 'Data & Integration', role: 'data' },
  ];
}

function mapGroupId(componentType: string): string {
  switch (componentType) {
    case 'channel':
      return 'group-input';
    case 'admin':
    case 'security':
      return 'group-ops';
    case 'analytics':
      return 'group-analytics';
    case 'data-store':
    case 'integration':
      return 'group-data';
    default:
      return 'group-customer';
  }
}

export function buildOverlayPlan(
  extraction: ArchitectureExtractionResult,
  referenceStyleProfileId: string,
): ArchitectureOverlayPlan {
  const groups = buildGroups();
  const layoutStyle = inferLayoutStyle(extraction);
  const wrtnModulesMap = new Map<string, WrtnModuleMapping>();

  extraction.customerComponents.forEach((component) => {
    const haystack = `${component.label} ${component.description || ''}`.trim();

    if (component.type === 'channel') {
      [
        {
          module: 'stt' as const,
          label: 'Wrtn STT',
          rationale: '고객 채널의 음성/텍스트 입력을 표준화해 Wrtn 처리 계층으로 전달합니다.',
        },
        {
          module: 'intent-engine' as const,
          label: 'Intent Engine',
          rationale: '채널에서 유입되는 질의를 의도 단위로 분류해 후속 모듈과 연결합니다.',
        },
        {
          module: 'agent-orchestrator' as const,
          label: 'Agent Orchestrator',
          rationale: '채널과 고객 업무 시스템 사이에서 Wrtn 에이전트 흐름을 제어합니다.',
        },
      ].forEach((preset) => {
        const existing = wrtnModulesMap.get(preset.module);
        if (existing) {
          existing.mappedToComponentIds = [...new Set([...existing.mappedToComponentIds, component.id])];
          return;
        }
        wrtnModulesMap.set(preset.module, {
          id: `wrtn-${preset.module}-${nanoid(4)}`,
          wrtnModule: preset.module,
          label: preset.label,
          mappedToComponentIds: [component.id],
          rationale: preset.rationale,
          enabled: true,
        });
      });
    }

    MAPPING_RULES.forEach((rule) => {
      if (!rule.match.test(haystack)) return;
      const existing = wrtnModulesMap.get(rule.module);
      if (existing) {
        existing.mappedToComponentIds = [...new Set([...existing.mappedToComponentIds, component.id])];
        return;
      }
      wrtnModulesMap.set(rule.module, {
        id: `wrtn-${rule.module}-${nanoid(4)}`,
        wrtnModule: rule.module,
        label: rule.label,
        mappedToComponentIds: [component.id],
        rationale: rule.rationale,
        enabled: true,
      });
    });

    if (component.type === 'analytics' && !wrtnModulesMap.has('analytics-dashboard')) {
      wrtnModulesMap.set('analytics-dashboard', {
        id: `wrtn-analytics-dashboard-${nanoid(4)}`,
        wrtnModule: 'analytics-dashboard',
        label: 'Analytics Dashboard',
        mappedToComponentIds: [component.id],
        rationale: '고객사 운영 지표와 Wrtn 처리 성과를 통합 시각화합니다.',
        enabled: true,
      });
    }

    if (component.type === 'security' && !wrtnModulesMap.has('security-layer')) {
      wrtnModulesMap.set('security-layer', {
        id: `wrtn-security-layer-${nanoid(4)}`,
        wrtnModule: 'security-layer',
        label: 'Security Layer',
        mappedToComponentIds: [component.id],
        rationale: '기존 인증/권한 체계를 유지하면서 Wrtn 계층을 안전하게 연결합니다.',
        enabled: true,
      });
    }

    if (component.type === 'integration' && /규정|문서|검색|지식/i.test(haystack) && !wrtnModulesMap.has('rag-search')) {
      wrtnModulesMap.set('rag-search', {
        id: `wrtn-rag-search-${nanoid(4)}`,
        wrtnModule: 'rag-search',
        label: 'RAG Search',
        mappedToComponentIds: [component.id],
        rationale: '문서/규정 질의를 답변 가능 형태로 재구성하는 검색 증강 계층입니다.',
        enabled: true,
      });
    }
  });

  if (wrtnModulesMap.size === 0) {
    const first = extraction.customerComponents[0];
    wrtnModulesMap.set('agent-orchestrator', {
      id: `wrtn-agent-${nanoid(4)}`,
      wrtnModule: 'agent-orchestrator',
      label: 'Agent Orchestrator',
      mappedToComponentIds: first ? [first.id] : [],
      rationale: '고객사 구조 위에 Wrtn 오케스트레이션 계층을 배치합니다.',
      enabled: true,
    });
  }

  const wrtnModules = Array.from(wrtnModulesMap.values());
  const connections: ArchitectureConnection[] = [];

  extraction.customerComponents.forEach((component) => {
    const matched = wrtnModules.filter((module) => module.mappedToComponentIds.includes(component.id));
    matched.forEach((module) => {
      connections.push({
        id: `conn-${component.id}-${module.id}`,
        from: component.id,
        to: module.id,
        label: component.type === 'channel' ? 'request' : 'integration',
        flowType: component.type === 'channel' ? 'request' : 'data',
      });
    });
  });

  wrtnModules.forEach((module) => {
    if (module.wrtnModule === 'analytics-dashboard') {
      connections.push({
        id: `conn-${module.id}-analytics`,
        from: module.id,
        to: 'group-analytics-anchor',
        label: 'metrics',
        flowType: 'event',
      });
    }
  });

  return {
    extraction: {
      ...extraction,
      customerComponents: extraction.customerComponents.map((component) => ({
        ...component,
        description: component.description || mapGroupId(component.type),
      })),
    },
    wrtnModules,
    groups,
    connections,
    layoutStyle,
    referenceStyleProfileId,
    rationale: wrtnModules.map((module) => `${module.label}: ${module.rationale}`),
  };
}

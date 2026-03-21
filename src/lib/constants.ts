import { StepDefinition, StepId } from './types';

export const STEPS: StepDefinition[] = [
  { id: 0, name: '문서 분석', description: 'RFI/RFP 문서를 업로드하고 분석합니다', requiresOptions: false, optional: true },
  { id: 1, name: '자동 기획', description: 'AI가 방향, 장수, 구조를 자동으로 결정합니다', requiresOptions: false },
  { id: 2, name: '콘텐츠 문서화', description: '슬라이드별 콘텐츠 명세서를 작성합니다', requiresOptions: false },
  { id: 3, name: '디자인 플랜', description: 'Deck Design Plan을 생성합니다', requiresOptions: false },
  { id: 4, name: '표현 방식', description: '슬라이드별 시각 표현 방식을 선택합니다', requiresOptions: true },
  { id: 5, name: '슬라이드 완성', description: '선택된 표현 방식으로 슬라이드를 완성합니다', requiresOptions: false },
];

export function getStep(id: StepId): StepDefinition {
  return STEPS.find((s) => s.id === id)!;
}

export const DEFAULT_PROVIDER = 'openai' as const;

export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
export const OPENAI_MODEL = 'anthropic/claude-sonnet-4';

export const STRUCTURED_DATA_START = '<!--STRUCTURED_DATA';
export const STRUCTURED_DATA_END = '-->';

import {
  SlideSpec,
  SlideRoleAssignment,
  SlideRole,
  CompositionVariant,
  ExpressionFamily,
  InformationStructure,
  CommunicativeGoal,
} from '../types';

/** Output of the rule-based recommender */
export interface ExpressionRecommendation {
  family: ExpressionFamily;
  weight: number;
  reason: string;
  suggestedComposition: CompositionVariant;
}

// ─── Role → expression family base weights ───

interface RoleRule {
  families: [ExpressionFamily, number][];
  structure: InformationStructure;
  goal: CommunicativeGoal;
}

const ROLE_RULES: Record<SlideRole, RoleRule> = {
  'cover': {
    families: [['center-stage', 0.9]],
    structure: 'singular-focus',
    goal: 'orient',
  },
  'toc': {
    families: [['icon-list', 0.8], ['cards', 0.7], ['flow-diagram', 0.5]],
    structure: 'categorical',
    goal: 'orient',
  },
  'section-divider': {
    families: [['center-stage', 0.9]],
    structure: 'singular-focus',
    goal: 'orient',
  },
  'key-message': {
    families: [['center-stage', 0.8], ['cards', 0.6], ['contrast-split', 0.5]],
    structure: 'singular-focus',
    goal: 'convince',
  },
  'detailed-explanation': {
    families: [['cards', 0.7], ['icon-list', 0.7], ['stacked-layers', 0.5], ['flow-diagram', 0.4]],
    structure: 'categorical',
    goal: 'explain',
  },
  'data-visualization': {
    families: [['chart', 0.9], ['scorecard', 0.7], ['table', 0.5]],
    structure: 'quantitative',
    goal: 'quantify',
  },
  'comparison': {
    families: [['table', 0.8], ['contrast-split', 0.8], ['cards', 0.6], ['matrix', 0.5]],
    structure: 'comparison',
    goal: 'compare',
  },
  'architecture-blueprint': {
    families: [['hub-spoke', 0.8], ['flow-diagram', 0.8], ['stacked-layers', 0.7]],
    structure: 'relational',
    goal: 'demonstrate',
  },
  'conclusion': {
    families: [['center-stage', 0.7], ['cards', 0.6], ['icon-list', 0.5]],
    structure: 'singular-focus',
    goal: 'summarize',
  },
};

// ─── Keyword boosters ───

const KEYWORD_BOOSTS: [RegExp, ExpressionFamily, number][] = [
  [/비교|vs|대비|차이|versus/i, 'contrast-split', 0.2],
  [/타임라인|일정|로드맵|단계/i, 'timeline', 0.3],
  [/아키텍처|구조|시스템|연동/i, 'hub-spoke', 0.2],
  [/KPI|지표|수치|데이터|통계/i, 'scorecard', 0.25],
  [/프로세스|흐름|절차|워크플로/i, 'flow-diagram', 0.25],
  [/계층|레이어|스택/i, 'stacked-layers', 0.2],
  [/매트릭스|사분면|2x2/i, 'matrix', 0.3],
  [/퍼널|전환|유입/i, 'funnel', 0.3],
];

// ─── ExpressionFamily → CompositionVariant mapping ───

const FAMILY_TO_COMPOSITION: Record<ExpressionFamily, CompositionVariant> = {
  'table': 'comparison-table',
  'cards': 'grid-cards',
  'flow-diagram': 'flow-horizontal',
  'timeline': 'timeline',
  'hub-spoke': 'hub-spoke',
  'stacked-layers': 'stack-vertical',
  'chart': 'center-highlight',
  'contrast-split': 'side-by-side',
  'icon-list': 'icon-list',
  'center-stage': 'center-highlight',
  'matrix': 'grid-cards',
  'funnel': 'flow-vertical',
  'pyramid': 'stack-vertical',
  'scorecard': 'grid-cards',
};

/**
 * Returns ranked expression family recommendations based on slide role + content keywords.
 * Pure function — no side effects, no state mutation.
 */
export function getExpressionRecommendations(
  spec: SlideSpec,
  assignment: SlideRoleAssignment,
): ExpressionRecommendation[] {
  const roleRule = ROLE_RULES[assignment.role];
  if (!roleRule) return [];

  const weightMap = new Map<ExpressionFamily, { weight: number; reasons: string[] }>();

  // 1. Role-based base weights
  for (const [family, baseWeight] of roleRule.families) {
    weightMap.set(family, {
      weight: baseWeight,
      reasons: [`역할 "${assignment.role}" 기본 추천`],
    });
  }

  // 2. Keyword boosts from spec fields
  const searchText = [
    spec.purpose,
    spec.keyMessage,
    spec.suggestedVisual || '',
    ...spec.requiredElements,
  ].join(' ');

  for (const [pattern, family, boost] of KEYWORD_BOOSTS) {
    if (pattern.test(searchText)) {
      const existing = weightMap.get(family) || { weight: 0, reasons: [] };
      existing.weight = Math.min(1.0, existing.weight + boost);
      existing.reasons.push(`키워드 매칭: ${pattern.source}`);
      weightMap.set(family, existing);
    }
  }

  // 3. Sort by weight descending, take top 5
  return Array.from(weightMap.entries())
    .map(([family, { weight, reasons }]) => ({
      family,
      weight,
      reason: reasons.join('; '),
      suggestedComposition: FAMILY_TO_COMPOSITION[family] || 'default',
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
}

/** Derive information structure from slide role. */
export function getInformationStructure(
  _spec: SlideSpec,
  assignment: SlideRoleAssignment,
): InformationStructure {
  return ROLE_RULES[assignment.role]?.structure || 'categorical';
}

/** Derive communicative goal from slide role. */
export function getCommunicativeGoal(
  _spec: SlideSpec,
  assignment: SlideRoleAssignment,
): CommunicativeGoal {
  return ROLE_RULES[assignment.role]?.goal || 'explain';
}

/** Get the default composition for a given expression family. */
export function getCompositionForFamily(family: ExpressionFamily): CompositionVariant {
  return FAMILY_TO_COMPOSITION[family] || 'default';
}

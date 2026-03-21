// ─── Layer 1: 구조적 벤치마크 결과 타입 ───

export interface CompletenessScore {
  totalRequiredElements: number;
  coveredElements: number;
  missingElements: string[];
  score: number;
}

export interface StructureComplianceScore {
  slideCountMatch: boolean;
  expectedSlideCount: number;
  actualSlideCount: number;
  roleViolations: number;
  violationDetails: string[];
  score: number;
}

export interface ExpressionAlignmentScore {
  totalSlides: number;
  matchedExpressions: number;
  mismatchDetails: string[];
  score: number;
}

export interface ContentDensityScore {
  emptySlides: number;
  overloadedSlides: number;
  optimalSlides: number;
  totalSlides: number;
  slideDetails: { slideNumber: number; bulletCount: number; status: 'empty' | 'sparse' | 'optimal' | 'dense' | 'overloaded' }[];
  score: number;
}

export interface DesignConsistencyScore {
  compositionVariety: number;
  uniqueCompositions: string[];
  maxSameCompositionStreak: number;
  score: number;
}

export interface StructuralBenchmarkResult {
  completeness: CompletenessScore;
  structureCompliance: StructureComplianceScore;
  expressionAlignment: ExpressionAlignmentScore;
  contentDensity: ContentDensityScore;
  designConsistency: DesignConsistencyScore;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  warnings: string[];
  timestamp: string;
}

// ─── Layer 2: LLM Judge 결과 타입 ───

export interface SlideNote {
  slideNumber: number;
  score: number;
  note: string;
}

export interface LlmJudgeResult {
  informationCoverage: number;
  logicalFlow: number;
  expressionFit: number;
  messageClarify: number;
  audienceRelevance: number;
  overallQuality: number;
  strengths: string[];
  improvements: string[];
  slideSpecificNotes: SlideNote[];
  timestamp: string;
}

// ─── 종합 벤치마크 결과 ───

export interface BenchmarkResult {
  caseName: string;
  structural: StructuralBenchmarkResult;
  llmJudge?: LlmJudgeResult;
  timestamp: string;
}

// ─── 가중치 설정 ───

export const SCORE_WEIGHTS = {
  completeness: 0.30,
  structureCompliance: 0.25,
  expressionAlignment: 0.15,
  contentDensity: 0.15,
  designConsistency: 0.15,
} as const;

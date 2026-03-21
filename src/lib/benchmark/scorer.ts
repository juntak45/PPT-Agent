import {
  FinalDeckPlan,
  SlideContent,
  ContentSpecification,
  DeckDesignPlan,
} from '../types';
import { validateSlideAgainstRole } from '../pipeline/validator';
import {
  CompletenessScore,
  StructureComplianceScore,
  ExpressionAlignmentScore,
  ContentDensityScore,
  DesignConsistencyScore,
  StructuralBenchmarkResult,
  SCORE_WEIGHTS,
} from './types';

// ─── 1.1 Completeness Score ───

function collectSlideText(slide: SlideContent): string {
  const parts: string[] = [];
  if (slide.title) parts.push(slide.title);
  if (slide.subTitle) parts.push(slide.subTitle);
  if (slide.bodyText) parts.push(slide.bodyText);
  if (slide.keyMessage) parts.push(slide.keyMessage);
  if (slide.bulletPoints) parts.push(...slide.bulletPoints);
  if (slide.secondaryPoints) parts.push(...slide.secondaryPoints);
  if (slide.footnote) parts.push(slide.footnote);
  return parts.join(' ').toLowerCase();
}

function fuzzyMatch(needle: string, haystack: string): boolean {
  const normalized = needle.toLowerCase().trim();
  // Exact substring match
  if (haystack.includes(normalized)) return true;
  // Check if at least 60% of words match
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return false;
  const matched = words.filter((w) => haystack.includes(w)).length;
  return matched / words.length >= 0.6;
}

export function scoreCompleteness(
  contentSpec: ContentSpecification,
  slides: SlideContent[],
): CompletenessScore {
  const allRequired: { slideNumber: number; element: string }[] = [];
  for (const spec of contentSpec.slideSpecs) {
    for (const el of spec.requiredElements) {
      allRequired.push({ slideNumber: spec.slideNumber, element: el });
    }
  }

  const missing: string[] = [];
  let covered = 0;

  for (const { slideNumber, element } of allRequired) {
    const slide = slides.find((s) => s.slideNumber === slideNumber);
    if (!slide) {
      missing.push(`슬라이드 ${slideNumber} 누락: ${element}`);
      continue;
    }
    const text = collectSlideText(slide);
    if (fuzzyMatch(element, text)) {
      covered++;
    } else {
      missing.push(`슬라이드 ${slideNumber}: "${element}" 미반영`);
    }
  }

  const total = allRequired.length;
  return {
    totalRequiredElements: total,
    coveredElements: covered,
    missingElements: missing,
    score: total > 0 ? covered / total : 1.0,
  };
}

// ─── 1.2 Structure Compliance Score ───

export function scoreStructureCompliance(plan: FinalDeckPlan): StructureComplianceScore {
  const expected = plan.confirmedSlideCount;
  const actual = plan.slides.filter((s) => s.approved).length;
  const slideCountMatch = expected === actual;

  const violationDetails: string[] = [];
  let totalViolations = 0;

  for (const finalSlide of plan.slides) {
    if (!finalSlide.approved) continue;
    const warnings = validateSlideAgainstRole(finalSlide.approved, finalSlide.roleAssignment);
    for (const w of warnings) {
      violationDetails.push(w.message);
      totalViolations++;
    }
  }

  if (!slideCountMatch) {
    violationDetails.unshift(`슬라이드 수 불일치: 예상 ${expected}, 실제 ${actual}`);
  }

  const totalSlides = plan.slides.length;
  const violationPenalty = totalSlides > 0 ? totalViolations / totalSlides : 0;
  const countPenalty = slideCountMatch ? 0 : 0.2;

  return {
    slideCountMatch,
    expectedSlideCount: expected,
    actualSlideCount: actual,
    roleViolations: totalViolations,
    violationDetails,
    score: Math.max(0, 1.0 - violationPenalty - countPenalty),
  };
}

// ─── 1.3 Expression Alignment Score ───

export function scoreExpressionAlignment(plan: FinalDeckPlan): ExpressionAlignmentScore {
  const slidesWithExpression = plan.slides.filter((s) => s.selectedExpression && s.approved);
  const total = slidesWithExpression.length;
  const mismatchDetails: string[] = [];
  let matched = 0;

  for (const slide of slidesWithExpression) {
    const expectedComposition = slide.selectedExpression!.wireframe.composition;
    const actualComposition = slide.approved!.composition || 'default';

    if (expectedComposition === actualComposition) {
      matched++;
    } else {
      mismatchDetails.push(
        `슬라이드 ${slide.slideNumber}: 예상 ${expectedComposition}, 실제 ${actualComposition}`
      );
    }
  }

  // If no expressions were selected (legacy flow), give full score
  if (total === 0) {
    return { totalSlides: plan.slides.length, matchedExpressions: 0, mismatchDetails: [], score: 1.0 };
  }

  return {
    totalSlides: total,
    matchedExpressions: matched,
    mismatchDetails,
    score: total > 0 ? matched / total : 1.0,
  };
}

// ─── 1.4 Content Density Score ───

function classifyDensity(bulletCount: number): 'empty' | 'sparse' | 'optimal' | 'dense' | 'overloaded' {
  if (bulletCount === 0) return 'empty';
  if (bulletCount <= 2) return 'sparse';
  if (bulletCount <= 6) return 'optimal';
  if (bulletCount <= 8) return 'dense';
  return 'overloaded';
}

export function scoreContentDensity(slides: SlideContent[]): ContentDensityScore {
  const slideDetails = slides.map((slide) => {
    const bulletCount = slide.bulletPoints?.length || 0;
    return {
      slideNumber: slide.slideNumber,
      bulletCount,
      status: classifyDensity(bulletCount),
    };
  });

  const empty = slideDetails.filter((d) => d.status === 'empty').length;
  const overloaded = slideDetails.filter((d) => d.status === 'overloaded').length;
  const optimal = slideDetails.filter((d) => d.status === 'optimal').length;
  const total = slides.length;

  // Score: optimal slides are rewarded, empty/overloaded are penalized
  const emptyPenalty = total > 0 ? (empty * 0.15) : 0;
  const overloadPenalty = total > 0 ? (overloaded * 0.1) : 0;
  const optimalBonus = total > 0 ? (optimal / total) * 0.3 : 0;

  return {
    emptySlides: empty,
    overloadedSlides: overloaded,
    optimalSlides: optimal,
    totalSlides: total,
    slideDetails,
    score: Math.max(0, Math.min(1.0, 0.7 + optimalBonus - emptyPenalty - overloadPenalty)),
  };
}

// ─── 1.5 Design Consistency Score ───

export function scoreDesignConsistency(slides: SlideContent[]): DesignConsistencyScore {
  const compositions = slides.map((s) => s.composition || 'default');
  const uniqueCompositions = [...new Set(compositions)];

  // Calculate max same-composition streak
  let maxStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < compositions.length; i++) {
    if (compositions[i] === compositions[i - 1]) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  const total = slides.length;
  const variety = uniqueCompositions.length;

  // Ideal: variety > 3 and streaks ≤ 2
  // Penalize: all same composition (variety=1) or long streaks (>3)
  let score = 1.0;
  if (total > 3) {
    if (variety === 1) score -= 0.4; // 모든 슬라이드 같은 composition
    else if (variety === 2) score -= 0.15;
  }
  if (maxStreak > 3) score -= 0.2;
  else if (maxStreak > 2) score -= 0.1;

  return {
    compositionVariety: variety,
    uniqueCompositions,
    maxSameCompositionStreak: maxStreak,
    score: Math.max(0, Math.min(1.0, score)),
  };
}

// ─── 종합 점수 ───

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 0.9) return 'A';
  if (score >= 0.75) return 'B';
  if (score >= 0.6) return 'C';
  if (score >= 0.4) return 'D';
  return 'F';
}

export function runStructuralBenchmark(plan: FinalDeckPlan): StructuralBenchmarkResult {
  const approvedSlides = plan.slides
    .map((s) => s.approved)
    .filter((s): s is SlideContent => !!s);

  const completeness = scoreCompleteness(plan.contentSpec, approvedSlides);
  const structureCompliance = scoreStructureCompliance(plan);
  const expressionAlignment = scoreExpressionAlignment(plan);
  const contentDensity = scoreContentDensity(approvedSlides);
  const designConsistency = scoreDesignConsistency(approvedSlides);

  const overallScore =
    completeness.score * SCORE_WEIGHTS.completeness +
    structureCompliance.score * SCORE_WEIGHTS.structureCompliance +
    expressionAlignment.score * SCORE_WEIGHTS.expressionAlignment +
    contentDensity.score * SCORE_WEIGHTS.contentDensity +
    designConsistency.score * SCORE_WEIGHTS.designConsistency;

  const warnings: string[] = [];
  if (completeness.score < 0.7) warnings.push(`정보 커버리지 낮음 (${(completeness.score * 100).toFixed(0)}%)`);
  if (structureCompliance.roleViolations > 3) warnings.push(`역할 위반 ${structureCompliance.roleViolations}건`);
  if (contentDensity.emptySlides > 0) warnings.push(`빈 슬라이드 ${contentDensity.emptySlides}개`);
  if (designConsistency.compositionVariety <= 2 && approvedSlides.length > 5) warnings.push('시각적 다양성 부족');
  if (!structureCompliance.slideCountMatch) warnings.push('슬라이드 수 불일치');

  return {
    completeness,
    structureCompliance,
    expressionAlignment,
    contentDensity,
    designConsistency,
    overallScore: Math.round(overallScore * 1000) / 1000,
    grade: calculateGrade(overallScore),
    warnings,
    timestamp: new Date().toISOString(),
  };
}

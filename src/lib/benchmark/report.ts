import { BenchmarkResult, StructuralBenchmarkResult, LlmJudgeResult } from './types';

function bar(score: number, width = 20): string {
  const filled = Math.round(score * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

function formatLlmScore(score: number): string {
  return `${score}/5`;
}

export function generateStructuralReport(result: StructuralBenchmarkResult): string {
  const lines: string[] = [];

  lines.push(`# PPT 구조적 벤치마크 리포트`);
  lines.push(`> 평가 시각: ${result.timestamp}`);
  lines.push('');
  lines.push(`## 종합 점수: ${formatScore(result.overallScore)} (${result.grade})`);
  lines.push(`${bar(result.overallScore)}`);
  lines.push('');

  // Completeness
  const c = result.completeness;
  lines.push(`### 1. 정보 커버리지 — ${formatScore(c.score)}`);
  lines.push(`${bar(c.score)} ${c.coveredElements}/${c.totalRequiredElements} 요소 반영`);
  if (c.missingElements.length > 0) {
    lines.push(`미반영 항목:`);
    c.missingElements.slice(0, 5).forEach((m) => lines.push(`  - ${m}`));
    if (c.missingElements.length > 5) lines.push(`  - ... 외 ${c.missingElements.length - 5}건`);
  }
  lines.push('');

  // Structure Compliance
  const s = result.structureCompliance;
  lines.push(`### 2. 구조 준수 — ${formatScore(s.score)}`);
  lines.push(`${bar(s.score)} 슬라이드 수: ${s.actualSlideCount}/${s.expectedSlideCount} ${s.slideCountMatch ? '✅' : '❌'}`);
  if (s.roleViolations > 0) {
    lines.push(`역할 위반 ${s.roleViolations}건:`);
    s.violationDetails.slice(0, 5).forEach((v) => lines.push(`  - ${v}`));
  }
  lines.push('');

  // Expression Alignment
  const e = result.expressionAlignment;
  lines.push(`### 3. 표현 정합성 — ${formatScore(e.score)}`);
  lines.push(`${bar(e.score)} ${e.matchedExpressions}/${e.totalSlides} 매칭`);
  if (e.mismatchDetails.length > 0) {
    e.mismatchDetails.forEach((m) => lines.push(`  - ${m}`));
  }
  lines.push('');

  // Content Density
  const d = result.contentDensity;
  lines.push(`### 4. 정보 밀도 — ${formatScore(d.score)}`);
  lines.push(`${bar(d.score)} 최적 ${d.optimalSlides} | 비어있음 ${d.emptySlides} | 과밀 ${d.overloadedSlides}`);
  lines.push('');

  // Design Consistency
  const dc = result.designConsistency;
  lines.push(`### 5. 디자인 일관성 — ${formatScore(dc.score)}`);
  lines.push(`${bar(dc.score)} composition 종류: ${dc.compositionVariety} | 최대 연속: ${dc.maxSameCompositionStreak}`);
  lines.push(`사용된 구도: ${dc.uniqueCompositions.join(', ')}`);
  lines.push('');

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(`### ⚠️ 경고`);
    result.warnings.forEach((w) => lines.push(`- ${w}`));
    lines.push('');
  }

  return lines.join('\n');
}

export function generateLlmJudgeReport(result: LlmJudgeResult): string {
  const lines: string[] = [];

  lines.push(`# LLM 평가 리포트`);
  lines.push(`> 평가 시각: ${result.timestamp}`);
  lines.push('');

  const items = [
    { label: '정보 커버리지', score: result.informationCoverage },
    { label: '논리 흐름', score: result.logicalFlow },
    { label: '표현 적합성', score: result.expressionFit },
    { label: '메시지 명확성', score: result.messageClarify },
    { label: '청중 적절성', score: result.audienceRelevance },
    { label: '종합 품질', score: result.overallQuality },
  ];

  lines.push(`| 항목 | 점수 | |`);
  lines.push(`|------|------|------|`);
  for (const item of items) {
    lines.push(`| ${item.label} | ${formatLlmScore(item.score)} | ${bar(item.score / 5, 15)} |`);
  }
  lines.push('');

  if (result.strengths.length > 0) {
    lines.push(`### ✅ 강점`);
    result.strengths.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }

  if (result.improvements.length > 0) {
    lines.push(`### 🔧 개선 필요`);
    result.improvements.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }

  if (result.slideSpecificNotes.length > 0) {
    lines.push(`### 슬라이드별 코멘트`);
    for (const note of result.slideSpecificNotes) {
      lines.push(`- **#${note.slideNumber}** (${formatLlmScore(note.score)}): ${note.note}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function generateFullReport(result: BenchmarkResult): string {
  const parts: string[] = [];

  parts.push(`# 벤치마크 리포트: ${result.caseName}`);
  parts.push(`> ${result.timestamp}`);
  parts.push('');
  parts.push('---');
  parts.push('');
  parts.push(generateStructuralReport(result.structural));

  if (result.llmJudge) {
    parts.push('---');
    parts.push('');
    parts.push(generateLlmJudgeReport(result.llmJudge));
  }

  return parts.join('\n');
}

export function generateJsonReport(result: BenchmarkResult): string {
  return JSON.stringify(result, null, 2);
}

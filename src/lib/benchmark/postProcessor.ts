import { SlideContent, SlideRoleAssignment, SlideSpec } from '../types';

export interface CorrectionLog {
  slideNumber: number;
  role: string;
  field: string;
  action: string;
  before: string;
  after: string;
}

const BULLET_LIMITS: Record<string, number> = {
  'cover': 5,
  'toc': 10,
  'section-divider': 2,
  'key-message': 5,
  'detailed-explanation': 8,
  'comparison': 8,
  'data-visualization': 6,
  'architecture-blueprint': 6,
  'conclusion': 5,
};

export function postProcessSlide(
  slide: SlideContent,
  assignment: SlideRoleAssignment,
  spec: SlideSpec,
): { corrected: SlideContent; logs: CorrectionLog[] } {
  const logs: CorrectionLog[] = [];
  let corrected = { ...slide };

  // 1. keyMessage 누락 보정
  if (!corrected.keyMessage && spec.keyMessage) {
    logs.push({
      slideNumber: slide.slideNumber,
      role: assignment.role,
      field: 'keyMessage',
      action: '자동 생성',
      before: '(없음)',
      after: spec.keyMessage,
    });
    corrected.keyMessage = spec.keyMessage;
  }

  // 2. subTitle 누락 보정
  if (!corrected.subTitle) {
    const newSubTitle = spec.sectionName;
    logs.push({
      slideNumber: slide.slideNumber,
      role: assignment.role,
      field: 'subTitle',
      action: '자동 생성',
      before: '(없음)',
      after: newSubTitle,
    });
    corrected.subTitle = newSubTitle;
  }

  // 3. data-visualization: chartData 보정
  if (assignment.role === 'data-visualization' && !corrected.chartData && !corrected.mermaidCode) {
    const labels = spec.requiredElements.slice(0, 4).map((el) => {
      const colonIdx = el.indexOf(':');
      return colonIdx > 0 ? el.slice(0, colonIdx).trim() : el.slice(0, 15);
    });
    const placeholderData = {
      labels,
      values: labels.map((_, i) => 30 + i * 15),
      seriesName: spec.sectionName,
    };
    logs.push({
      slideNumber: slide.slideNumber,
      role: assignment.role,
      field: 'chartData',
      action: '자동 생성',
      before: '(없음)',
      after: `placeholder bar chart (${labels.length} labels)`,
    });
    corrected.chartData = placeholderData;
    if (!corrected.chartType) corrected.chartType = 'bar';
    if (corrected.layout !== 'chart') {
      logs.push({
        slideNumber: slide.slideNumber,
        role: assignment.role,
        field: 'layout',
        action: '값 교정',
        before: corrected.layout,
        after: 'chart',
      });
      corrected.layout = 'chart';
    }
  }

  // 4. architecture-blueprint: mermaidCode 보정
  if (assignment.role === 'architecture-blueprint' && !corrected.mermaidCode && (!corrected.bulletPoints || corrected.bulletPoints.length === 0)) {
    const nodes = spec.requiredElements.slice(0, 4);
    const mermaid = nodes.length >= 2
      ? `flowchart LR\n${nodes.slice(1).map((n, i) => `  A${i}[${nodes[0]}] --> B${i}[${n}]`).join('\n')}`
      : 'flowchart LR\n  A[System] --> B[Component]';
    logs.push({
      slideNumber: slide.slideNumber,
      role: assignment.role,
      field: 'mermaidCode',
      action: '자동 생성',
      before: '(없음)',
      after: `flowchart (${nodes.length} nodes)`,
    });
    corrected.mermaidCode = mermaid;
    if (corrected.layout !== 'diagram') {
      corrected.layout = 'diagram';
    }
  }

  // 5. comparison: composition 보정
  if (assignment.role === 'comparison') {
    const validCompositions = ['comparison-table', 'side-by-side'];
    const validLayouts = ['two-column'];
    if (!validCompositions.includes(corrected.composition || '') && !validLayouts.includes(corrected.layout)) {
      logs.push({
        slideNumber: slide.slideNumber,
        role: assignment.role,
        field: 'composition',
        action: 'composition 변경',
        before: corrected.composition || 'default',
        after: 'comparison-table',
      });
      corrected.composition = 'comparison-table';
    }
  }

  // 6. bulletPoints 수 초과 보정
  const limit = BULLET_LIMITS[assignment.role];
  if (limit && corrected.bulletPoints && corrected.bulletPoints.length > limit) {
    logs.push({
      slideNumber: slide.slideNumber,
      role: assignment.role,
      field: 'bulletPoints',
      action: '값 교정',
      before: `${corrected.bulletPoints.length}개`,
      after: `${limit}개 (잘라냄)`,
    });
    corrected.bulletPoints = corrected.bulletPoints.slice(0, limit);
    if (corrected.iconHints) {
      corrected.iconHints = corrected.iconHints.slice(0, limit);
    }
  }

  return { corrected, logs };
}

/** Print correction logs to console */
export function printCorrectionLogs(logs: CorrectionLog[]): void {
  if (logs.length === 0) return;
  for (const log of logs) {
    console.log(`[보정] 슬라이드 ${log.slideNumber} (${log.role}): ${log.field} ${log.action} — ${log.before} → ${log.after}`);
  }
}

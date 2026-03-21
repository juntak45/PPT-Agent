import { ReferenceAnalysis } from '../types';

/**
 * Build a single reference's section for the prompt.
 */
function buildSingleReferenceSection(analysis: ReferenceAnalysis, label: string): string {
  const parts: string[] = [];

  parts.push(`### ${label}`);

  // Section flow
  if (analysis.sectionFlow.length > 0) {
    parts.push(`**섹션 흐름**: ${analysis.sectionFlow.join(' → ')}`);
  }

  // Theme info (PPTX에서 추출한 색상/폰트)
  if (analysis.themeInfo) {
    const ti = analysis.themeInfo;
    const themeLines: string[] = [];
    if (ti.fontHeading) themeLines.push(`- 제목 폰트: ${ti.fontHeading}`);
    if (ti.fontBody) themeLines.push(`- 본문 폰트: ${ti.fontBody}`);
    if (ti.accentColors.length > 0) themeLines.push(`- 액센트 색상: ${ti.accentColors.join(', ')}`);
    themeLines.push(`- 배경 스타일: ${ti.backgroundStyle}`);
    if (themeLines.length > 0) {
      parts.push(`**디자인 테마**:\n${themeLines.join('\n')}`);
    }
  }

  // Writing style
  const style = analysis.writingStyle;
  if (style) {
    const styleLines: string[] = [];
    if (style.tone) styleLines.push(`- 톤: ${style.tone}`);
    if (style.bulletStyle) styleLines.push(`- 불릿 스타일: ${style.bulletStyle}`);
    if (style.commonPhrases.length > 0) {
      styleLines.push(`- 자주 쓰는 표현: ${style.commonPhrases.slice(0, 5).map((p) => `"${p}"`).join(', ')}`);
    }
    if (styleLines.length > 0) {
      parts.push(`**작성 스타일**:\n${styleLines.join('\n')}`);
    }
  }

  // Slide layout patterns (condensed)
  if (analysis.slidePatterns.length > 0) {
    const patternLines = analysis.slidePatterns.slice(0, 10).map((p) => {
      const extras = [
        p.hasChart ? '차트' : '',
        p.hasDiagram ? '다이어그램' : '',
      ].filter(Boolean).join('+');
      return `- ${p.sectionName}: ${p.layoutType}, 밀도 ${p.contentDensity}${extras ? ` (${extras})` : ''}`;
    });
    parts.push(`**슬라이드별 레이아웃 패턴**:\n${patternLines.join('\n')}`);
  }

  // Layout blueprints (detailed shape placement)
  if (analysis.layoutBlueprints && analysis.layoutBlueprints.length > 0) {
    const blueprintLines = analysis.layoutBlueprints
      .filter((bp) => bp.shapes.length > 0)
      .slice(0, 12)
      .map((bp) => {
        const shapeDescs = bp.shapes
          .filter((s) => s.position.w > 5 && s.position.h > 5)
          .map((s) => {
            const pos = `(${s.position.x},${s.position.y} ${s.position.w}x${s.position.h}%)`;
            const extra = s.subType ? `[${s.subType}]` : '';
            const visualInfo: string[] = [];
            if (s.fillColor) visualInfo.push(`배경:${s.fillColor}`);
            if (s.fontFace) visualInfo.push(`폰트:${s.fontFace}`);
            if (s.fontSize) visualInfo.push(`크기:${s.fontSize}pt`);
            const visualStr = visualInfo.length > 0 ? ` [${visualInfo.join(', ')}]` : '';
            return `  - ${s.type}${extra} ${pos}${s.text ? ` "${s.text.slice(0, 30)}"` : ''}${visualStr}`;
          });
        return `- 슬라이드${bp.slideNumber}: ${bp.compositionSummary}\n${shapeDescs.join('\n')}`;
      });
    parts.push(`**레이아웃 청사진** (위치는 x,y 너비x높이 %):\n${blueprintLines.join('\n')}`);
  }

  // Detailed slide analyses
  if (analysis.slideDetailedAnalyses && analysis.slideDetailedAnalyses.length > 0) {
    const detailLines = analysis.slideDetailedAnalyses.map((sa) => {
      const lines: string[] = [];
      lines.push(`#### 슬라이드 ${sa.slideNumber}`);
      lines.push(`- **목적**: ${sa.purpose}`);
      lines.push(`- **핵심 메시지**: ${sa.keyMessage}`);
      lines.push(`- **콘텐츠 전략**: ${sa.contentStrategy}`);
      lines.push(`- **디자인 의도**: ${sa.designIntent}`);
      if (sa.visualElements.length > 0) {
        lines.push(`- **시각 요소**:`);
        for (const ve of sa.visualElements) {
          lines.push(`  - ${ve.element}: ${ve.role} (${ve.placementReason})`);
        }
      }
      lines.push(`- **문체 패턴**: ${sa.writingPattern}`);
      lines.push(`- **스토리 연결**: ${sa.narrativeConnection}`);
      if (sa.notableTechniques.length > 0) {
        lines.push(`- **참고 기법**: ${sa.notableTechniques.join(', ')}`);
      }
      return lines.join('\n');
    });
    parts.push(`**슬라이드별 디테일 분석**:\n${detailLines.join('\n\n')}`);
  }

  // Sample sentences
  if (style?.sentencePatterns && style.sentencePatterns.length > 0) {
    const samples = style.sentencePatterns.slice(0, 3).map((s) => `- "${s}"`);
    parts.push(`**예시 문장**:\n${samples.join('\n')}`);
  }

  // Structural notes
  if (analysis.structuralNotes) {
    parts.push(`**구조적 특징**: ${analysis.structuralNotes}`);
  }

  return parts.join('\n\n');
}

export function buildReferenceBlock(analyses: ReferenceAnalysis[]): string {
  if (analyses.length === 0) return '';

  const parts: string[] = [];

  parts.push('## 참고 제안서 패턴 (반드시 이 패턴을 따라 작성하세요)');

  if (analyses.length === 1) {
    parts.push(buildSingleReferenceSection(analyses[0], '레퍼런스 제안서'));
  } else {
    // 다중 레퍼런스: 각각 동등하게 포함
    analyses.forEach((analysis, i) => {
      parts.push(buildSingleReferenceSection(analysis, `레퍼런스 ${i + 1}`));
    });

    // 공통점/차이점 요약
    const commonParts: string[] = [];

    // 공통 톤
    const tones = analyses.map((a) => a.writingStyle.tone).filter(Boolean);
    if (tones.length > 1) {
      const allSame = tones.every((t) => t === tones[0]);
      if (allSame) {
        commonParts.push(`- 톤: 모든 레퍼런스가 "${tones[0]}" 톤 사용`);
      } else {
        commonParts.push(`- 톤: ${tones.map((t, i) => `레퍼런스${i + 1}: "${t}"`).join(', ')}`);
      }
    }

    // 공통 불릿 스타일
    const bulletStyles = analyses.map((a) => a.writingStyle.bulletStyle).filter(Boolean);
    if (bulletStyles.length > 1) {
      const allSame = bulletStyles.every((b) => b === bulletStyles[0]);
      if (allSame) {
        commonParts.push(`- 불릿 스타일: 모든 레퍼런스가 "${bulletStyles[0]}" 사용`);
      } else {
        commonParts.push(`- 불릿 스타일: ${bulletStyles.map((b, i) => `레퍼런스${i + 1}: "${b}"`).join(', ')}`);
      }
    }

    // 슬라이드 수 비교
    const counts = analyses.map((a) => a.totalSlideCount).filter(Boolean);
    if (counts.length > 1) {
      commonParts.push(`- 슬라이드 수: ${counts.map((c, i) => `레퍼런스${i + 1}: ${c}장`).join(', ')}`);
    }

    if (commonParts.length > 0) {
      parts.push(`### 레퍼런스 간 비교\n${commonParts.join('\n')}`);
    }
  }

  return '\n\n---\n\n' + parts.join('\n\n');
}

/**
 * Build a step-specific reference hint to append to the reference block.
 * Each step emphasizes different aspects of the reference.
 */
export function buildStepSpecificHint(stepId: number, analyses: ReferenceAnalysis[]): string {
  if (analyses.length === 0) return '';

  // 모든 레퍼런스에서 정보 수집
  const hasBlueprints = analyses.some((a) => a.layoutBlueprints && a.layoutBlueprints.length > 0);
  const hasDetailedAnalyses = analyses.some((a) => a.slideDetailedAnalyses && a.slideDetailedAnalyses.length > 0);
  const allFlows = analyses.map((a) => a.sectionFlow.join(' → ')).filter(Boolean);
  const allBulletStyles = analyses.map((a) => a.writingStyle.bulletStyle).filter(Boolean);
  const bulletStyleStr = [...new Set(allBulletStyles)].join(' / ');
  const totalCounts = analyses.map((a) => a.totalSlideCount).filter(Boolean);

  switch (stepId) {
    case 1: // Auto planning
      return `\n\n**참고**: 레퍼런스의 전체 구조, 장수(${totalCounts.length > 0 ? totalCounts.map((c, i) => `레퍼런스${i + 1}: ${c}장`).join(', ') : '참고 없음'}), 섹션 구성, 기능 슬라이드 패턴, 발표 방향을 참고하여 최적의 기획안을 만드세요. 각 타겟 슬라이드마다 reuse/adapt/generate 전략과 reference slide mapping을 함께 결정하세요.${hasDetailedAnalyses ? ' 위 슬라이드별 디테일 분석의 스토리 연결(narrativeConnection)을 참고하여 전체 내러티브 흐름을 설계하세요.' : ''}`;

    case 2: // Content specification
      return `\n\n**참고**: 콘텐츠 명세 작성 시 레퍼런스 제안서의 작성 톤과 불릿 스타일("${bulletStyleStr}")을 따르세요.${hasDetailedAnalyses ? ' 위 슬라이드별 디테일 분석의 콘텐츠 전략, 시각 요소, 문체 패턴을 참고하여 각 슬라이드의 명세를 구체적으로 작성하세요.' : ''}`;

    case 3: // Design plan
      return `\n\n**참고**: 디자인 플랜 생성 시 레퍼런스 제안서의 레이아웃 패턴, 디자인 테마, 밀도 전략을 참고하세요.${hasBlueprints ? ' 레이아웃 청사진의 컴포넌트 배치를 참고하여 각 슬라이드의 역할별 적합한 구도를 결정하세요.' : ''}${hasDetailedAnalyses ? ' 디자인 의도와 시각 요소 배치를 참고하세요.' : ''}`;

    case 4: // Slide production
      if (hasDetailedAnalyses) {
        return `\n\n**참고**: 각 슬라이드를 제작할 때 위 "슬라이드별 디테일 분석"을 핵심 참고자료로 활용하세요. 특히:
- 유사한 목적의 슬라이드는 레퍼런스의 **디자인 의도**와 **콘텐츠 전략**을 따르세요
- **시각 요소**의 배치 이유를 참고하여 차트/다이어그램/이미지를 배치하세요
- **문체 패턴**("${bulletStyleStr}")과 **참고 기법**을 적용하세요
${hasBlueprints ? '- **레이아웃 청사진**의 컴포넌트 배치(위치와 크기)를 참고하세요' : ''}`;
      }
      if (hasBlueprints) {
        return `\n\n**참고**: 각 슬라이드를 제작할 때 위 "레이아웃 청사진"의 컴포넌트 배치(텍스트/차트/다이어그램/이미지 위치와 크기)를 참고하세요. 유사한 목적의 슬라이드는 레퍼런스와 동일한 레이아웃 구조를 사용하세요. 불릿 스타일("${bulletStyleStr}")도 따르세요.`;
      }
      return `\n\n**참고**: 각 슬라이드의 레이아웃, 콘텐츠 밀도, 작성 톤을 위 레퍼런스 패턴에 맞추세요. 특히 불릿 스타일("${bulletStyleStr}")을 따르세요.`;

    default:
      return '';
  }
}

/**
 * Match reference slides to current slide spec by section name similarity.
 * Returns matched reference slide numbers and their analyses.
 */
export function matchReferenceSlides(
  currentSectionName: string,
  analyses: ReferenceAnalysis[]
): { refIndex: number; slideNumber: number; sectionName: string; designIntent?: string; contentStrategy?: string }[] {
  const matches: { refIndex: number; slideNumber: number; sectionName: string; designIntent?: string; contentStrategy?: string }[] = [];
  const normalizedCurrent = currentSectionName.toLowerCase().replace(/\s/g, '');

  for (let refIdx = 0; refIdx < analyses.length; refIdx++) {
    const analysis = analyses[refIdx];

    // Check slide patterns for section name match
    for (const pattern of analysis.slidePatterns) {
      const normalizedSection = pattern.sectionName.toLowerCase().replace(/\s/g, '');
      if (normalizedCurrent.includes(normalizedSection) || normalizedSection.includes(normalizedCurrent)) {
        const detailed = analysis.slideDetailedAnalyses?.find((d) => d.slideNumber === pattern.slideNumber);
        matches.push({
          refIndex: refIdx,
          slideNumber: pattern.slideNumber,
          sectionName: pattern.sectionName,
          designIntent: detailed?.designIntent,
          contentStrategy: detailed?.contentStrategy,
        });
      }
    }
  }

  return matches;
}

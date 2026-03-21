import { StructuredData, OptionCandidate, SlideContent, SlideRoleAssignment } from '../types';

export function validateStructuredData(data: StructuredData): boolean {
  if (!data || !data.type || !data.data) return false;

  switch (data.type) {
    case 'auto_planning': {
      const d = data.data as Record<string, unknown>;
      const structure = d.structure as Record<string, unknown> | undefined;
      const totalSlides = typeof d.confirmedSlideCount === 'number' ? d.confirmedSlideCount : 0;
      const sections = Array.isArray(structure?.sections) ? (structure?.sections as Array<Record<string, unknown>>) : [];
      const sectionSlideCount = sections.reduce((sum, sec) => sum + (Number(sec.slideCount) || 0), 0);
      return !!(
        d.context &&
        d.direction &&
        totalSlides > 0 &&
        d.structure &&
        sections.length > 0 &&
        sectionSlideCount === totalSlides &&
        Array.isArray(d.slidePlans) &&
        (d.slidePlans as unknown[]).length === totalSlides
      );
    }
    case 'content_spec': {
      const spec = data.data as Record<string, unknown>;
      const slideSpecs = Array.isArray(spec?.slideSpecs) ? (spec.slideSpecs as Array<Record<string, unknown>>) : [];
      return !!(
        spec &&
        slideSpecs.length > 0 &&
        slideSpecs.every((slide) =>
          typeof slide.slideNumber === 'number' &&
          typeof slide.sectionName === 'string' &&
          typeof slide.purpose === 'string' &&
          typeof slide.keyMessage === 'string' &&
          Array.isArray(slide.requiredElements)
        )
      );
    }
    case 'deck_design_plan': {
      const plan = data.data as Record<string, unknown>;
      return !!(plan && plan.tone && plan.visualMotif && Array.isArray(plan.roleAssignments));
    }
    case 'expression_candidates': {
      const ec = data.data as Record<string, unknown>;
      const candidates = Array.isArray(ec?.candidates) ? (ec.candidates as Record<string, unknown>[]) : [];
      if (candidates.length < 2) return false;

      // Hard: unique expressionFamily
      const families = candidates.map((c) => c.expressionFamily);
      if (new Set(families).size !== candidates.length) return false;

      // Hard: unique composition
      const compositions = candidates.map((c) => {
        const wf = c.wireframe as Record<string, unknown> | undefined;
        return wf?.composition;
      });
      if (new Set(compositions).size < candidates.length) return false;

      // Hard: each candidate has valid structure + zones >= 2
      const structureValid = candidates.every((c) => {
        const wf = c.wireframe as Record<string, unknown> | undefined;
        const zones = Array.isArray(wf?.zones) ? wf.zones : [];
        return (
          typeof c.id === 'string' &&
          typeof c.expressionFamily === 'string' &&
          typeof c.label === 'string' &&
          typeof c.description === 'string' &&
          typeof c.rationale === 'string' &&
          wf !== null && typeof wf === 'object' &&
          zones.length >= 2
        );
      });
      if (!structureValid) return false;

      // Soft: label similarity warning (do NOT reject)
      const labelPrefixes = candidates.map((c) => String(c.label || '').slice(0, 8).toLowerCase());
      if (new Set(labelPrefixes).size < candidates.length) {
        console.warn('[validator] expression candidates have similar labels — acceptable but suboptimal');
      }

      return true;
    }
    case 'slide_candidates': {
      const sc = data.data as Record<string, unknown>;
      return !!(sc && Array.isArray(sc.candidates) && sc.candidates.length >= 1);
    }
    case 'doc_analysis':
      return typeof data.data === 'object' && data.data !== null;
    default:
      return false;
  }
}

// Kept for potential future use; currently only slide_candidates uses direct mapping in usePipeline
export function toOptionCandidates(data: unknown[]): OptionCandidate[] {
  return data.map((item: unknown, index: number) => {
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id as string) || `option-${index + 1}`,
      label: (obj.label as string) || (obj.title as string) || `옵션 ${index + 1}`,
      summary: (obj.summary as string) || '',
      detail: (obj.detail as string) || '',
    };
  });
}

// ─── Role Validator (warning-level, does not block generation) ───

interface RoleValidationWarning {
  slideNumber: number;
  role: string;
  message: string;
}

export function validateSlideAgainstRole(
  slide: SlideContent,
  assignment: SlideRoleAssignment,
): RoleValidationWarning[] {
  const warnings: RoleValidationWarning[] = [];
  const { role } = assignment;
  const bulletCount = slide.bulletPoints?.length || 0;

  switch (role) {
    case 'cover':
      if (bulletCount > 3) warnings.push({ slideNumber: slide.slideNumber, role, message: `cover: bulletPoints ${bulletCount}개 (≤3 권장)` });
      break;
    case 'toc':
      if (bulletCount === 0) warnings.push({ slideNumber: slide.slideNumber, role, message: 'toc: bulletPoints 필수 (섹션 목록)' });
      break;
    case 'section-divider':
      if (bulletCount > 1) warnings.push({ slideNumber: slide.slideNumber, role, message: `section-divider: bulletPoints ${bulletCount}개 (≤1 권장)` });
      break;
    case 'key-message':
      if (bulletCount > 3) warnings.push({ slideNumber: slide.slideNumber, role, message: `key-message: bulletPoints ${bulletCount}개 (≤3 권장)` });
      if (!slide.keyMessage) warnings.push({ slideNumber: slide.slideNumber, role, message: 'key-message: keyMessage 필수' });
      break;
    case 'detailed-explanation':
      if (bulletCount < 3 || bulletCount > 6) warnings.push({ slideNumber: slide.slideNumber, role, message: `detailed-explanation: bulletPoints ${bulletCount}개 (3~6 권장)` });
      break;
    case 'comparison':
      if (slide.layout !== 'two-column' && slide.composition !== 'side-by-side' && slide.composition !== 'comparison-table') {
        warnings.push({ slideNumber: slide.slideNumber, role, message: 'comparison: two-column/side-by-side/comparison-table 구도 권장' });
      }
      break;
    case 'data-visualization':
      if (!slide.chartData && !slide.mermaidCode) warnings.push({ slideNumber: slide.slideNumber, role, message: 'data-visualization: chartData 또는 mermaidCode 필수' });
      break;
    case 'architecture-blueprint':
      if (!slide.mermaidCode && bulletCount === 0) warnings.push({ slideNumber: slide.slideNumber, role, message: 'architecture-blueprint: mermaidCode 또는 bulletPoints 필수' });
      break;
    case 'conclusion':
      if (bulletCount > 3) warnings.push({ slideNumber: slide.slideNumber, role, message: `conclusion: bulletPoints ${bulletCount}개 (≤3 권장)` });
      break;
  }

  return warnings;
}

import { ArchitectureOverlayPlan, ArchitectureSlideModel, ArchitectureVariation, LayoutStyle } from './types';
import { buildArchitectureSlideModel } from './slideModelBuilder';
import { ReferenceAnalysis } from '../types';

const LAYOUT_ROTATION: LayoutStyle[] = ['enterprise-grid', 'layered-flow', 'platform-stack'];

export function buildArchitectureVariations(
  overlayPlan: ArchitectureOverlayPlan,
  references: ReferenceAnalysis[],
  targetScope: string,
): ArchitectureVariation[] {
  const baseIndex = LAYOUT_ROTATION.indexOf(overlayPlan.layoutStyle);

  return [0, 1, 2].map((offset) => {
    const nextStyle = LAYOUT_ROTATION[(baseIndex + offset) % LAYOUT_ROTATION.length];
    const nextOverlay: ArchitectureOverlayPlan = {
      ...overlayPlan,
      layoutStyle: nextStyle,
    };
    const slide = buildArchitectureSlideModel(nextOverlay, references);

    if (targetScope.startsWith('group:')) {
      const groupId = targetScope.replace('group:', '');
      slide.groups = slide.groups.map((group) => ({
        ...group,
        title: group.id === groupId && offset > 0 ? `${group.title} ${offset === 1 ? 'Optimized' : 'Focused'}` : group.title,
      }));
    }

    return {
      id: `variation-${offset + 1}`,
      label: offset === 0 ? '기준안' : offset === 1 ? '대안 A' : '대안 B',
      description: `${nextStyle} / ${targetScope}`,
      slide,
    };
  });
}

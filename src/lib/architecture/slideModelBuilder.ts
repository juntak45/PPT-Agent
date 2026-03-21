import { ArchitectureOverlayPlan, ArchitectureSlideModel } from './types';
import { buildPositionedModel } from './layoutPlanner';
import { buildDiagramStyleProfile } from './referenceStyle';
import { ReferenceAnalysis } from '../types';

export function buildArchitectureSlideModel(
  overlayPlan: ArchitectureOverlayPlan,
  references: ReferenceAnalysis[],
  themeId = 'corporate-blue',
): ArchitectureSlideModel {
  const styleProfile = buildDiagramStyleProfile(references);
  const positioned = buildPositionedModel(overlayPlan);

  return {
    title: overlayPlan.extraction.projectTitle,
    subtitle: overlayPlan.extraction.executiveSummary,
    layoutStyle: overlayPlan.layoutStyle,
    themeId,
    styleProfile,
    groups: positioned.groups,
    components: positioned.components,
    connections: positioned.connections,
    legend: [
      { label: 'Customer Systems', colorToken: 'customer' },
      { label: 'Wrtn Technology', colorToken: 'wrtn' },
      { label: 'Shared / Data', colorToken: 'shared' },
    ],
  };
}

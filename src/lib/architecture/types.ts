export type ComponentType =
  | 'channel'
  | 'customer-system'
  | 'integration'
  | 'data-store'
  | 'admin'
  | 'analytics'
  | 'security'
  | 'wrtn-module';

export type LayoutStyle = 'enterprise-grid' | 'layered-flow' | 'platform-stack';

export interface CustomerComponent {
  id: string;
  label: string;
  type: ComponentType;
  description?: string;
  sourceEvidence: string[];
  inferredFrom: 'rfi' | 'user-input' | 'reference';
  importance: 'high' | 'medium' | 'low';
}

export interface WrtnModuleMapping {
  id: string;
  wrtnModule:
    | 'stt'
    | 'intent-engine'
    | 'policy-retrieval'
    | 'agent-orchestrator'
    | 'workflow-engine'
    | 'rag-search'
    | 'analytics-dashboard'
    | 'admin-console'
    | 'security-layer';
  label: string;
  mappedToComponentIds: string[];
  rationale: string;
  enabled: boolean;
}

export interface ArchitectureConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
  flowType: 'request' | 'data' | 'control' | 'event';
}

export interface ArchitectureGroup {
  id: string;
  title: string;
  role: 'input' | 'customer-layer' | 'wrtn-core' | 'operations' | 'analytics' | 'data';
}

export interface ArchitectureExtractionResult {
  projectTitle: string;
  executiveSummary: string;
  customerProblems: string[];
  decisionDrivers: string[];
  currentState: string;
  targetState: string;
  customerComponents: CustomerComponent[];
  integrationPoints: string[];
  missingInformation: string[];
}

export interface DiagramStyleProfile {
  id: string;
  titleColor: string;
  subtitleColor: string;
  backgroundColor: string;
  groupFillColor: string;
  groupStrokeColor: string;
  customerFillColor: string;
  wrtnFillColor: string;
  sharedFillColor: string;
  connectionColor: string;
  legendStyle: 'dots' | 'badges';
  density: 'compact' | 'balanced' | 'spacious';
}

export interface ArchitectureOverlayPlan {
  extraction: ArchitectureExtractionResult;
  wrtnModules: WrtnModuleMapping[];
  groups: ArchitectureGroup[];
  connections: ArchitectureConnection[];
  layoutStyle: LayoutStyle;
  referenceStyleProfileId: string;
  rationale: string[];
}

export interface PositionedGroup extends ArchitectureGroup {
  x: number;
  y: number;
  w: number;
  h: number;
  colorToken: 'customer' | 'wrtn' | 'shared' | 'analytics';
}

export interface PositionedComponent extends CustomerComponent {
  groupId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  colorToken: 'customer' | 'wrtn' | 'shared' | 'analytics';
  editable: boolean;
}

export interface PositionedConnection extends ArchitectureConnection {
  points: Array<{ x: number; y: number }>;
}

export interface ArchitectureSlideModel {
  title: string;
  subtitle?: string;
  layoutStyle: LayoutStyle;
  themeId: string;
  styleProfile: DiagramStyleProfile;
  groups: PositionedGroup[];
  components: PositionedComponent[];
  connections: PositionedConnection[];
  legend?: { label: string; colorToken: string }[];
}

export interface ArchitectureVariation {
  id: string;
  label: string;
  description: string;
  slide: ArchitectureSlideModel;
}

export interface ArchitectureRefineRequest {
  slide: ArchitectureSlideModel;
  overlayPlan: ArchitectureOverlayPlan;
  targetScope: string;
  instruction: string;
}

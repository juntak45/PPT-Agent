// ─── Progress Callback ───
export type ProgressCallback = (detail: string) => void;

// ─── LLM Provider ───
export type LlmProviderType = 'claude' | 'openai';

export interface ContentBlockText {
  type: 'text';
  text: string;
}

export interface ContentBlockImage {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    data: string;
  };
}

export interface ContentBlockDocument {
  type: 'document';
  source: {
    type: 'base64';
    media_type: 'application/pdf';
    data: string;
  };
}

export type ContentBlock = ContentBlockText | ContentBlockImage | ContentBlockDocument;

export interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export interface LlmStreamOptions {
  provider: LlmProviderType;
  model?: string;
  messages: LlmMessage[];
  systemPrompt: string;
  temperature?: number;
}

export interface LlmProvider {
  streamChat(options: Omit<LlmStreamOptions, 'provider'>): ReadableStream<Uint8Array>;
}

// ─── Pipeline Steps ───
export type StepId = 0 | 1 | 2 | 3 | 4 | 5;

export interface StepDefinition {
  id: StepId;
  name: string;
  description: string;
  requiresOptions: boolean;
  optional?: boolean;
}

// ─── Chat Messages ───
export type MessageType = 'text' | 'options' | 'slide-plan' | 'mermaid' | 'ppt-ready' | 'doc-analysis' | 'content-spec';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  stepId: StepId;
  timestamp: number;
  options?: OptionCandidate[];
  selectedOptionId?: string;
  mermaidCode?: string;
}

// ─── Option Candidates ───
export interface OptionCandidate {
  id: string;
  label: string;
  summary: string;
  detail: string;
}

export interface UserSelection {
  stepId: StepId;
  action: 'select' | 'merge' | 'modify';
  selectedIds: string[];
  customInput?: string;
}

// ─── Presentation Planning ───
export interface PresentationContext {
  topic: string;
  audience: string;
  goal: string;
  domain: string;
  problem: string;
  constraints: string[];
  keywords: string[];
  isTechnical: boolean;
}

export interface PresentationDirection {
  id: string;
  approach: string;
  narrative: string;
  tone: string;
  recommendedSlideCounts: number[];
}

export interface OutlineSection {
  sectionTitle: string;
  slideCount: number;
  purpose: string;
  keyPoints: string[];
}

export interface OutlineCandidate {
  id: string;
  title: string;
  sections: OutlineSection[];
  totalSlides: number;
}

export type SlideLayout =
  | 'title-slide'
  | 'title-content'
  | 'two-column'
  | 'image-text'
  | 'chart'
  | 'diagram'
  | 'section-divider'
  | 'conclusion';

export type ContentType =
  | 'bullets'
  | 'paragraph'
  | 'image'
  | 'chart'
  | 'diagram'
  | 'mixed';

// ─── Slide Composition (Visual Layout Variant) ───
export type CompositionVariant =
  | 'stack-vertical'      // 위아래 쌓기 (예: 고객기술 아래, 우리기술 위)
  | 'side-by-side'        // 좌우 나란히
  | 'hub-spoke'           // 중앙 허브 + 주변 연결
  | 'flow-horizontal'     // 가로 흐름 (화살표)
  | 'flow-vertical'       // 세로 흐름
  | 'grid-cards'          // 카드 그리드
  | 'comparison-table'    // 비교 테이블
  | 'timeline'            // 타임라인
  | 'icon-list'           // 아이콘 + 텍스트 리스트
  | 'center-highlight'    // 중앙 강조
  | 'default';            // 기본 레이아웃

// ─── Expression Types (Step 4: 표현 방식 선택) ───

/** Visual primitive used to express slide information */
export type ExpressionFamily =
  | 'table'
  | 'cards'
  | 'flow-diagram'
  | 'timeline'
  | 'hub-spoke'
  | 'stacked-layers'
  | 'chart'
  | 'contrast-split'
  | 'icon-list'
  | 'center-stage'
  | 'matrix'
  | 'funnel'
  | 'pyramid'
  | 'scorecard';

/** Semantic shape of the information being presented */
export type InformationStructure =
  | 'comparison'
  | 'sequence'
  | 'hierarchy'
  | 'quantitative'
  | 'categorical'
  | 'relational'
  | 'narrative'
  | 'singular-focus';

/** What the slide is trying to achieve for the audience */
export type CommunicativeGoal =
  | 'convince'
  | 'explain'
  | 'compare'
  | 'summarize'
  | 'demonstrate'
  | 'quantify'
  | 'orient';

export interface WireframeZone {
  role: 'primary' | 'secondary' | 'accent' | 'label' | 'icon';
  placeholder: string;
  position: 'top' | 'center' | 'bottom' | 'left' | 'right' | 'grid-cell';
}

/** Family-specific preview hints — extensibility escape hatch */
export interface WireframeMeta {
  chartType?: 'bar' | 'pie' | 'line';
  rowCount?: number;
  columnCount?: number;
  stepCount?: number;
  spokeCount?: number;
  itemCount?: number;
}

export interface ExpressionWireframe {
  layout: SlideLayout;
  composition: CompositionVariant;
  title: string;
  zones: WireframeZone[];
  meta?: WireframeMeta;
}

export interface ExpressionCandidate {
  id: string;
  slideNumber: number;
  label: string;
  description: string;
  expressionFamily: ExpressionFamily;
  informationStructure: InformationStructure;
  communicativeGoal: CommunicativeGoal;
  wireframe: ExpressionWireframe;
  recommendationScore: number;
  rationale: string;
}

export interface ExpressionCandidatesPayload {
  slideNumber: number;
  informationStructure: InformationStructure;
  communicativeGoal: CommunicativeGoal;
  candidates: ExpressionCandidate[];
}

// ─── Architecture Blueprint Decision (Step 2) ───
export interface ArchitectureBlueprintDecision {
  includeBlueprint: boolean;
  mode: 'none' | 'summary-1' | 'compare-2' | 'detailed-3';
  focus?: 'system-architecture' | 'data-flow' | 'service-integration' | 'hybrid';
  reason: string;
  slideCountImpact: number;
}

// ─── Slide Count Recommendation (Step 3) ───
export interface SlideCountRecommendation {
  id: string;
  count: number;
  style: string;
  tradeoff: string;
  sectionBreakdown: { sectionName: string; slideCount: number }[];
  whyThisCount: string;
}

// ─── Auto Planning Result (Step 1: LLM auto-decides everything) ───
export interface AutoPlanningResult {
  context: PresentationContext;
  direction: PresentationDirection;
  blueprintDecision: ArchitectureBlueprintDecision;
  confirmedSlideCount: number;
  structure: OutlineCandidate;
  slidePlans: ReferenceMappedSlidePlan[];
}

export type SlideGenerationStrategy = 'reuse' | 'adapt' | 'generate';

export interface ReferenceMappedSlidePlan {
  slideNumber: number;
  sectionName: string;
  roleHint: SlideRole;
  strategy: SlideGenerationStrategy;
  referenceSlideNumber?: number;
  referenceReason?: string;
}

// ─── Deck Design Plan (Step 6) ───
export type DesignTone = 'consulting' | 'enterprise' | 'pitch-deck' | 'technical' | 'creative' | 'government';
export type VisualMotif = 'card-based' | 'band-based' | 'diagram-heavy' | 'comparison-focused' | 'data-driven' | 'minimal-text';
export type SlideRole = 'cover' | 'toc' | 'section-divider' | 'key-message' | 'detailed-explanation' | 'data-visualization' | 'comparison' | 'architecture-blueprint' | 'conclusion';
export type TextDensity = 'low' | 'medium' | 'high';

export interface SlideRoleAssignment {
  slideNumber: number;
  role: SlideRole;
  sectionName: string;
  preferredLayout: SlideLayout;
  preferredComposition: CompositionVariant;
  density: TextDensity;
  mustHaveElements: string[];
}

export interface DeckDesignPlan {
  tone: DesignTone;
  toneDescription: string;
  visualMotif: VisualMotif;
  motifDescription: string;
  colorStrategy: string;
  typographyStrategy: string;
  densityStrategy: { role: SlideRole; density: TextDensity; guideline: string }[];
  repetitionRules: { sectionName: string; layoutFamily: SlideLayout; compositionFamily: CompositionVariant; reason: string }[];
  variationRules: { role: SlideRole; variationScope: 'narrow' | 'wide'; description: string }[];
  emphasisRules: { trigger: string; treatment: string; preferredComposition: CompositionVariant }[];
  roleAssignments: SlideRoleAssignment[];
}

export interface SlideContent {
  slideNumber: number;
  title: string;
  layout: SlideLayout;
  contentType: ContentType;
  bulletPoints?: string[];
  bodyText?: string;
  imageDescription?: string;
  chartType?: 'bar' | 'pie' | 'line' | 'table';
  chartData?: Record<string, unknown>;
  mermaidCode?: string;
  speakerNotes: string;
  composition?: CompositionVariant;
  // ─── Rich design fields ───
  /** 부제목 또는 한 줄 설명 */
  subTitle?: string;
  /** 핵심 메시지 강조 박스 (콜아웃) */
  keyMessage?: string;
  /** 보조 불릿 포인트 (2단 구성, 우측/하단 보조 영역) */
  secondaryPoints?: string[];
  /** 출처/각주 텍스트 */
  footnote?: string;
  /** 각 불릿 앞에 표시할 아이콘 힌트 (이모지 배열, bulletPoints와 1:1 매칭) */
  iconHints?: string[];
  // ─── Provenance (optional, no generator impact) ───
  sourceExpressionId?: string;
  expressionFamily?: ExpressionFamily;
}

// ─── Content Specification (콘텐츠 명세서) ───
export interface SlideSpec {
  slideNumber: number;
  sectionName: string;
  purpose: string;
  keyMessage: string;
  requiredElements: string[];
  suggestedVisual?: string;
  transitionNote: string;
  customerNeed?: string;
  decisionDriver?: string;
  referenceSlideNumber?: number;
  referenceContentStrategy?: string;
  referenceNarrativeConnection?: string;
  referenceWritingPattern?: string;
  messageRationale?: string;
}

export interface ContentSpecification {
  title: string;
  subtitle?: string;
  totalSlides: number;
  narrativeArc: string;
  targetAudience: string;
  presentationGoal: string;
  strategySummary?: string;
  slideSpecs: SlideSpec[];
}

// ─── Slide Candidate (슬라이드 제작 3안) ───
export interface SlideCandidate {
  id: string;
  label: string;
  description: string;
  slide: SlideContent;
}

export interface PresentationPlan {
  title: string;
  subtitle?: string;
  context: PresentationContext;
  direction: PresentationDirection;
  outline: OutlineCandidate;
  slides: SlideContent[];
  selectedThemeId?: string;
}

// ─── Pipeline State ───
// ─── Final Deck Plan (서비스 중심 상태) ───
export interface FinalSlide {
  slideNumber: number;
  sectionName: string;
  strategy: SlideGenerationStrategy;
  referenceSlideNumber?: number;
  approved?: SlideContent;
  candidates?: SlideCandidate[];
  selectedExpression?: ExpressionCandidate;
  status: 'pending' | 'expression-selected' | 'draft' | 'approved';
  roleAssignment: SlideRoleAssignment;
}

export interface FinalDeckPlan {
  meta: { title: string; subtitle?: string; selectedThemeId?: string };
  confirmedSlideCount: number;
  selectedDirection: PresentationDirection;
  selectedStructure: OutlineCandidate;
  contentSpec: ContentSpecification;
  deckDesignPlan: DeckDesignPlan;
  slides: FinalSlide[];
}

export interface PipelineState {
  currentStep: StepId;
  documentAnalysis?: DocumentAnalysis;
  autoPlanning?: AutoPlanningResult;
  context?: PresentationContext;
  selectedDirection?: PresentationDirection;
  architectureBlueprintDecision?: ArchitectureBlueprintDecision;
  confirmedSlideCount?: number;
  selectedStructure?: OutlineCandidate;
  contentSpec?: ContentSpecification;
  deckDesignPlan?: DeckDesignPlan;
  currentSlideIndex: number;
  // Step 4: expression selection
  expressionCandidates?: ExpressionCandidate[];
  selectedExpressions: Record<number, ExpressionCandidate>;
  // Step 5: slide realization
  slideCandidates?: SlideCandidate[];
  completedSlides: SlideContent[];
  finalPlan?: FinalDeckPlan;
  selectedThemeId?: string;
}

// ─── Document Analysis ───
export interface DocumentAnalysis {
  rawText: string;
  requirements: string[];
  businessRequirements?: string[];
  technicalRequirements?: string[];
  nonFunctionalRequirements?: string[];
  constraints: string[];
  stakeholders: string[];
  integrationPoints: string[];
  summary: string;
  executiveSummary?: string;
  customerProblems?: string[];
  decisionDrivers?: string[];
  currentState?: string;
  targetState?: string;
  proposalFocusAreas?: string[];
  kpis?: string[];
  timeline?: string;
  budget?: string;
  risks?: string[];
  missingInformation?: string[];
}

// ─── App State ───
export interface AppState {
  provider: LlmProviderType;
  messages: ChatMessage[];
  pipeline: PipelineState;
  isStreaming: boolean;
}

// ─── Reference Proposal ───

/** PPTX에서 추출한 개별 shape 정보 */
export interface SlideShape {
  type: 'textbox' | 'image' | 'chart' | 'table' | 'diagram' | 'shape' | 'group' | 'other';
  name: string;
  /** 슬라이드 내 상대 위치 (0~100 비율) */
  position: { x: number; y: number; w: number; h: number };
  /** shape 내부 텍스트 (요약) */
  text?: string;
  /** 차트/다이어그램 세부 타입 */
  subType?: string;
  /** 그룹 내 자식 shape 수 */
  childCount?: number;
  /** shape 배경/채우기 색상 (hex) */
  fillColor?: string;
  /** 주요 폰트명 */
  fontFace?: string;
  /** 주요 폰트 크기 (pt) */
  fontSize?: number;
}

/** PPTX 테마에서 추출한 색상/폰트 스킴 정보 */
export interface ReferenceThemeInfo {
  primaryColor: string;
  secondaryColor: string;
  accentColors: string[];
  fontHeading: string;
  fontBody: string;
  backgroundStyle: string;
}

/** PPTX에서 추출한 슬라이드별 레이아웃 청사진 */
export interface SlideLayoutBlueprint {
  slideNumber: number;
  shapes: SlideShape[];
  /** 전체 구성 요약 (예: "좌측 텍스트 + 우측 다이어그램") */
  compositionSummary: string;
}

export interface ReferenceSlidePattern {
  slideNumber: number;
  sectionName: string;
  layoutType: string;
  contentDensity: 'low' | 'medium' | 'high';
  hasChart: boolean;
  hasDiagram: boolean;
  sampleText: string;
}

/** 슬라이드별 디테일 분석 (LLM이 레이아웃+텍스트를 종합 판단) */
export interface SlideDetailedAnalysis {
  slideNumber: number;
  /** 이 슬라이드의 역할/목적 (예: "고객 Pain Point를 시각적으로 부각하여 공감 유도") */
  purpose: string;
  /** 핵심 메시지 (한 문장) */
  keyMessage: string;
  /** 콘텐츠 전략: 어떤 정보를 어떤 순서로 배치했는지 */
  contentStrategy: string;
  /** 디자인 의도: 왜 이런 레이아웃/배치를 선택했는지 */
  designIntent: string;
  /** 시각 요소 상세 (차트/다이어그램/이미지 등 각각의 역할과 배치 이유) */
  visualElements: {
    element: string;
    role: string;
    placementReason: string;
  }[];
  /** 텍스트 작성 패턴 (이 슬라이드에서 쓴 문체, 불릿 구조, 강조 기법) */
  writingPattern: string;
  /** 이전 슬라이드와의 연결 (스토리 흐름에서의 위치) */
  narrativeConnection: string;
  /** 효과적인 점 / 참고할 만한 기법 */
  notableTechniques: string[];
}

export interface ReferenceAnalysis {
  sectionFlow: string[];
  slidePatterns: ReferenceSlidePattern[];
  writingStyle: {
    tone: string;
    sentencePatterns: string[];
    commonPhrases: string[];
    bulletStyle: string;
  };
  structuralNotes: string;
  totalSlideCount: number;
  /** PPTX/PDF에서 추출한 슬라이드별 레이아웃 청사진 (shape 배치 정보) */
  layoutBlueprints?: SlideLayoutBlueprint[];
  /** PPTX 테마 정보 (색상 스킴, 폰트 등) */
  themeInfo?: ReferenceThemeInfo;
  /** LLM이 텍스트+레이아웃을 종합 분석한 슬라이드별 디테일 분석 */
  slideDetailedAnalyses?: SlideDetailedAnalysis[];
}

export interface ReferenceProposal {
  id: string;
  name: string;
  sourceType: 'pptx' | 'pdf' | 'docx' | 'text';
  createdAt: number;
  analysis: ReferenceAnalysis;
  rawSlideTexts?: string[];
}

// ─── Structured Data from LLM ───
export type StructuredDataType =
  | 'auto_planning'
  | 'content_spec'
  | 'deck_design_plan'
  | 'expression_candidates'
  | 'slide_candidates'
  | 'doc_analysis';

export interface StructuredData {
  type: StructuredDataType;
  data: unknown;
}

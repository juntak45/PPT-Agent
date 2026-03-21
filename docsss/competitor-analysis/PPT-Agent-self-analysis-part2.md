# PPT Agent 자체 프로젝트 심층 분석 보고서 (Part 2/3)

> **분석 대상**: PPT Agent (Next.js/TypeScript) — "Wrtn Architecture Mapper"
> **분석 일자**: 2026-03-17

---

## 5. Chat 파이프라인 (6-Step 레거시)

### 5.1 개요

Chat 파이프라인은 PPT Agent의 **초기 메인 시스템**으로, 사용자와 대화하며 6단계를 거쳐
다슬라이드 프레젠테이션을 점진적으로 완성한다. 현재는 `/chat` 경로로 접근 가능하며,
`/legacy`는 `/chat`으로 리다이렉트된다.

### 5.2 6-Step 파이프라인 (기존 5-Step에서 확장)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        6-Step Pipeline Architecture                            │
│                                                                                │
│  Step 0 (선택)    Step 1        Step 2        Step 3        Step 4    Step 5  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐┌──────┐│
│  │ 문서 분석 │→│ 자동 기획 │→│ 콘텐츠   │→│ 디자인   │→│ 표현   ││슬라  ││
│  │           │  │           │  │ 문서화   │  │ 플랜     │  │ 방식   ││이드  ││
│  │ RFI/RFP  │  │ 방향+구조 │  │ 슬라이드 │  │ 역할할당 │  │ 14종   ││완성  ││
│  │ 업로드    │  │ 통합 기획 │  │ 별 명세서│  │ 톤/모티프│  │ 패밀리 ││      ││
│  │           │  │           │  │           │  │ 밀도전략 │  │ 추천   ││3안   ││
│  │ optional │  │ 자동진행  │  │ 자동진행  │  │ 자동진행 │  │ 선택   ││선택  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘└──────┘│
│                                                                                │
│  DocumentAnalysis  AutoPlanningResult  ContentSpec  DeckDesignPlan  Expression  │
│                    (방향+구조+청사진)                 (역할+레이아웃)  SlideContent│
└───────────────────────────────────────────────────────────────────────────────┘
```

#### Step 정의 (constants.ts, 23줄)

```typescript
export const STEPS: StepDefinition[] = [
  { id: 0, name: '문서 분석',     description: 'RFI/RFP 문서를 업로드하고 분석합니다', requiresOptions: false, optional: true },
  { id: 1, name: '자동 기획',     description: '발표 방향과 구조를 한 번에 기획합니다', requiresOptions: false },
  { id: 2, name: '콘텐츠 문서화', description: '슬라이드별 콘텐츠 명세서를 작성합니다', requiresOptions: false },
  { id: 3, name: '디자인 플랜',   description: '역할 할당과 디자인 전략을 수립합니다',  requiresOptions: false },
  { id: 4, name: '표현 방식',     description: '슬라이드별 시각적 표현을 선택합니다',   requiresOptions: true },
  { id: 5, name: '슬라이드 완성', description: '최종 슬라이드를 제작합니다',           requiresOptions: true },
];
```

**기존 5-Step과의 차이점:**

| 기존 (5-Step) | 현재 (6-Step) | 변경 사항 |
|---------------|---------------|-----------|
| Step 1: 방향 설정 (3안 선택) | Step 1: 자동 기획 (방향+구조+청사진 통합) | 방향/구조를 한 번에 기획, 사용자 선택 불필요 |
| Step 2: 슬라이드 기획 (2~3안 선택) | (Step 1에 통합) | 별도 단계 제거 |
| Step 3: 콘텐츠 명세서 | Step 2: 콘텐츠 문서화 | 번호만 변경 |
| Step 4: 슬라이드 제작 (3안 선택) | Step 3: 디자인 플랜 (신규) | **신규 단계**: 역할 할당, 톤, 모티프, 밀도 전략 |
| (없음) | Step 4: 표현 방식 (신규) | **신규 단계**: 14종 ExpressionFamily 추천/선택 |
| (없음) | Step 5: 슬라이드 완성 | 최종 제작 단계 분리 |

### 5.3 PipelineState: 중앙 상태 모델

```typescript
export interface PipelineState {
  currentStep: StepId;                              // 현재 Step (0~5)
  context?: PresentationContext;                    // 발표 맥락
  directionCandidates?: PresentationDirection[];    // Step 1: 방향 후보
  selectedDirection?: PresentationDirection;         // Step 1: 선택된 방향
  structureCandidates?: OutlineCandidate[];         // Step 1: 구조 후보
  selectedStructure?: OutlineCandidate;              // Step 1: 선택된 구조
  contentSpec?: ContentSpecification;                // Step 2: 콘텐츠 명세서
  currentSlideIndex: number;                        // Step 4/5: 현재 슬라이드
  slideCandidates?: SlideCandidate[];               // Step 5: 슬라이드 후보
  completedSlides: SlideContent[];                  // Step 5: 완성 슬라이드
  finalPlan?: PresentationPlan;                     // 최종 결과
  documentAnalysis?: DocumentAnalysis;              // Step 0: 문서 분석
  selectedThemeId?: string;                         // 테마 ID
  selectedExpressions: Record<number, ExpressionCandidate>;  // Step 4: 선택된 표현
}
```

### 5.4 상태 머신 (usePipeline.ts, 512줄)

파이프라인의 전체 상태를 관리하는 **핵심 hook**이다:

```typescript
// 주요 액션
setDocumentAnalysis(analysis)       // Step 0 완료
processStructuredData(data)         // LLM 응답 구조화 데이터 라우팅
  ├── auto_planning → 방향+구조+청사진 저장
  ├── content_spec → 콘텐츠 명세 저장
  ├── deck_design_plan → 디자인 플랜 저장
  ├── expression_candidates → 표현 후보 표시
  └── slide_candidates → 슬라이드 후보 표시
selectOption(optionId)              // Step 4/5 후보 선택
selectExpression(slideIdx, expr)    // Step 4 표현방식 선택
confirmSlide(slide)                 // Step 5 슬라이드 확정
advanceStep()                       // 다음 Step 진행
goToStep(stepId)                    // 특정 Step 이동
resetFromStep(stepId)               // 특정 Step부터 재시작 (하위 데이터 초기화)
setSlideComposition(idx, comp)      // 완성 슬라이드 composition 변경
setTheme(themeId)                   // 테마 변경
buildFinalPlan()                    // 최종 FinalDeckPlan 조립
```

**특수 기능:**
- `buildArchitectureMermaid()`: 아키텍처 슬라이드용 Mermaid 코드 자동 생성
- `createBaselineSlide()`: 명세서 + 역할 할당에서 기본 슬라이드 생성
- `resetFromStep()` 호출 시 해당 Step 이후의 모든 데이터를 자동 초기화

### 5.5 스텝 진행 검증 (pipeline/steps.ts, 26줄)

```typescript
function canAdvance(state: PipelineState): boolean {
  switch (state.currentStep) {
    case 0: return !!state.documentAnalysis;
    case 1: return !!state.context && !!state.selectedDirection
            && !!state.selectedStructure;
    case 2: return !!state.contentSpec;
    case 3: return !!state.deckDesignPlan;
    case 4: return allExpressionsSelected(state);  // 모든 슬라이드 표현 선택됨
    case 5: return allSlidesRealized(state);       // 모든 슬라이드 완성됨
  }
}
```

### 5.6 데이터 검증 (pipeline/validator.ts, 158줄)

각 Step의 구조화 데이터에 대한 **하드 룰 검증**:

```typescript
validateStructuredData(type, data):
  // Step 2 (구조): 섹션별 슬라이드 수 합 == totalSlides
  // Step 4 (표현): ExpressionFamily 중복 불가, Composition 중복 불가, zones ≥ 2
  // Step 5 (슬라이드): 완성도 체크

validateSlideAgainstRole(slide, role):
  // cover: ≤3 bulletPoints (경고)
  // toc: bullets 필수 (경고)
  // data-visualization: chartData 또는 mermaidCode 필수 (경고)
  // architecture-blueprint: diagram 레이아웃 또는 mermaidCode 필수 (경고)
```

### 5.7 슬라이드 진행 추적 (pipeline/slideProgress.ts, 52줄)

```typescript
findNextSlideNeedingExpression(state): number | null   // Step 4에서 다음 미선택 슬라이드
findNextSlideNeedingRealization(state): number | null   // Step 5에서 다음 미완성 슬라이드
countSlidesNeedingExpression(state): number             // 남은 표현 선택 수
allExpressionsSelected(state): boolean                  // Step 4 완료 여부
allSlidesRealized(state): boolean                       // Step 5 완료 여부
```

### 5.8 데이터 흐름 상세

```
사용자 입력 (채팅/파일 업로드)
    │
    ▼
ChatContainer.handleSend()
    ├── detectResetStep(content): 사용자 의도로 특정 Step 재시작 감지
    │   (한국어 키워드: "방향", "구조", "디자인", "표현" 등)
    │
    ▼
useChat.sendMessage(content, stepId, pipelineState)
    │
    ▼
POST /api/chat
    ├── references 로드 (store.ts)
    ├── 시스템 프롬프트 생성:
    │   getSystemPrompt(stepId, pipelineState, refAnalyses)
    │   = BASE_INSTRUCTION
    │     + Step별 지시문
    │     + buildContextBlock(state)
    │     + buildReferenceBlock(refs)
    │     + buildStepSpecificHint()
    │     + (Step 5: matchReferenceSlides())
    └── LLM 스트리밍 호출 (factory.ts → claude.ts | openai.ts)
    │
    ▼
ReadableStream (토큰 단위)
    │
    ▼
useChat: 텍스트 누적 + extractStructuredData()
    │
    ├── 일반 텍스트 → MessageList에 표시 (MarkdownRenderer)
    │
    └── 구조화 데이터 (<!--STRUCTURED_DATA{...}-->)
         │
         ▼
    usePipeline.processStructuredData()
         │
         ├── auto_planning       → context, direction, structure 저장
         ├── content_spec        → contentSpec 저장
         ├── deck_design_plan    → deckDesignPlan 저장
         ├── expression_candidates → 와이어프레임 후보 표시
         └── slide_candidates    → 슬라이드 3안 표시
         │
         ▼
    사용자 선택 → selectExpression() / confirmSlide()
         │
         ▼
    advanceStep() or 다음 슬라이드
         │
         ▼ (모든 슬라이드 완성 후)
    buildFinalPlan() → /api/generate-ppt → .pptx 다운로드
```

### 5.9 폴백 메커니즘 (ChatContainer.tsx)

LLM이 구조화 데이터를 포함하지 않은 경우의 **자동 폴백**:

```typescript
// Step 4 폴백: 표현방식 후보 자동 생성
buildFallbackExpressionCandidates(slideSpec):
  → getExpressionRecommendations(role, keywords)에서 추천 가져오기
  → top 3를 ExpressionCandidate로 변환

// Step 5 폴백: 슬라이드 3안 자동 생성
buildFallbackSlideCandidates(slideSpec, selectedExpression):
  → 선택된 표현방식 기반으로 composition 변형 3가지 생성
  → LLM 텍스트를 각 후보에 배분
```

---

## 6. 프롬프트 전략

### 6.1 프롬프트 아키텍처 개관 (prompts.ts, 423줄)

PPT Agent의 프롬프트는 **동적 조합 방식**으로 구성된다:

```
최종 프롬프트 = BASE_INSTRUCTION (공통 지시문)
             + Step별 지시문 (Step 0~5)
             + buildContextBlock(state)   ← 누적된 진행 상황
             + buildReferenceBlock(refs)  ← 레퍼런스 패턴
             + buildStepSpecificHint()    ← Step별 레퍼런스 힌트
             + (Step 5) matchReferenceSlides() ← 매칭된 슬라이드 정보
```

### 6.2 공통 지시문 (BASE_INSTRUCTION)

```
당신은 프레젠테이션 기획 전문가입니다. 항상 한국어로 응답하세요.
응답은 구조화되고 간결하게 작성하세요. 제목과 불릿 포인트를 활용하세요.

중요: 응답의 마지막에 반드시 아래 형식으로 구조화된 데이터를 포함하세요:
<!--STRUCTURED_DATA
{JSON 데이터}
-->
```

### 6.3 Step 0: 문서 분석 프롬프트

```
목적: RFI/RFP에서 핵심 정보 추출
모델 온도: 0.3

추출 항목:
1. 핵심 요구사항 (Requirements)
2. 시스템 제약조건 (Constraints)
3. 이해관계자 (Stakeholders)
4. 연동 포인트 (Integration Points)
5. 전체 요약
6. KPI, 일정, 예산, 리스크

구조화 출력: {"type":"doc_analysis","data":{...}}
```

### 6.4 Step 1: 자동 기획 프롬프트 (★ 기존 Step 1+2 통합)

```
목적: 발표 맥락 분석 + 방향 + 구조 + 슬라이드 수 + 레퍼런스 매핑을 한 번에 결정
입력: 사용자 자유 텍스트 + (선택) 문서 분석 + 레퍼런스 패턴

출력 구조:
{
  "type": "auto_planning",
  "data": {
    "context": {                    // 발표 맥락
      topic, audience, goal, domain, problem, constraints, keywords, isTechnical
    },
    "direction": {                  // 선택된 방향
      approach, narrative, tone, recommendedSlideCounts
    },
    "structure": {                  // 슬라이드 구조
      title, sections: [{ sectionTitle, slideCount, purpose, keyPoints }],
      totalSlides
    },
    "blueprintSummary": string      // 전체 기획 요약
  }
}
```

**기존과의 차이**: 방향 3안 선택 → 자동 결정, 구조 2~3안 선택 → 자동 결정. 사용자 개입 최소화.

### 6.5 Step 2: 콘텐츠 문서화 프롬프트

```
목적: 슬라이드별 콘텐츠 명세서 자동 생성
입력: 자동 기획 결과 + 레퍼런스 패턴

각 슬라이드 명세:
- slideNumber, sectionName, purpose
- keyMessage: 청중이 기억해야 할 한 줄
- requiredElements: 필수 포함 데이터/내용
- suggestedVisual: 시각화 제안
- transitionNote: 다음 슬라이드로의 전환

레퍼런스 연동: 작성 톤, 불릿 스타일, 콘텐츠 전략 참고

구조화 출력: {"type":"content_spec","data":{...}}
```

### 6.6 Step 3: 디자인 플랜 프롬프트 (★ 신규 단계)

```
목적: 역할 할당, 디자인 전략, 레이아웃 규칙 수립
입력: 콘텐츠 명세서 + 레퍼런스 패턴

출력 구조:
{
  "type": "deck_design_plan",
  "data": {
    "tone": string,                 // 전체 톤 (예: "전문적이고 신뢰감 있는")
    "visualMotif": string,          // 시각적 모티프 (예: "기하학적 레이어 구조")
    "colorStrategy": string,        // 색상 전략
    "typographyStrategy": string,   // 타이포 전략
    "densityRules": string,         // 밀도 규칙
    "repetitionRules": string,      // 반복 규칙 (일관성)
    "variationRules": string,       // 변화 규칙 (단조로움 방지)
    "emphasisRules": string,        // 강조 규칙
    "roleAssignments": [{           // 슬라이드별 역할 할당
      slideNumber, role, layout, composition, rationale
    }]
  }
}
```

**9종 SlideRole:**

| 역할 | 설명 | 추천 레이아웃 |
|------|------|-------------|
| cover | 표지 | title-slide |
| toc | 목차 | title-content |
| section-divider | 섹션 구분 | section-divider |
| key-message | 핵심 메시지 | title-content |
| detailed-explanation | 상세 설명 | two-column |
| data-visualization | 데이터 시각화 | chart/diagram |
| comparison | 비교 | two-column |
| architecture-blueprint | 아키텍처 | diagram |
| conclusion | 결론 | conclusion |

### 6.7 Step 4: 표현 방식 프롬프트 (★ 신규 단계)

```
목적: 슬라이드별 시각적 표현 패밀리 3안 추천
입력: 해당 슬라이드의 역할 + 콘텐츠 명세 + 디자인 플랜

각 후보:
- family: 14종 ExpressionFamily 중 하나
- composition: 매핑된 CompositionVariant
- wireframe: { zones[], metadata }
- score: 적합도 (0~1)
- rationale: 추천 근거

구조화 출력: {"type":"expression_candidates","data":{...}}
```

### 6.8 Step 5: 슬라이드 완성 프롬프트

```
목적: 최종 슬라이드 콘텐츠 3안 생성
입력: 선택된 표현방식 + 역할 + 명세 + 이전 슬라이드 문체 샘플

각 후보:
- title, layout, composition
- bulletPoints, bodyText, keyMessage
- secondaryPoints, iconHints, footnote
- chartData / mermaidCode
- speakerNotes

글쓰기 일관성: 이전 슬라이드의 불릿 포인트 샘플을 프롬프트에 포함

구조화 출력: {"type":"slide_candidates","data":{...}}
```

### 6.9 프롬프트 전략의 핵심 인사이트

**1. 점진적 맥락 축적 (Progressive Context Building)**

`buildContextBlock(state)`이 이전 단계의 모든 결정사항을 누적하여 LLM에 전달.
Step 5에서 LLM은 Step 1의 방향, Step 2의 명세, Step 3의 디자인 플랜, Step 4의 표현방식을 모두 알고 있다.

**2. 자연어 + 구조화 데이터 동시 생성**

`<!--STRUCTURED_DATA{...}-->` HTML 주석 기반 프레이밍으로 LLM이 설명 텍스트와 JSON을 한 번에 생성.

**3. 레퍼런스 패턴 주입**

레퍼런스의 실제 패턴(섹션 흐름, 작성 스타일, 디자인 의도)을 주입하여 "검증된 패턴 위에서 새로운 콘텐츠를 생성".

**4. 역할 기반 설계 (★ 신규)**

Step 3에서 할당된 역할이 Step 4의 표현 추천과 Step 5의 콘텐츠 생성을 가이드.
`cover` → `center-stage` 표현, `data-visualization` → `chart` 표현, `comparison` → `contrast-split` 표현.

---

## 7. 슬라이드 생성 로직 & Composition 시스템

### 7.1 타입 시스템: SlideContent

```typescript
export interface SlideContent {
  slideNumber: number;
  title: string;
  layout: SlideLayout;                 // 8종 레이아웃
  contentType: ContentType;            // bullets | paragraph | image | chart | diagram | mixed
  bulletPoints?: string[];
  bodyText?: string;
  imageDescription?: string;
  chartType?: 'bar' | 'pie' | 'line' | 'table';
  chartData?: Record<string, unknown>;
  mermaidCode?: string;
  speakerNotes: string;
  composition?: CompositionVariant;    // 11종 시각적 구도

  // ★ 신규 리치 필드
  keyMessage?: string;                 // 핵심 메시지 (콜아웃 박스로 렌더링)
  secondaryPoints?: string[];          // 보조 포인트 (하단 표시)
  iconHints?: string[];                // 아이콘 힌트 (icon-list용)
  footnote?: string;                   // 각주
  subtitle?: string;                   // 서브타이틀
}
```

### 7.2 8종 슬라이드 레이아웃 (templates.ts, 56줄)

```
┌──────────────────────────────────────────────────────────────────┐
│                   8 Slide Layouts (16:9 = 13.33" × 7.5")          │
│                                                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐         │
│  │ title-slide   │  │ title-content │  │ two-column    │         │
│  │               │  │ ┌───────────┐│  │ ┌─────┐┌─────┐│         │
│  │   TITLE       │  │ │ TITLE     ││  │ │LEFT ││RIGHT││         │
│  │   subtitle    │  │ ├───────────┤│  │ │     ││     ││         │
│  │               │  │ │  BODY     ││  │ │     ││     ││         │
│  │               │  │ │  (12×5.5) ││  │ └─────┘└─────┘│         │
│  └───────────────┘  └───────────────┘  └───────────────┘         │
│                                                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐         │
│  │ image-text    │  │ chart         │  │ diagram       │         │
│  │ ┌─────┐┌─────┐│  │ ┌───────────┐│  │ ┌───────────┐│         │
│  │ │IMG  ││TEXT  ││  │ │ CHART     ││  │ │ DIAGRAM   ││         │
│  │ │     ││     ││  │ │ (12×5.5)  ││  │ │ (12×5.5)  ││         │
│  │ └─────┘└─────┘│  │ └───────────┘│  │ └───────────┘│         │
│  └───────────────┘  └───────────────┘  └───────────────┘         │
│                                                                    │
│  ┌───────────────┐  ┌───────────────┐                              │
│  │section-divider│  │ conclusion    │                              │
│  │               │  │ ┌───────────┐│                              │
│  │   SECTION     │  │ │  BODY     ││                              │
│  │   TITLE       │  │ │  (12×5.5) ││                              │
│  │               │  │ └───────────┘│                              │
│  └───────────────┘  └───────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

인치 단위 좌표:
```typescript
const LAYOUTS = {
  'title-slide':     { title: {x:0.5, y:1.5, w:12.0, h:1.5}, body: {x:0.5, y:3.2, w:12.0, h:3.0} },
  'title-content':   { title: {x:0.5, y:0.3, w:12.0, h:0.8}, body: {x:0.5, y:1.5, w:12.0, h:5.5} },
  'two-column':      { title: ..., body: {x:0.5, y:1.5, w:5.5, h:5.5},
                       secondary: {x:6.5, y:1.5, w:5.5, h:5.5} },
  'image-text':      { title: ..., body: {w:5.5}, secondary: {x:6.5, w:5.5} },
  'chart':           { title: ..., body: {w:12.0, h:5.5} },
  'diagram':         { title: ..., body: {w:12.0, h:5.5} },
  'section-divider': { title: {x:0.5, y:2.5, w:12.0, h:1.5}, body: {y:4.2, h:2.0} },
  'conclusion':      { title: ..., body: {w:12.0, h:5.5} },
};
```

### 7.3 11종 Composition Variant 시스템

```typescript
export type CompositionVariant =
  | 'stack-vertical'      // 위아래 레이어 쌓기
  | 'side-by-side'        // 좌우 나란히
  | 'hub-spoke'           // 중앙 허브 + 방사형 연결
  | 'flow-horizontal'     // 가로 흐름 (화살표)
  | 'flow-vertical'       // 세로 흐름
  | 'grid-cards'          // 카드 그리드 (2×2, 3×2 등)
  | 'comparison-table'    // 비교 테이블
  | 'timeline'            // 타임라인 (원형 단계)
  | 'icon-list'           // 아이콘 + 텍스트 리스트
  | 'center-highlight'    // 중앙 강조 + 주변 포인트
  | 'default';            // 기본 불릿 포인트
```

**시각적 표현:**

```
grid-cards:           flow-horizontal:       hub-spoke:
┌────┐┌────┐         ┌──┐  ┌──┐  ┌──┐     ┌──┐
│ 01 ││ 02 │         │S1│→│S2│→│S3│         │  │
└────┘└────┘         └──┘  └──┘  └──┘   ┌──┤HUB├──┐
┌────┐┌────┐                            │  └──┘   │
│ 03 ││ 04 │                           ┌┴┐  ┌┴┐ ┌┴┐
└────┘└────┘                           │A│  │B│ │C│
                                       └─┘  └─┘ └─┘

timeline:             side-by-side:         icon-list:
─●──────●──────●─     ┌────┐│┌────┐        ● 항목 1
 S1     S2     S3     │LEFT│││RGHT│        ● 항목 2
 ┌──┐  ┌──┐  ┌──┐    │    │││    │        ● 항목 3
 │  │  │  │  │  │     └────┘│└────┘        ● 항목 4
 └──┘  └──┘  └──┘

center-highlight:     stack-vertical:       comparison-table:
                      ┌────────────┐        ┌──────┬──────┐
    ┌───┐            │  Layer 1   │        │ A    │ B    │
    │ ★ │            ├────────────┤        ├──────┼──────┤
    └───┘            │  Layer 2   │        │ val1 │ val2 │
   설명 텍스트        ├────────────┤        │ val3 │ val4 │
                      │  Layer 3   │        └──────┴──────┘
                      └────────────┘

flow-vertical:        default:
┌──────────┐          • 불릿 포인트 1
│  Step 1  │          • 불릿 포인트 2
└────┬─────┘          • 불릿 포인트 3
     ↓                • 불릿 포인트 4
┌──────────┐
│  Step 2  │
└────┬─────┘
     ↓
┌──────────┐
│  Step 3  │
└──────────┘
```

### 7.4 자동 Composition 추론

LLM이 composition을 지정하지 않은 경우 콘텐츠 특성에서 자동 추론:

```typescript
function guessComposition(slide: SlideContent): CompositionVariant {
  if (slide.mermaidCode || slide.layout === 'diagram') return 'stack-vertical';
  if (slide.layout === 'two-column') return 'side-by-side';
  if (slide.layout === 'chart') return 'center-highlight';
  if (slide.bulletPoints && slide.bulletPoints.length <= 3) return 'grid-cards';
  if (slide.bulletPoints && slide.bulletPoints.length >= 6) return 'icon-list';
  return 'default';
}
```

### 7.5 Composition 옵션 빌더 (compositionOptions.ts, 88줄)

슬라이드 콘텐츠에 따라 **적절한 대안 composition 목록**을 제시:

```typescript
getCompositionOptions(slide): CompositionOption[] {
  // title-slide / section-divider → [] (옵션 없음)
  // diagram / mermaidCode → [stack-vertical, side-by-side, hub-spoke]
  // chart → [center-highlight, side-by-side, grid-cards]
  // two-column → [side-by-side, comparison-table, stack-vertical]
  // conclusion → [center-highlight, grid-cards, flow-horizontal]
  // 0-3 bullets → [grid-cards, flow-horizontal, icon-list]
  // 4-5 bullets → [icon-list, grid-cards, timeline]
  // 6+ bullets → [icon-list, side-by-side, flow-vertical]
  // default → [default, grid-cards, side-by-side]
}
```

---

## 8. ExpressionFamily & 시각적 표현 시스템

### 8.1 개요 (★ 완전 신규 시스템)

ExpressionFamily 시스템은 **Step 4 (표현 방식)**에서 사용되는 신규 시스템으로,
슬라이드의 역할과 키워드에 기반하여 **14종 시각적 표현 패밀리**를 추천한다.

이 시스템은 3개의 축으로 슬라이드의 시각적 표현을 정의한다:

```
┌─────────────────────────────────────────────────────────────┐
│              시각적 표현 시스템 3축                             │
│                                                              │
│  ExpressionFamily (14종)     무엇으로 보여줄까?              │
│  ├── table, cards, flow-diagram, timeline, hub-spoke         │
│  ├── stacked-layers, chart, contrast-split, icon-list        │
│  └── center-stage, matrix, funnel, pyramid, scorecard        │
│                                                              │
│  InformationStructure (8종)  정보의 형태는?                   │
│  ├── comparison, sequence, hierarchy, quantitative           │
│  └── categorical, relational, narrative, singular-focus      │
│                                                              │
│  CommunicativeGoal (7종)     무엇을 전달할까?                │
│  ├── convince, explain, compare, summarize                   │
│  └── demonstrate, quantify, orient                           │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 14종 ExpressionFamily

```typescript
export type ExpressionFamily =
  | 'table'            // 테이블 (비교, 데이터)
  | 'cards'            // 카드 그리드 (항목 나열)
  | 'flow-diagram'     // 흐름도 (프로세스)
  | 'timeline'         // 타임라인 (순서, 일정)
  | 'hub-spoke'        // 허브-스포크 (관계, 아키텍처)
  | 'stacked-layers'   // 레이어 스택 (계층, 아키텍처)
  | 'chart'            // 차트 (데이터 시각화)
  | 'contrast-split'   // 대비 분할 (비교)
  | 'icon-list'        // 아이콘 리스트 (항목)
  | 'center-stage'     // 중앙 무대 (핵심 메시지)
  | 'matrix'           // 매트릭스 (2×2 사분면)
  | 'funnel'           // 퍼널 (전환/단계)
  | 'pyramid'          // 피라미드 (계층)
  | 'scorecard';       // 스코어카드 (KPI)
```

### 8.3 ExpressionFamily → CompositionVariant 매핑

```typescript
const FAMILY_COMPOSITION_MAP = {
  'chart':           'center-highlight',
  'cards':           'grid-cards',
  'flow-diagram':    'flow-horizontal',
  'timeline':        'timeline',
  'hub-spoke':       'hub-spoke',
  'stacked-layers':  'stack-vertical',
  'contrast-split':  'side-by-side',
  'icon-list':       'icon-list',
  'center-stage':    'center-highlight',
  'table':           'comparison-table',
  'matrix':          'grid-cards',
  'funnel':          'flow-vertical',
  'pyramid':         'stack-vertical',
  'scorecard':       'grid-cards',
};
```

### 8.4 역할 기반 추천 규칙 (recommender.ts, 177줄)

9종 슬라이드 역할별 **기본 가중치**:

| 역할 | 1순위 (가중치) | 2순위 | 3순위 | 정보구조 | 목표 |
|------|--------------|-------|-------|---------|------|
| cover | center-stage (0.9) | - | - | singular-focus | orient |
| toc | icon-list (0.8) | cards (0.7) | flow-diagram (0.5) | categorical | orient |
| section-divider | center-stage (0.9) | - | - | singular-focus | orient |
| key-message | center-stage (0.8) | cards (0.6) | contrast-split (0.5) | singular-focus | convince |
| detailed-explanation | cards (0.7) | icon-list (0.7) | stacked-layers (0.5) | categorical | explain |
| data-visualization | chart (0.9) | scorecard (0.7) | table (0.5) | quantitative | quantify |
| comparison | table (0.8) | contrast-split (0.8) | cards (0.6) | comparison | compare |
| architecture-blueprint | hub-spoke (0.8) | flow-diagram (0.8) | stacked-layers (0.7) | relational | demonstrate |
| conclusion | center-stage (0.7) | cards (0.6) | icon-list (0.5) | singular-focus | summarize |

### 8.5 키워드 부스터 (8종)

콘텐츠 키워드에 따라 가중치를 추가 부스트:

| 키워드 패턴 | 부스트 패밀리 | 부스트 값 |
|------------|-------------|----------|
| 비교, vs, versus | contrast-split | +0.2 |
| 타임라인, 일정, 로드맵 | timeline | +0.3 |
| 아키텍처, 구조, 시스템 | hub-spoke | +0.2 |
| KPI, 지표, 성과 | scorecard | +0.25 |
| 프로세스, 흐름, 절차 | flow-diagram | +0.25 |
| 계층, 레이어, 스택 | stacked-layers | +0.2 |
| 매트릭스, 사분면, 2×2 | matrix | +0.3 |
| 퍼널, 전환, 단계별 | funnel | +0.3 |

### 8.6 ExpressionWireframe

각 ExpressionCandidate는 **와이어프레임**을 포함한다:

```typescript
export interface ExpressionWireframe {
  layout: SlideLayout;
  zones: {
    id: string;
    label: string;
    x: number; y: number;
    w: number; h: number;
    role: 'title' | 'content' | 'visual' | 'data' | 'accent' | 'navigation';
  }[];
  metadata?: {
    chartType?: string;
    rowCount?: number;
    columnCount?: number;
    iconCount?: number;
    flowDirection?: 'horizontal' | 'vertical';
    hubPosition?: 'center' | 'left' | 'right';
    layerCount?: number;
  };
}
```

### 8.7 와이어프레임 렌더러 (ExpressionWireframeRenderer.tsx, 249줄)

14종 패밀리별 미니 와이어프레임을 200×112px로 렌더링:

```
table:           cards:           flow-diagram:
┌──┬──┬──┐      ┌──┐ ┌──┐       ┌──┐→┌──┐→┌──┐
├──┼──┼──┤      │  │ │  │       └──┘ └──┘ └──┘
├──┼──┼──┤      └──┘ └──┘
└──┴──┴──┘      ┌──┐ ┌──┐
                │  │ │  │
                └──┘ └──┘

timeline:        hub-spoke:       stacked-layers:
─●──●──●──●─     ┌──┐            ┌────────────┐
             ┌──┤  ├──┐          ├────────────┤
             │  └──┘  │          ├────────────┤
            ┌┴┐     ┌┴┐         └────────────┘
            └─┘     └─┘

chart:           contrast-split:  icon-list:
┌──────────┐    ┌─────┐┌─────┐   ⬤ 텍스트 1
│ ▓▓▓▓▓▓▓ │    │  A  ││  B  │   ⬤ 텍스트 2
│ ▓▓▓▓    │    │     ││     │   ⬤ 텍스트 3
│ ▓▓      │    └─────┘└─────┘
└──────────┘

center-stage:    matrix:          funnel:
                 ┌─────┬─────┐   ┌──────────────┐
    ┌───┐       │  Q1 │  Q2 │    └─┌──────────┐─┘
    │ ★ │       ├─────┼─────┤       └─┌──────┐─┘
    └───┘       │  Q3 │  Q4 │          └──────┘
                 └─────┴─────┘

pyramid:         scorecard:
    /\           ┌───┐ ┌───┐ ┌───┐
   /  \          │87%│ │$2M│ │95 │
  /    \         └───┘ └───┘ └───┘
 /      \
/________\
```

### 8.8 추천 알고리즘 흐름

```
getExpressionRecommendations(role, keywords):
  │
  ├── 1. 역할 기본 가중치 로드 (roleRules[role])
  │
  ├── 2. 키워드 매칭으로 가중치 부스트
  │   for each keyword in keywords:
  │     for each booster in KEYWORD_BOOSTERS:
  │       if keyword matches booster.pattern:
  │         weights[booster.family] += booster.boost
  │
  ├── 3. 가중치 상한 1.0 캡
  │
  ├── 4. 가중치 내림차순 정렬
  │
  └── 5. 상위 5개 반환 (family, weight, reason, suggestedComposition)
```

---

> **Part 2 끝** — Part 3에서는 PPTX 내보내기, 프론트엔드 UI/UX, 기술 스택, 제한사항, 경쟁사 비교를 다룹니다.

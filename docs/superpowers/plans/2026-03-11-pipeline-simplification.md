# Pipeline Simplification: 8-Step → 5-Step

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all intermediate user-selection steps (direction/blueprint/slide-count/structure). LLM auto-decides everything in one call. User only confirms results and selects per-slide design candidates.

**Architecture:** Old Steps 1-4 (방향선택, 청사진결정, 장수확정, 구조선택) merge into a single Step 1 where LLM outputs all decisions at once. Old Step 5 (콘텐츠) → new Step 2. Old Step 6 (디자인플랜) → new Step 3. Old Step 7 (슬라이드제작) → new Step 4. Existing data types are preserved and auto-populated.

**Tech Stack:** Next.js 14, TypeScript, React hooks, streaming LLM API

---

## Design Principles

1. **사용자가 정하는 건 디자인 스타일뿐** — 방향, 청사진, 장수, 구조는 LLM 자동 결정
2. **첫 시각 결과물까지 빠르게** — 입력 → 자동기획 확인 → 바로 콘텐츠/디자인
3. **피드백은 채팅으로** — "장수 줄여줘", "이 섹션 빼줘" 등은 chat에서 Step 1 재실행

---

## Pipeline Comparison

### Before (8 steps, 5 user selections)
```
0.문서분석 → 1.방향선택(3안) → 2.청사진선택(4안) → 3.장수선택(3안) → 4.구조선택(3안) → 5.콘텐츠확인 → 6.디자인플랜확인 → 7.슬라이드제작(매장3안)
```

### After (5 steps, per-slide selection only)
```
0.문서분석 → 1.자동기획(확인) → 2.콘텐츠(확인) → 3.디자인플랜(확인) → 4.슬라이드제작(매장3안)
              LLM이 전부 결정      LLM 자동생성      LLM 자동생성        사용자 매장 선택
```

User interactions: Step 1 확인, Step 2 확인, Step 3 확인, Step 4 매 슬라이드 1안 선택

---

## Reset Policy (피드백 → 무효화 규칙)

| 피드백 유형 | 예시 | 무효화 범위 |
|------------|------|------------|
| 방향/장수/구조 변경 | "장수 줄여줘", "섹션 빼줘", "다른 방향으로" | Step 1부터 재실행 (context~structure 전체 리셋) |
| 콘텐츠 수정 | "이 슬라이드 메시지 바꿔줘" | Step 2부터 재실행 (contentSpec 리셋) |
| 디자인 스타일 변경 | "톤 바꿔줘", "좀 더 세련되게" | Step 3부터 재실행 (deckDesignPlan 리셋) |
| 슬라이드 재생성 | "이 슬라이드 다시" | Step 4에서 현재 슬라이드만 재요청 |

구현: `resetFromStep(stepId)` 호출 → 해당 step 이후 모든 데이터 클리어

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/types.ts` | Modify | StepId 0-4, add AutoPlanningResult, simplify PipelineState, update StructuredDataType |
| `src/lib/constants.ts` | Modify | STEPS 배열 → 5개 |
| `src/lib/pipeline/steps.ts` | Modify | getNextStep max 4, canAdvance 5단계 |
| `src/lib/pipeline/validator.ts` | Modify | auto_planning 검증 추가, 옛 4개 타입 제거, toOptionCandidates 정리 |
| `src/lib/llm/prompts.ts` | Modify | case 0-4 (5개), Step 1 메가프롬프트 |
| `src/lib/reference/promptBuilder.ts` | Modify | buildStepSpecificHint 리넘버 |
| `src/hooks/usePipeline.ts` | Modify | auto_planning 핸들러, selectOption 단순화, resetFromStep 단순화 |
| `src/components/chat/ChatContainer.tsx` | Modify | 오케스트레이션 단순화, autoplanReady 추가 |
| `src/components/preview/PreviewPanel.tsx` | Modify | 렌더 분기 재구성: 옛 Step 1-4 UI 제거, Step 1 자동기획 리뷰 UI 추가 |

---

## Chunk 1: Type System & Constants

### Task 1: Update types.ts

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Change StepId**

Line 50 — change:
```typescript
export type StepId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
```
to:
```typescript
export type StepId = 0 | 1 | 2 | 3 | 4;
```

- [ ] **Step 2: Add AutoPlanningResult type**

After line 173 (after SlideCountRecommendation), add:
```typescript
// ─── Auto Planning Result (Step 1: LLM auto-decides everything) ───
export interface AutoPlanningResult {
  context: PresentationContext;
  direction: PresentationDirection;
  blueprintDecision: ArchitectureBlueprintDecision;
  confirmedSlideCount: number;
  structure: OutlineCandidate;
}
```

- [ ] **Step 3: Update StructuredDataType**

Around line 442 — change to:
```typescript
export type StructuredDataType =
  | 'auto_planning'
  | 'content_spec'
  | 'deck_design_plan'
  | 'slide_candidates'
  | 'doc_analysis';
```

- [ ] **Step 4: Simplify PipelineState**

Around line 289 — remove these fields:
- `directionCandidates?: PresentationDirection[]`
- `slideCountRecommendations?: SlideCountRecommendation[]`
- `structureCandidates?: OutlineCandidate[]`

Keep ALL other fields including `documentAnalysis`, `selectedDirection`, `architectureBlueprintDecision`, `confirmedSlideCount`, `selectedStructure`, `contentSpec`, `deckDesignPlan`, etc. These are still populated (now by auto_planning) and read by downstream steps.

Result:
```typescript
export interface PipelineState {
  currentStep: StepId;
  documentAnalysis?: DocumentAnalysis;
  context?: PresentationContext;
  selectedDirection?: PresentationDirection;
  architectureBlueprintDecision?: ArchitectureBlueprintDecision;
  confirmedSlideCount?: number;
  selectedStructure?: OutlineCandidate;
  contentSpec?: ContentSpecification;
  deckDesignPlan?: DeckDesignPlan;
  currentSlideIndex: number;
  slideCandidates?: SlideCandidate[];
  completedSlides: SlideContent[];
  finalPlan?: FinalDeckPlan;
  selectedThemeId?: string;
}
```

---

### Task 2: Update constants.ts

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Replace STEPS array (lines 3-53)**

Keep everything after line 53 unchanged (getStep, DEFAULT_PROVIDER, model constants, STRUCTURED_DATA_START/END).

```typescript
export const STEPS: StepDefinition[] = [
  { id: 0, name: '문서 분석', description: 'RFI/RFP 문서를 업로드하고 분석합니다', requiresOptions: false, optional: true },
  { id: 1, name: '자동 기획', description: 'AI가 방향, 장수, 구조를 자동으로 결정합니다', requiresOptions: false },
  { id: 2, name: '콘텐츠 문서화', description: '슬라이드별 콘텐츠 명세서를 작성합니다', requiresOptions: false },
  { id: 3, name: '디자인 플랜', description: 'Deck Design Plan을 생성합니다', requiresOptions: false },
  { id: 4, name: '슬라이드 제작', description: '슬라이드별 디자인 3안을 제작합니다', requiresOptions: true },
];
```

- [ ] **Step 2: Commit chunk 1**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "refactor: StepId 0-4, add AutoPlanningResult, simplify PipelineState"
```

---

## Chunk 2: Pipeline Logic

### Task 3: Update steps.ts

**Files:**
- Modify: `src/lib/pipeline/steps.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import { StepId, PipelineState } from '../types';

export function getNextStep(current: StepId, _state: PipelineState): StepId | null {
  if (current >= 4) return null;
  return (current + 1) as StepId;
}

export function canAdvance(stepId: StepId, state: PipelineState): boolean {
  switch (stepId) {
    case 0:
      return !!state.documentAnalysis;
    case 1:
      return !!state.context && !!state.selectedDirection && !!state.confirmedSlideCount && !!state.selectedStructure;
    case 2:
      return !!state.contentSpec;
    case 3:
      return !!state.deckDesignPlan;
    case 4:
      return state.completedSlides.length === (state.confirmedSlideCount || 0);
    default:
      return false;
  }
}
```

---

### Task 4: Update validator.ts

**Files:**
- Modify: `src/lib/pipeline/validator.ts`

- [ ] **Step 1: Replace validateStructuredData**

Remove old cases (direction_candidates, architecture_blueprint, slide_count_recommendations, slide_structure). Add auto_planning.

```typescript
export function validateStructuredData(data: StructuredData): boolean {
  if (!data || !data.type || !data.data) return false;

  switch (data.type) {
    case 'auto_planning': {
      const d = data.data as Record<string, unknown>;
      return !!(
        d.context &&
        d.direction &&
        typeof d.confirmedSlideCount === 'number' &&
        d.confirmedSlideCount > 0 &&
        d.structure &&
        Array.isArray((d.structure as Record<string, unknown>).sections)
      );
    }
    case 'content_spec': {
      const spec = data.data as Record<string, unknown>;
      return !!(spec && Array.isArray(spec.slideSpecs) && spec.slideSpecs.length > 0);
    }
    case 'deck_design_plan': {
      const plan = data.data as Record<string, unknown>;
      return !!(plan && plan.tone && plan.visualMotif && Array.isArray(plan.roleAssignments));
    }
    case 'slide_candidates': {
      const sc = data.data as Record<string, unknown>;
      return !!(sc && Array.isArray(sc.candidates) && sc.candidates.length >= 2);
    }
    case 'doc_analysis':
      return typeof data.data === 'object' && data.data !== null;
    default:
      return false;
  }
}
```

- [ ] **Step 2: Simplify toOptionCandidates**

After the refactor, `toOptionCandidates` is only used for `slide_candidates` in usePipeline.ts — but looking at the code, slide_candidates has its OWN mapping logic (usePipeline.ts lines 132-139) and never calls `toOptionCandidates`. So `toOptionCandidates` and `buildDetailText` become dead code.

Replace the entire toOptionCandidates + buildDetailText section with a minimal version:

```typescript
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
```

Keep `validateSlideAgainstRole` unchanged (lines 98-148).

---

### Task 5: Rewrite prompts.ts

**Files:**
- Modify: `src/lib/llm/prompts.ts`

- [ ] **Step 1: buildContextBlock — keep as-is**

Keep ALL existing context blocks including `architectureBlueprintDecision`. Downstream steps (design plan, slide production) need this context. No changes to this function.

- [ ] **Step 2: Replace the switch statement — 5 cases total**

**Case 0** (문서 분석): Keep unchanged.

**Case 1** (자동 기획 — NEW mega-prompt):
```typescript
case 1:
  return `${BASE_INSTRUCTION}
${contextBlock}${refBlock}

사용자의 입력${state.documentAnalysis ? '과 문서 분석 결과' : ''}를 바탕으로 발표 전체를 자동으로 기획하세요.${refHint}

레퍼런스 자료가 있다면 반드시 참고하여 비슷한 수준의 완성도와 구조를 목표로 하세요.

다음을 **모두** 한 번에 결정하세요:

## 1. 발표 맥락 분석
- 발표 목표(goal), 대상 청중(audience), 도메인(domain)
- 핵심 문제(problem), 제약 조건(constraints), 키워드(keywords)
- 기술 주제 여부(isTechnical)

## 2. 발표 방향 (최적 1개 자동 결정)
- 가장 적합한 접근법 (예: "문제-해결 내러티브", "기술 아키텍처 중심")
- 서사 흐름 (→ 기호로 구분)
- 발표 톤
- 추천 슬라이드 수 범위 [min, mid, max]

## 3. 아키텍처 청사진 (자동 결정)
- 기술 주제가 아니면 mode: "none", slideCountImpact: 0
- 기술 주제면 문서/레퍼런스 기반으로 적절한 모드 자동 결정:
  none(+0) / summary-1(+1) / compare-2(+2) / detailed-3(+3)

## 4. 슬라이드 장수 (자동 확정)
- 추천 범위 + 청사진 영향 반영한 최적 장수 1개

## 5. 슬라이드 구조 (자동 결정)
- 확정 장수에 맞는 섹션 구조
- 각 섹션: 제목, 슬라이드 수, 목적, 핵심 포인트
- **섹션별 슬라이드 수 합계 = 확정 장수 (반드시 일치)**

구조화된 데이터 형식:
<!--STRUCTURED_DATA
{"type":"auto_planning","data":{"context":{"topic":"...","audience":"...","goal":"...","domain":"...","problem":"...","constraints":["..."],"keywords":["..."],"isTechnical":true},"direction":{"id":"dir-auto","approach":"...","narrative":"단계1 → 단계2 → 단계3","tone":"...","recommendedSlideCounts":[8,10,12]},"blueprintDecision":{"includeBlueprint":false,"mode":"none","focus":null,"reason":"...","slideCountImpact":0},"confirmedSlideCount":10,"structure":{"id":"struct-auto","title":"...","sections":[{"sectionTitle":"...","slideCount":2,"purpose":"...","keyPoints":["..."]}],"totalSlides":10}}}
-->`;
```

**Case 2** (콘텐츠 문서화): Copy old case 5 content exactly, just change case number.

**Case 3** (디자인 플랜): Copy old case 6 content exactly, just change case number.

**Case 4** (슬라이드 제작): Copy old case 7 content. Change internal `slideNum` logic: remains the same since it reads from `state.currentSlideIndex` and `state.contentSpec?.slideSpecs`. No semantic changes, just case number `7` → `4`.

Remove old cases 2, 3, 4, 5, 6, 7.

---

### Task 6: Update promptBuilder.ts

**Files:**
- Modify: `src/lib/reference/promptBuilder.ts`

- [ ] **Step 1: Update buildStepSpecificHint switch cases**

```
case 1: "레퍼런스의 전체 구조, 장수, 섹션 구성, 발표 방향을 참고하여 최적의 기획안을 만드세요"
case 2: (old case 5 content — content spec hints)
case 3: (old case 6 content — design plan hints)
case 4: (old case 7 content — slide production hints)
Remove old cases 2, 3, 4, 5, 6, 7
```

- [ ] **Step 2: Commit chunk 2**

```bash
git add src/lib/pipeline/steps.ts src/lib/pipeline/validator.ts src/lib/llm/prompts.ts src/lib/reference/promptBuilder.ts
git commit -m "refactor: pipeline logic, prompts, validator for 5-step auto-planning"
```

---

## Chunk 3: State Management (usePipeline.ts)

### Task 7: Rewrite usePipeline

**Files:**
- Modify: `src/hooks/usePipeline.ts`

Important: This hook exposes `currentOptions` as `useState<OptionCandidate[]>` and `selectedOptionId` is managed in ChatContainer.tsx, NOT in this hook. The plan must match this structure.

- [ ] **Step 1: Update imports**

Remove: `SlideCountRecommendation`
Add: `AutoPlanningResult`
Keep all others.

- [ ] **Step 2: Replace processStructuredData**

Remove handlers for: `direction_candidates`, `architecture_blueprint`, `slide_count_recommendations`, `slide_structure`.

Add `auto_planning` handler:
```typescript
case 'auto_planning': {
  const result = data.data as AutoPlanningResult;
  setState((prev) => ({
    ...prev,
    context: result.context,
    selectedDirection: result.direction,
    architectureBlueprintDecision: result.blueprintDecision,
    confirmedSlideCount: result.confirmedSlideCount,
    selectedStructure: result.structure,
  }));
  // No options — single auto-decided result, no setCurrentOptions
  break;
}
```

Keep `content_spec`, `deck_design_plan`, `slide_candidates`, `doc_analysis` handlers unchanged.

- [ ] **Step 3: Simplify selectOption**

Only Step 4 (slide production) needs selection. Remove all old step branches:

```typescript
const selectOption = useCallback(
  (optionId: string) => {
    // Only Step 4 slide candidate highlighting — actual confirmation via confirmSlide
    // The selection state (selectedOptionId) is managed in ChatContainer, not here
  },
  [state]
);
```

- [ ] **Step 4: Remove setBlueprintDecision**

Lines 181-186: Dead code after auto_planning handles this. Remove the function and its entry in the return object.

- [ ] **Step 5: Simplify resetFromStep**

```typescript
const resetFromStep = useCallback((stepId: StepId) => {
  setState((prev) => {
    const next = { ...prev, currentStep: stepId };
    if (stepId <= 1) {
      // Clear all auto-planning results
      next.context = undefined;
      next.selectedDirection = undefined;
      next.architectureBlueprintDecision = undefined;
      next.confirmedSlideCount = undefined;
      next.selectedStructure = undefined;
    }
    if (stepId <= 2) {
      next.contentSpec = undefined;
    }
    if (stepId <= 3) {
      next.deckDesignPlan = undefined;
    }
    if (stepId <= 4) {
      next.slideCandidates = undefined;
      next.completedSlides = [];
      next.currentSlideIndex = 0;
      next.finalPlan = undefined;
    }
    return next;
  });
  setCurrentOptions([]);
}, []);
```

- [ ] **Step 6: Update return object**

Remove `setBlueprintDecision` from return. Everything else stays.

- [ ] **Step 7: Commit chunk 3**

```bash
git add src/hooks/usePipeline.ts
git commit -m "refactor: usePipeline auto_planning handler, simplified reset"
```

---

## Chunk 4: ChatContainer Orchestration

### Task 8: Rewrite ChatContainer.tsx

**Files:**
- Modify: `src/components/chat/ChatContainer.tsx`

- [ ] **Step 1: Add autoplanReady state**

After line 29 (deckDesignPlanReady), add:
```typescript
const [autoplanReady, setAutoplanReady] = useState(false);
```

- [ ] **Step 2: Rewrite processResponse**

Replace the structured type checks (lines 58-83):

```typescript
const processResponse = useCallback(
  async (fullText: string | null, currentStep: number, pipelineState: typeof pipeline.state) => {
    if (!fullText) return;
    const structured = extractStructuredData(fullText);
    if (!structured) return;

    pipeline.processStructuredData(structured);

    switch (structured.type) {
      case 'auto_planning':
        setAutoplanReady(true);
        setMobileTab('preview');
        break;
      case 'content_spec':
        setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
        setContentSpecReady(true);
        setMobileTab('preview');
        break;
      case 'deck_design_plan':
        setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
        setDeckDesignPlanReady(true);
        setMobileTab('preview');
        break;
      case 'slide_candidates':
        setSelectedOptionId(null);
        setMobileTab('preview');
        break;
    }
  },
  [pipeline]
);
```

- [ ] **Step 3: Add handleConfirmAutoPlanning**

```typescript
const handleConfirmAutoPlanning = useCallback(async () => {
  setAutoplanReady(false);
  setIsProcessing(true);
  try {
    setCompletedSteps((prev) => [...new Set([...prev, 1])]);
    pipeline.advanceStep();

    const nextStep: StepId = 2;
    const nextState = { ...pipeline.state, currentStep: nextStep };
    const msg = '확정된 슬라이드 구조를 기반으로 콘텐츠 명세서를 작성해주세요.';
    const fullText = await sendMessage(msg, nextStep, nextState);
    await processResponse(fullText, nextStep, nextState);
  } finally {
    setIsProcessing(false);
  }
}, [pipeline, sendMessage, processResponse]);
```

- [ ] **Step 4: Update handleConfirmContentSpec**

Change step numbers: advances to Step 3 (was Step 6):
```typescript
const handleConfirmContentSpec = useCallback(async () => {
  setContentSpecReady(false);
  setIsProcessing(true);
  try {
    pipeline.advanceStep();
    const nextStep: StepId = 3;
    const nextState = { ...pipeline.state, currentStep: nextStep };
    const msg = '콘텐츠 명세서를 바탕으로 Deck Design Plan을 생성해주세요.';
    const nextText = await sendMessage(msg, nextStep, nextState);
    await processResponse(nextText, nextStep, nextState);
  } finally {
    setIsProcessing(false);
  }
}, [pipeline, sendMessage, processResponse]);
```

- [ ] **Step 5: Update handleConfirmDeckDesignPlan**

Change step numbers: advances to Step 4 (was Step 7):
```typescript
const handleConfirmDeckDesignPlan = useCallback(async () => {
  setDeckDesignPlanReady(false);
  setIsProcessing(true);
  try {
    pipeline.advanceStep();
    const nextStep: StepId = 4;
    const nextState = { ...pipeline.state, currentStep: nextStep, currentSlideIndex: 0 };
    const msg = `슬라이드 1번의 디자인 후보 3개를 제작해주세요.`;
    const nextText = await sendMessage(msg, nextStep, nextState);
    await processResponse(nextText, nextStep, nextState);
  } finally {
    setIsProcessing(false);
  }
}, [pipeline, sendMessage, processResponse]);
```

- [ ] **Step 6: Rewrite handleOptionConfirm — Step 4 only**

Replace entire function. Only handles Step 4 (slide production):
```typescript
const handleOptionConfirm = useCallback(async () => {
  setIsProcessing(true);
  try {
    if (pipeline.state.currentStep !== 4 || !pipeline.state.slideCandidates) return;

    const selected = pipeline.state.slideCandidates.find((c: SlideCandidate) => c.id === selectedOptionId);
    if (!selected) return;

    pipeline.confirmSlide(selected.slide);
    setSelectedOptionId(null);

    const totalSlides = pipeline.state.confirmedSlideCount || 0;
    const nextSlideIndex = pipeline.state.currentSlideIndex + 1;

    if (nextSlideIndex < totalSlides) {
      const nextState = {
        ...pipeline.state,
        completedSlides: [...pipeline.state.completedSlides, selected.slide],
        currentSlideIndex: nextSlideIndex,
        slideCandidates: undefined,
      };
      const slideNum = pipeline.state.contentSpec?.slideSpecs[nextSlideIndex]?.slideNumber || nextSlideIndex + 1;
      const msg = `슬라이드 ${slideNum}번의 디자인 후보 3개를 제작해주세요.`;
      const fullText = await sendMessage(msg, 4, nextState);
      await processResponse(fullText, 4, nextState);
    } else {
      setCompletedSteps((prev) => [...new Set([...prev, 4])]);
    }
  } finally {
    setIsProcessing(false);
  }
}, [pipeline, sendMessage, processResponse, selectedOptionId]);
```

- [ ] **Step 7: Update handleFileUpload**

Line 256: `currentStep: 1 as const` — this is already correct (Step 1 = 자동기획).
The sendMessage and processResponse calls stay the same. No changes needed.

- [ ] **Step 8: Pass autoplanReady + handler to PreviewPanel**

In the JSX, add to PreviewPanel props:
```tsx
autoplanReady={autoplanReady}
onConfirmAutoPlanning={handleConfirmAutoPlanning}
```

- [ ] **Step 9: Commit chunk 4**

```bash
git add src/components/chat/ChatContainer.tsx
git commit -m "refactor: ChatContainer orchestration for 5-step pipeline"
```

---

## Chunk 5: PreviewPanel Render Branch Restructuring

### Task 9: Rewrite PreviewPanel.tsx

**Files:**
- Modify: `src/components/preview/PreviewPanel.tsx`

This is a render branch restructuring, not simple deletion. The file has interleaved dependencies (buildOptionSlides, hoveredOptionId, hasOptions) that need careful cleanup.

- [ ] **Step 1: Update props interface**

Add:
```typescript
autoplanReady?: boolean;
onConfirmAutoPlanning?: () => void;
```

Add to destructured props.

- [ ] **Step 2: Remove dead state & helpers**

Remove:
- `hoveredOptionId` state (line 49)
- `buildOptionSlides` callback (lines 74-145) — only used by old Step 4 structure cards

- [ ] **Step 3: Update isSlideProductionMode**

Change `pipelineState.currentStep === 7` → `pipelineState.currentStep === 4`

- [ ] **Step 4: Delete old Step 1 direction cards UI**

Remove the entire `if (hasOptions && pipelineState.currentStep === 1)` block (was ~lines 289-407).

- [ ] **Step 5: Delete old Step 2 blueprint cards UI**

Remove the entire `if (hasOptions && pipelineState.currentStep === 2)` block (was ~lines 409-478).

- [ ] **Step 6: Delete old Step 3 slide count cards UI**

Remove the entire `if (hasOptions && pipelineState.currentStep === 3)` block (was ~lines 480-547).

- [ ] **Step 7: Delete old Step 4 structure cards UI**

Remove the entire `if (hasOptions && pipelineState.currentStep === 4)` block (was ~lines 549-644).

- [ ] **Step 8: Update content spec step check**

Change `pipelineState.currentStep === 5` → `pipelineState.currentStep === 2` in the content spec display block.

- [ ] **Step 9: Update design plan step check**

The design plan block (currently `if (deckDesignPlanReady && pipelineState.deckDesignPlan)`) has no step number check, so no change needed.

- [ ] **Step 10: Add Step 1 auto-plan review UI**

Insert BEFORE the content spec ready block. This shows when autoplanReady is true:

```tsx
// ─── Step 1: 자동 기획 결과 확인 ───
if (autoplanReady && pipelineState.selectedDirection && pipelineState.selectedStructure) {
  const dir = pipelineState.selectedDirection;
  const struct = pipelineState.selectedStructure;
  const bp = pipelineState.architectureBlueprintDecision;

  // Build skeleton slides from structure
  const skeletonSlides: SlideContent[] = [];
  let slideNum = 1;
  for (const section of struct.sections) {
    for (let i = 0; i < section.slideCount; i++) {
      skeletonSlides.push({
        slideNumber: slideNum,
        title: i === 0 ? section.sectionTitle : `${section.sectionTitle} (${i + 1})`,
        layout: slideNum === 1 ? 'title-slide' : 'title-content',
        contentType: 'bullets',
        bulletPoints: i === 0 ? section.keyPoints.slice(0, 4) : [],
        bodyText: section.purpose,
        speakerNotes: '',
      });
      slideNum++;
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">자동 기획 결과</h3>
        <p className="text-xs text-gray-400 mt-0.5">AI가 결정한 발표 구조입니다. 수정이 필요하면 채팅으로 요청하세요.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 방향 요약 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">발표 방향</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">{dir.tone}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dir.approach}</p>
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {dir.narrative.split('→').map((step, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">{step.trim()}</span>
                {i < arr.length - 1 && <span className="text-gray-400 text-[10px]">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* 장수 + 청사진 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="text-3xl font-bold text-blue-500">{pipelineState.confirmedSlideCount}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">슬라이드</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{struct.title}</p>
              {bp && bp.mode !== 'none' && (
                <p className="text-[10px] text-purple-500 mt-0.5">+ 아키텍처 청사진 ({bp.mode}, {bp.slideCountImpact}장)</p>
              )}
            </div>
          </div>
        </div>

        {/* 섹션 구성 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">섹션 구성</p>
          {struct.sections.map((sec, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-xs font-bold text-blue-500 w-5 text-right">{sec.slideCount}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{sec.sectionTitle}</p>
                <p className="text-[10px] text-gray-400">{sec.purpose}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 스켈레톤 슬라이드 미리보기 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">슬라이드 미리보기</p>
          <div className="grid grid-cols-3 gap-2">
            {skeletonSlides.map((slide) => (
              <div key={slide.slideNumber} className="rounded-lg overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                <SlideRenderer slide={slide} theme={activeTheme} scale={0.28} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onConfirmAutoPlanning} disabled={isProcessing} className="w-full" size="md">
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> 콘텐츠 작성 준비 중...</span>
          ) : '확인 — 콘텐츠 문서화 시작'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Clean up hasOptions usage**

After removing old Step 1-4 UIs, `hasOptions` is no longer used for step-specific rendering. It may still be referenced in the "options guide banner" in ChatContainer. Check and clean up any remaining references in PreviewPanel.

- [ ] **Step 12: Commit chunk 5**

```bash
git add src/components/preview/PreviewPanel.tsx
git commit -m "refactor: PreviewPanel render restructure, auto-plan review UI"
```

---

## Chunk 6: Integration & Verification

### Task 10: Fix all TypeScript errors

**Files:**
- All modified files

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit 2>&1`

Expected possible errors:
- `useSlidePreview.ts`: No step number references, should be clean
- `useChat.ts`: Uses StepId and PipelineState generically, should be clean
- `api/chat/route.ts`: Uses StepId, accepts runtime values — no type error but old values (5,6,7) would be accepted at runtime (acceptable)
- Any remaining references to removed PipelineState fields (`directionCandidates`, etc.)

- [ ] **Step 2: Fix any errors found**

Common fixes:
- Remove imports for removed types
- Fix any remaining old StepId literal values (5, 6, 7)
- Fix any references to removed PipelineState fields

- [ ] **Step 3: Run dev server**

Run: `npm run dev`
Expected: Compiles and serves

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve all TypeScript errors after pipeline simplification"
```

---

## Verification Checklist

1. `npx tsc --noEmit` — zero errors
2. `npm run dev` — runs without errors
3. StepIndicator shows 5 steps: 문서분석, 자동기획, 콘텐츠문서화, 디자인플랜, 슬라이드제작
4. User enters topic → LLM auto-decides direction + count + structure → PreviewPanel shows auto-plan review with skeleton slide thumbnails
5. User confirms → content spec auto-generated → PreviewPanel shows spec review
6. User confirms → design plan auto-generated → PreviewPanel shows visual slide previews
7. User confirms → slide production → 3 candidates per slide
8. `confirmedSlideCount` locks all downstream stages
9. Chat feedback "장수 줄여줘" → Step 1 re-run
10. Chat feedback "톤 바꿔줘" → Step 3 re-run

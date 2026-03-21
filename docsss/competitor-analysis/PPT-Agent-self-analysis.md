# PPT Agent 자체 프로젝트 심층 분석 보고서 (구버전 — 2026-03-11)

> **이 문서는 구버전입니다.** 2026-03-17 전면 개정판은 아래 3개 파일을 참조하세요:
> - [Part 1: 프로젝트 개요, 시스템 아키텍처, Architecture Mapper, 레퍼런스 시스템](./PPT-Agent-self-analysis-part1.md)
> - [Part 2: Chat 파이프라인, 프롬프트 전략, Composition 시스템, ExpressionFamily](./PPT-Agent-self-analysis-part2.md)
> - [Part 3: PPTX 내보내기, UI/UX, 기술 스택, 제한사항, 경쟁사 비교](./PPT-Agent-self-analysis-part3.md)

---

> **분석 대상**: PPT Agent (Next.js/TypeScript)
> **버전**: 0.1.0
> **분석 일자**: 2026-03-11 (구버전)
> **분석 목적**: 프로젝트 아키텍처·구현 수준의 체계적 정리 및 경쟁사 대비 포지셔닝 분석
> **문서 언어**: 한국어 (기술 용어 영어 병기)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [아키텍처 & 파이프라인 구조](#2-아키텍처--파이프라인-구조)
3. [레퍼런스 분석 시스템](#3-레퍼런스-분석-시스템)
4. [프롬프트 전략](#4-프롬프트-전략)
5. [슬라이드 생성 로직](#5-슬라이드-생성-로직)
6. [디자인 시스템](#6-디자인-시스템)
7. [차트/다이어그램/이미지 처리](#7-차트다이어그램이미지-처리)
8. [PPTX 내보내기](#8-pptx-내보내기)
9. [프론트엔드 UI/UX](#9-프론트엔드-uiux)
10. [기술 스택](#10-기술-스택)
11. [제한사항 & 약점](#11-제한사항--약점)
12. [경쟁사 대비 포지셔닝 & 개선 방향](#12-경쟁사-대비-포지셔닝--개선-방향)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정의

PPT Agent는 AI 기반 **대화형 프레젠테이션 기획·제작 웹 애플리케이션**이다.
단순한 "텍스트를 슬라이드로 변환"하는 도구가 아니라, **5단계 파이프라인**을 통해
사용자와 대화하며 점진적으로 프레젠테이션을 완성하는 **에이전트 기반 시스템**이다.

- **프레임워크**: Next.js 16.1.6 (App Router)
- **언어**: TypeScript + React 19
- **LLM**: Claude Sonnet 4 / OpenAI (OpenRouter 호환)
- **출력**: .pptx (PptxGenJS)

### 1.2 핵심 기능 목록

| 기능 | 설명 |
|------|------|
| 5-Step 파이프라인 | 문서분석 → 방향설정 → 구조기획 → 콘텐츠명세 → 슬라이드제작 |
| 대화형 인터페이스 | LLM과 채팅하며 각 단계에서 후보 중 선택 |
| 레퍼런스 제안서 시스템 | 기존 PPTX/PDF/DOCX를 분석하여 스타일·구조 학습 |
| 문서 분석 (RFI/RFP) | PDF/DOCX 업로드 후 요구사항·제약조건 자동 추출 |
| 11종 Composition Variant | 그리드, 플로우, 허브스포크, 타임라인 등 다양한 시각적 구도 |
| 3종 디자인 테마 | Corporate Blue, Dark Premium, Modern Gradient |
| Mermaid 다이어그램 | 코드 기반 다이어그램 자동 렌더링 |
| 차트 지원 | Bar, Pie, Line 차트 자동 생성 |
| PPTX 다운로드 | PptxGenJS 기반 16:9 PPTX 파일 생성 |
| 다중 LLM 지원 | Claude (Anthropic SDK) + OpenAI/OpenRouter |
| 실시간 스트리밍 | ReadableStream 기반 토큰 단위 실시간 응답 |

### 1.3 프로젝트 규모

```
언어: TypeScript (100%)
프레임워크: Next.js 16.1.6 + React 19.2.3
소스 파일: ~50+ 핵심 파일
주요 디렉터리: 8개 (lib, hooks, components, api, app 등)
커밋: 초기 개발 단계 (Initial commit + 기능 개발)
```

### 1.4 프로젝트 구조

```
PPT Agent/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # 메인 페이지 (/ → /chat 리다이렉트)
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   ├── globals.css               # Tailwind CSS 글로벌 스타일
│   │   ├── chat/
│   │   │   └── page.tsx              # 채팅 인터페이스 메인 페이지
│   │   ├── references/
│   │   │   └── page.tsx              # 레퍼런스 관리 페이지
│   │   └── api/                      # API 라우트 (서버사이드)
│   │       ├── chat/
│   │       │   └── route.ts          # LLM 스트리밍 채팅 엔드포인트
│   │       ├── generate-ppt/
│   │       │   └── route.ts          # PPTX 생성 엔드포인트
│   │       ├── upload/
│   │       │   └── route.ts          # 문서 업로드 & 파싱
│   │       ├── analyze-doc/
│   │       │   └── route.ts          # 문서 LLM 분석
│   │       ├── references/
│   │       │   ├── route.ts          # GET (목록) / POST (생성)
│   │       │   └── [id]/
│   │       │       └── route.ts      # GET (단건) / DELETE (삭제)
│   │       └── mermaid-to-image/
│   │           └── route.ts          # Mermaid → PNG 변환
│   │
│   ├── components/                   # React 컴포넌트
│   │   ├── chat/                     # 채팅 UI 컴포넌트
│   │   │   ├── ChatContainer.tsx     # 메인 오케스트레이터
│   │   │   ├── MessageList.tsx       # 메시지 목록
│   │   │   └── ChatInput.tsx         # 입력 UI
│   │   ├── preview/                  # 슬라이드 프리뷰
│   │   ├── reference/                # 레퍼런스 관리 UI
│   │   ├── settings/                 # 테마/LLM 설정
│   │   ├── ui/                       # 공통 UI (Button, Card, Toast 등)
│   │   ├── steps/                    # 스텝 인디케이터
│   │   └── options/                  # 후보 선택 카드
│   │
│   ├── hooks/                        # Custom React Hooks
│   │   ├── useChat.ts                # 채팅 스트리밍 & 메시지 관리
│   │   ├── usePipeline.ts            # 파이프라인 상태 머신
│   │   ├── usePptGeneration.ts       # PPT 다운로드 핸들러
│   │   ├── useReferences.ts          # 레퍼런스 CRUD
│   │   └── useSlidePreview.ts        # 슬라이드 프리뷰 내비게이션
│   │
│   └── lib/                          # 핵심 비즈니스 로직
│       ├── types.ts                  # 전체 TypeScript 타입 정의
│       ├── constants.ts              # 상수 & 스텝 정의
│       ├── slideThemes.ts            # 3종 디자인 테마
│       ├── llm/                      # LLM 통합 레이어
│       │   ├── factory.ts            # Provider 팩토리
│       │   ├── provider.ts           # LlmProvider 인터페이스
│       │   ├── claude.ts             # Anthropic Claude 구현
│       │   ├── openai.ts             # OpenAI/OpenRouter 구현
│       │   └── prompts.ts            # Step별 시스템 프롬프트
│       ├── document/                 # 문서 파싱 & 분석
│       │   ├── parser.ts             # PDF/DOCX/PPTX 텍스트 추출
│       │   ├── analyzer.ts           # LLM 기반 문서 분석
│       │   ├── pdfVisionExtractor.ts # Vision API PDF 폴백
│       │   ├── pptxLayoutExtractor.ts# PPTX 레이아웃 청사진 추출
│       │   └── pdfLayoutExtractor.ts # PDF 레이아웃 추출
│       ├── pipeline/                 # 파이프라인 진행 로직
│       │   ├── steps.ts              # 스텝 진행 & 검증
│       │   ├── parser.ts             # LLM 응답 파싱
│       │   └── validator.ts          # 데이터 검증 & 변환
│       ├── ppt/                      # PPTX 생성
│       │   ├── generator.ts          # PptxGenJS 기반 생성기
│       │   ├── templates.ts          # 8종 레이아웃 포지션
│       │   └── mermaid.ts            # Mermaid → PNG 변환
│       └── reference/                # 레퍼런스 제안서
│           ├── store.ts              # JSON 파일 기반 저장소
│           ├── analyzer.ts           # 2단계 LLM 분석
│           └── promptBuilder.ts      # 프롬프트 주입 빌더
│
├── data/
│   └── references.json               # 레퍼런스 영속 저장소
│
├── package.json                       # 의존성 정의
├── next.config.ts                     # Next.js 설정
└── tsconfig.json                      # TypeScript 설정
```

---

## 2. 아키텍처 & 파이프라인 구조

### 2.1 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js 16.1.6 (App Router)                     │
│                                                                         │
│  ┌────────────────────────────────────┐  ┌───────────────────────────┐  │
│  │         프론트엔드 (React 19)        │  │     API Routes (Server)    │  │
│  │                                     │  │                           │  │
│  │  ChatContainer ─┬─ MessageList      │  │  /api/chat          POST  │  │
│  │                 ├─ ChatInput         │  │  /api/upload        POST  │  │
│  │                 ├─ PreviewPanel      │  │  /api/analyze-doc   POST  │  │
│  │                 └─ OptionCards       │  │  /api/generate-ppt  POST  │  │
│  │                                     │  │  /api/references    CRUD  │  │
│  │  Hooks Layer:                       │  │  /api/mermaid-to-image    │  │
│  │  useChat ──────────────────────────────>│                           │  │
│  │  usePipeline (State Machine)        │  │  Streaming Response       │  │
│  │  usePptGeneration                   │  │  (ReadableStream)         │  │
│  │  useReferences                      │  │                           │  │
│  │  useSlidePreview                    │  │                           │  │
│  └────────────────────────────────────┘  └──────────┬────────────────┘  │
│                                                      │                   │
│                                           ┌──────────▼────────────────┐  │
│                                           │     Core Library (lib/)    │  │
│                                           │                           │  │
│                                           │  llm/ ─── factory.ts      │  │
│                                           │      ├── claude.ts        │  │
│                                           │      ├── openai.ts        │  │
│                                           │      └── prompts.ts       │  │
│                                           │                           │  │
│                                           │  document/ ─── parser.ts  │  │
│                                           │            └── analyzer.ts│  │
│                                           │                           │  │
│                                           │  pipeline/ ─── steps.ts   │  │
│                                           │            ├── parser.ts  │  │
│                                           │            └── validator  │  │
│                                           │                           │  │
│                                           │  ppt/ ─── generator.ts    │  │
│                                           │       ├── templates.ts    │  │
│                                           │       └── mermaid.ts      │  │
│                                           │                           │  │
│                                           │  reference/ ─── store.ts  │  │
│                                           │             ├── analyzer  │  │
│                                           │             └── promptBld │  │
│                                           └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   외부 서비스        │
                          │                     │
                          │  Anthropic API      │
                          │  OpenAI/OpenRouter   │
                          │  mermaid.ink         │
                          └─────────────────────┘
```

### 2.2 5-Step 파이프라인: 핵심 아키텍처

PPT Agent의 가장 큰 특징은 **5단계 파이프라인**이다. 사용자가 한 번에 프레젠테이션을 만드는 것이 아니라,
각 단계에서 LLM이 생성한 복수 후보 중에서 선택하며 점진적으로 완성한다.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        5-Step Pipeline Architecture                          │
│                                                                              │
│  Step 0 (선택)     Step 1          Step 2          Step 3          Step 4   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐│
│  │ 문서 분석  │───>│ 방향 설정  │───>│ 슬라이드  │───>│ 콘텐츠   │───>│슬라이드││
│  │           │    │           │    │ 기획      │    │ 명세서   │    │ 제작   ││
│  │ RFI/RFP   │    │ 3개 방향   │    │ 2~3개    │    │ 자동     │    │ 3안    ││
│  │ 업로드     │    │ 후보       │    │ 구조 후보 │    │ 생성     │    │ per슬 ││
│  │           │    │           │    │           │    │           │    │라이드  ││
│  │ optional  │    │ 사용자선택 │    │ 사용자선택│    │ 자동진행  │    │사용자  ││
│  │           │    │           │    │           │    │           │    │선택    ││
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘│
│                                                                              │
│  DocumentAnalysis  PresentationDir  OutlineCandidate  ContentSpec  SlideContent│
│                    PresentationCtx                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 각 Step 정의 (constants.ts)

```typescript
export const STEPS: StepDefinition[] = [
  { id: 0, name: '문서 분석',     description: 'RFI/RFP 문서를 업로드하고 분석합니다', requiresOptions: false, optional: true },
  { id: 1, name: '방향 설정',     description: '발표 맥락을 분석하고 방향을 설정합니다', requiresOptions: true },
  { id: 2, name: '슬라이드 기획', description: '슬라이드 구조를 기획합니다',           requiresOptions: true },
  { id: 3, name: '콘텐츠 문서화', description: '슬라이드별 콘텐츠 명세서를 작성합니다', requiresOptions: false },
  { id: 4, name: '슬라이드 제작', description: '슬라이드별 디자인 3안을 제작합니다',   requiresOptions: true },
];
```

### 2.3 PipelineState: 중앙 상태 모델

모든 진행 상황은 `PipelineState` 인터페이스에 집중된다:

```typescript
export interface PipelineState {
  currentStep: StepId;                              // 현재 Step (0~4)
  context?: PresentationContext;                    // 발표 맥락 (주제, 청중, 목표 등)
  directionCandidates?: PresentationDirection[];    // Step 1: 방향 후보 3개
  selectedDirection?: PresentationDirection;         // Step 1: 선택된 방향
  structureCandidates?: OutlineCandidate[];         // Step 2: 구조 후보 2~3개
  selectedStructure?: OutlineCandidate;              // Step 2: 선택된 구조
  contentSpec?: ContentSpecification;                // Step 3: 콘텐츠 명세서
  currentSlideIndex: number;                        // Step 4: 현재 제작 중인 슬라이드 인덱스
  slideCandidates?: SlideCandidate[];               // Step 4: 현재 슬라이드 후보 3개
  completedSlides: SlideContent[];                  // Step 4: 완성된 슬라이드 배열
  finalPlan?: PresentationPlan;                     // 최종 결과
  documentAnalysis?: DocumentAnalysis;              // Step 0: 문서 분석 결과
  selectedThemeId?: string;                         // 선택된 테마 ID
}
```

### 2.4 데이터 흐름 상세

```
사용자 입력 (채팅)
    │
    ▼
useChat.sendMessage()
    │
    ▼
POST /api/chat
    ├── references 로드 (store.ts)
    ├── 시스템 프롬프트 생성 (prompts.ts + promptBuilder.ts)
    └── LLM 스트리밍 호출 (factory.ts → claude.ts | openai.ts)
    │
    ▼
ReadableStream (토큰 단위)
    │
    ▼
useChat: 텍스트 누적 + extractStructuredData()
    │
    ├── 일반 텍스트 → MessageList에 표시
    │
    └── 구조화 데이터 (<!--STRUCTURED_DATA{...}-->)
         │
         ▼
    usePipeline.processStructuredData()
         │
         ├── direction_candidates → directionCandidates 저장 + 옵션 카드 표시
         ├── slide_structure     → structureCandidates 저장 + 옵션 카드 표시
         ├── content_spec        → contentSpec 저장 + 자동 진행
         └── slide_candidates    → slideCandidates 저장 + 옵션 카드 표시
         │
         ▼
사용자 선택 → selectOption() / confirmSlide()
         │
         ▼
advanceStep() → 다음 Step으로 진행
         │
         ▼ (모든 슬라이드 완성 후)
PresentationPlan 조립 → /api/generate-ppt → .pptx 다운로드
```

### 2.5 구조화 데이터 프레이밍 전략

LLM 응답에서 UI용 데이터를 안정적으로 추출하기 위해 **HTML 주석 기반 프레이밍**을 사용한다:

```
LLM 응답 = 사용자에게 보여줄 자연어 텍스트
          + <!--STRUCTURED_DATA
            {"type":"direction_candidates","data":{...}}
            -->
```

```typescript
// pipeline/parser.ts
export function extractStructuredData(text: string): StructuredData | null {
  const startIdx = text.indexOf(STRUCTURED_DATA_START);
  const endIdx = text.indexOf(STRUCTURED_DATA_END, startIdx);
  if (startIdx === -1 || endIdx === -1) return null;

  const jsonStr = text.slice(startIdx + STRUCTURED_DATA_START.length, endIdx).trim();
  return JSON.parse(jsonStr);
}

export function removeStructuredData(text: string): string {
  // 정규식으로 <!--STRUCTURED_DATA...-->를 제거하고 사용자에게 깔끔한 텍스트만 보여줌
}
```

이 접근법의 장점:
1. **LLM이 자연어 + 구조화 데이터를 한 번의 호출로 동시 생성** — 응답 속도 최적화
2. **HTML 주석 마커가 LLM의 자연어 출력과 간섭하지 않음** — 안정적 파싱
3. **프론트엔드에서 구조화 데이터를 분리하여 UI 컴포넌트에 직접 전달** — 별도 API 호출 불필요

### 2.6 API 엔드포인트 구조

| 엔드포인트 | 메서드 | 목적 | 입력 | 출력 | maxDuration |
|-----------|--------|------|------|------|------------|
| `/api/chat` | POST | LLM 스트리밍 응답 | messages, stepId, pipelineState | ReadableStream | 60s |
| `/api/upload` | POST | 문서 파싱 | file (multipart) | {filename, text, charCount} | 120s |
| `/api/analyze-doc` | POST | 문서 LLM 분석 | text, provider | DocumentAnalysis | 60s |
| `/api/generate-ppt` | POST | PPTX 생성 | PresentationPlan | PPTX binary | - |
| `/api/references` | GET | 레퍼런스 목록 | - | ReferenceProposal[] | - |
| `/api/references` | POST | 레퍼런스 생성 | file 또는 {name, text} | ReferenceProposal | 120s |
| `/api/references/[id]` | GET | 단건 조회 | id | ReferenceProposal | - |
| `/api/references/[id]` | DELETE | 삭제 | id | {success: boolean} | - |
| `/api/mermaid-to-image` | POST | Mermaid→PNG | {mermaidCode} | PNG image | - |

### 2.7 스트리밍 아키텍처

모든 LLM 응답은 `ReadableStream<Uint8Array>`로 전달된다:

```typescript
// LlmProvider 인터페이스
export interface LlmProvider {
  streamChat(options: Omit<LlmStreamOptions, 'provider'>): ReadableStream<Uint8Array>;
}

// Claude 구현
const stream = client.messages.stream({
  model: CLAUDE_MODEL,       // claude-sonnet-4-20250514
  max_tokens: 8192,
  temperature: options.temperature ?? 0.7,
  system: options.systemPrompt,
  messages: anthropicMessages,
});

// ReadableStream으로 변환
return new ReadableStream({
  async start(controller) {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        controller.enqueue(encoder.encode(event.delta.text));
      }
    }
    controller.close();
  },
});
```

---

## 3. 레퍼런스 분석 시스템

### 3.1 개요

PPT Agent의 **레퍼런스 제안서 시스템**은 기존 프레젠테이션 문서(PPTX/PDF/DOCX/텍스트)를
분석하여 디자인 패턴, 작성 스타일, 구조를 학습하고, 새로운 프레젠테이션 생성 시
모든 LLM 프롬프트에 이 패턴을 주입하는 시스템이다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    레퍼런스 분석 파이프라인                            │
│                                                                     │
│  ┌──────────┐                                                       │
│  │ Reference │                                                       │
│  │ File      │  PPTX / PDF / DOCX / Text                            │
│  └─────┬────┘                                                       │
│        │                                                             │
│        ▼                                                             │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ Step 1: 문서 파싱 & 레이아웃 추출                      │            │
│  │                                                      │            │
│  │  PPTX → pptxLayoutExtractor.ts                       │            │
│  │    ├── shape별 위치/크기/타입/색상/폰트 추출            │            │
│  │    ├── 테마 색상 스킴 & 폰트 추출 (theme1.xml)        │            │
│  │    └── 슬라이드별 composition 요약                    │            │
│  │                                                      │            │
│  │  PDF → pdfLayoutExtractor.ts + pdfVisionExtractor.ts │            │
│  │    ├── 텍스트 블록 그룹핑 (1.5x 폰트 높이 기준)       │            │
│  │    └── 이미지 PDF는 Vision API 폴백                   │            │
│  │                                                      │            │
│  │  DOCX → mammoth (텍스트 추출만)                       │            │
│  │  Text → 직접 사용                                    │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                         │                                            │
│                         ▼                                            │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ Step 2: LLM 2단계 분석 (Promise.all 병렬 실행)       │            │
│  │                                                      │            │
│  │  Level 1: analyzeBasicPatterns()                     │            │
│  │    ├── sectionFlow: 섹션 흐름 패턴                    │            │
│  │    ├── slidePatterns: 슬라이드별 레이아웃/밀도          │            │
│  │    ├── writingStyle: 톤, 불릿 스타일, 문장 패턴       │            │
│  │    ├── structuralNotes: 구조적 특징                   │            │
│  │    └── totalSlideCount: 총 슬라이드 수                │            │
│  │                                                      │            │
│  │  Level 2: analyzeSlideDetails()                      │            │
│  │    ├── purpose: 각 슬라이드의 목적                    │            │
│  │    ├── keyMessage: 핵심 메시지                        │            │
│  │    ├── contentStrategy: 콘텐츠 배치 전략              │            │
│  │    ├── designIntent: 디자인 의도                      │            │
│  │    ├── visualElements: 시각 요소별 역할/배치 이유      │            │
│  │    ├── writingPattern: 문체 패턴                      │            │
│  │    ├── narrativeConnection: 스토리 흐름 연결           │            │
│  │    └── notableTechniques: 참고 기법                   │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                         │                                            │
│                         ▼                                            │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ ReferenceProposal (JSON 영속)                        │            │
│  │                                                      │            │
│  │  { id, name, sourceType, createdAt,                  │            │
│  │    analysis: {                                       │            │
│  │      sectionFlow, slidePatterns, writingStyle,       │            │
│  │      structuralNotes, totalSlideCount,               │            │
│  │      layoutBlueprints?, themeInfo?,                  │            │
│  │      slideDetailedAnalyses?                          │            │
│  │    },                                                │            │
│  │    rawSlideTexts? }                                  │            │
│  └─────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 PPTX 레이아웃 청사진 추출

`pptxLayoutExtractor.ts`는 PPTX의 XML 구조를 직접 파싱하여 shape 정보를 추출한다:

```typescript
export interface SlideShape {
  type: 'textbox' | 'image' | 'chart' | 'table' | 'diagram' | 'shape' | 'group' | 'other';
  name: string;
  position: { x: number; y: number; w: number; h: number };  // 0~100 비율
  text?: string;
  subType?: string;
  childCount?: number;
  fillColor?: string;      // hex
  fontFace?: string;
  fontSize?: number;        // pt
}

// EMU → % 좌표 변환 (PPTX의 기본 단위인 EMU를 슬라이드 비율로 변환)
const SLIDE_WIDTH_EMU = 9144000;   // 16:9 기준 슬라이드 너비
const SLIDE_HEIGHT_EMU = 6858000;  // 16:9 기준 슬라이드 높이
```

추출 항목:
- 각 shape의 유형 (textbox, image, chart, table, diagram, group)
- 슬라이드 내 상대 위치 (%, 좌표)
- 배경색, 폰트명, 폰트 크기
- 텍스트 내용 (요약)
- 전체 구성 요약 (예: "좌측 텍스트 + 우측 다이어그램, two-column 감지")

### 3.3 PPTX 테마 추출

```typescript
// theme1.xml에서 색상 스킴 & 폰트 추출
export interface ReferenceThemeInfo {
  primaryColor: string;         // dk1 (주 텍스트 색상)
  secondaryColor: string;       // dk2 (보조 텍스트)
  accentColors: string[];       // accent1~6
  fontHeading: string;          // 제목 폰트 (Latin + EA)
  fontBody: string;             // 본문 폰트
  backgroundStyle: string;      // solid / gradient / image
}
```

### 3.4 2단계 LLM 분석 (analyzer.ts)

**Level 1 & Level 2를 `Promise.all()`로 병렬 실행**하여 분석 시간을 절반으로 단축한다:

```typescript
// reference/analyzer.ts (핵심 구조)
export async function analyzeReference(text: string, layouts?: SlideLayoutBlueprint[]) {
  const [basicPatterns, slideDetails] = await Promise.all([
    analyzeBasicPatterns(text),        // Level 1: 전체 패턴 분석
    analyzeSlideDetails(text, layouts) // Level 2: 슬라이드별 심층 분석
  ]);

  return { ...basicPatterns, slideDetailedAnalyses: slideDetails };
}
```

**컨텍스트 길이 초과 대응 전략:**

```typescript
// 점진적 축소 재시도 (Progressive Retry)
async function analyzeBasicPatterns(text: string) {
  const limits = [20000, 10000, 5000];  // 글자수 제한
  for (const limit of limits) {
    try {
      const truncated = truncateForAnalysis(text, limit);
      return await callLlm(truncated);
    } catch (err) {
      if (isContextLengthError(err)) continue;
      throw err;
    }
  }
}
```

### 3.5 프롬프트 빌더 (promptBuilder.ts)

분석된 레퍼런스는 **모든 Step의 LLM 프롬프트에 자동 주입**된다:

```typescript
export function buildReferenceBlock(analyses: ReferenceAnalysis[]): string {
  // 단일/다중 레퍼런스 모두 지원
  // 포함 정보:
  //   - 섹션 흐름 (A → B → C → ...)
  //   - 디자인 테마 (폰트, 액센트 색상, 배경)
  //   - 작성 스타일 (톤, 불릿 스타일, 자주 쓰는 표현)
  //   - 슬라이드별 레이아웃 패턴 (레이아웃 타입, 콘텐츠 밀도, 차트/다이어그램 유무)
  //   - 레이아웃 청사진 (shape 배치 위치/크기)
  //   - 슬라이드별 디테일 분석 (목적, 핵심 메시지, 디자인 의도, 문체 패턴 등)
}
```

**Step별 힌트 커스텀:**

```typescript
export function buildStepSpecificHint(stepId: number, analyses: ReferenceAnalysis[]): string {
  switch (stepId) {
    case 1: // 방향 설정 → 섹션 흐름 + 내러티브 연결 강조
    case 2: // 구조 기획 → 슬라이드 수 + 목적/전략 강조
    case 3: // 콘텐츠 명세 → 작성 톤 + 불릿 스타일 강조
    case 4: // 슬라이드 제작 → 디자인 의도 + 시각 요소 + 문체 패턴 + 레이아웃 청사진 강조
  }
}
```

**레퍼런스 슬라이드 매칭 (Step 4 전용):**

```typescript
export function matchReferenceSlides(
  currentSectionName: string,
  analyses: ReferenceAnalysis[]
): MatchResult[] {
  // 현재 제작할 슬라이드의 섹션명과 레퍼런스의 섹션명을 퍼지 매칭
  // 정규화: lowercase + 공백 제거
  // 매칭된 슬라이드의 designIntent + contentStrategy를 프롬프트에 주입
}
```

### 3.6 핵심 인사이트: 레퍼런스 시스템의 가치

PPT Agent의 레퍼런스 시스템은 경쟁사인 PPTAgent(V1)의 레퍼런스 분석 시스템에서 영감을 받았지만,
**TypeScript/웹 기반으로 재해석**하여 다음 차별점을 가진다:

1. **실시간 프롬프트 주입**: 분석 결과를 매 LLM 호출마다 동적으로 프롬프트에 주입
2. **Step별 맞춤 힌트**: 각 파이프라인 단계에서 레퍼런스의 다른 측면을 강조
3. **퍼지 매칭**: 섹션명 기반으로 유사한 레퍼런스 슬라이드를 자동으로 찾아 참고 자료로 제공
4. **다중 레퍼런스 지원**: 여러 레퍼런스를 동시에 등록하고, 공통점/차이점을 자동 비교

---

## 4. 프롬프트 전략

### 4.1 프롬프트 아키텍처 개관

PPT Agent의 프롬프트는 **동적 조합 방식**으로 구성된다:

```
최종 프롬프트 = BASE_INSTRUCTION (공통 지시문)
             + Step별 지시문
             + buildContextBlock(state)  ← 현재까지의 진행 상황
             + buildReferenceBlock(refs) ← 레퍼런스 패턴
             + buildStepSpecificHint()   ← Step별 레퍼런스 힌트
             + 슬라이드 제작 시: matchReferenceSlides() ← 매칭된 슬라이드 정보
```

### 4.2 공통 지시문 (BASE_INSTRUCTION)

```
당신은 프레젠테이션 기획 전문가입니다. 항상 한국어로 응답하세요.
응답은 구조화되고 간결하게 작성하세요. 제목과 불릿 포인트를 활용하세요.

중요: 응답의 마지막에 반드시 아래 형식으로 구조화된 데이터를 포함하세요:
<!--STRUCTURED_DATA
{JSON 데이터}
-->

이 구조화된 데이터는 시스템이 자동으로 파싱하여 UI에 표시합니다.
```

### 4.3 Step 0: 문서 분석 프롬프트

```
목적: RFI/RFP 문서에서 핵심 정보 추출
모델 온도: 0.3 (낮은 창의성, 정확한 추출)

추출 항목:
1. 핵심 요구사항 (Requirements)
2. 시스템 제약조건 (Constraints)
3. 이해관계자 (Stakeholders)
4. 연동 포인트 (Integration Points)
5. 전체 요약
6. KPI, 일정, 예산, 리스크 (있는 경우)

구조화 출력: {"type":"doc_analysis","data":{...}}
```

### 4.4 Step 1: 방향 설정 프롬프트

```
목적: 발표 맥락 분석 + 3개 방향 후보 생성
입력: 사용자의 자유 텍스트 + (선택) 문서 분석 결과 + 레퍼런스 패턴

추출할 맥락:
- topic, audience, goal, domain, problem, constraints, keywords, isTechnical

3개 방향 각각:
- approach: 접근법 이름 (예: "문제-해결 내러티브")
- narrative: 서사 흐름 (→ 기호로 구분)
- tone: 적절한 톤
- estimatedSlideCount: 예상 슬라이드 수

레퍼런스 연동:
- 레퍼런스의 섹션 흐름을 기반으로 방향 설정
- narrativeConnection을 참고하여 전체 내러티브 흐름 설계

구조화 출력: {"type":"direction_candidates","data":{"context":{...},"directions":[...]}}
```

### 4.5 Step 2: 슬라이드 기획 프롬프트

```
목적: 선택된 방향 기반 2~3개 구조 후보 생성
입력: 선택된 방향 + 전체 진행 상황 + 레퍼런스 패턴

각 구조 후보:
- title: 구조 제목
- sections: [{ sectionTitle, slideCount, purpose, keyPoints[] }]
- totalSlides: 총 슬라이드 수

레퍼런스 연동:
- 레퍼런스의 총 슬라이드 수 참고
- 각 슬라이드의 목적(purpose)과 콘텐츠 전략 참고

구조화 출력: {"type":"slide_structure","data":[...]}
```

### 4.6 Step 3: 콘텐츠 명세서 프롬프트

```
목적: 슬라이드별 상세 콘텐츠 명세서 자동 생성
입력: 선택된 구조 + 전체 진행 상황 + 레퍼런스 패턴

각 슬라이드 명세:
- slideNumber, sectionName, purpose
- keyMessage: 청중이 기억해야 할 한 줄
- requiredElements: 필수 포함 데이터/내용
- suggestedVisual: 시각화 제안 (아키텍처 청사진, 비교표, 흐름도 등)
- transitionNote: 다음 슬라이드로의 전환

레퍼런스 연동:
- 작성 톤과 불릿 스타일을 따라 명세 작성
- 콘텐츠 전략, 시각 요소, 문체 패턴 참고

구조화 출력: {"type":"content_spec","data":{...}}
```

### 4.7 Step 4: 슬라이드 제작 프롬프트

이것이 가장 복잡한 프롬프트이다. **슬라이드별로 반복 호출**되며:

```
목적: 개별 슬라이드의 3가지 디자인 후보 생성
입력: 해당 슬라이드의 콘텐츠 명세 + 이전 완성 슬라이드들 + 레퍼런스 패턴 + 매칭된 레퍼런스 슬라이드

슬라이드 컨텍스트:
- 현재 슬라이드 번호, 섹션, 목적, 핵심 메시지
- 필수 요소, 시각화 제안, 전환 노트
- 매칭된 레퍼런스 슬라이드의 디자인 의도 + 콘텐츠 전략

글쓰기 일관성:
- 이전 슬라이드의 불릿 포인트 샘플을 제시하여 문체 일관성 유지

각 후보:
- layout: title-slide | title-content | two-column | image-text | chart | diagram | section-divider | conclusion
- composition: 11종 CompositionVariant 중 선택
- 실제 완성된 텍스트 (bulletPoints, bodyText)
- speakerNotes

사용 가능한 구도: stack-vertical, side-by-side, hub-spoke, flow-horizontal, flow-vertical,
                 grid-cards, comparison-table, timeline, icon-list, center-highlight, default

구조화 출력: {"type":"slide_candidates","data":{"slideNumber":N,"candidates":[...]}}
```

### 4.8 프롬프트 전략의 핵심 인사이트

**1. 점진적 맥락 축적 (Progressive Context Building)**

각 Step에서 `buildContextBlock(state)`이 이전 단계의 모든 결정사항을 누적하여
LLM에게 전달한다. 이렇게 하면:
- Step 4에서 LLM은 Step 1의 방향, Step 2의 구조, Step 3의 명세를 모두 알고 있다
- 문서 분석 결과도 지속적으로 반영된다
- **일관성이 높은 프레젠테이션**이 만들어진다

**2. 자연어 + 구조화 데이터 동시 생성**

LLM이 사용자에게 보여줄 설명 텍스트와 시스템이 파싱할 JSON을 한 번의 호출로 동시에 생성한다.
이것은 Presenton의 순수 구조화 출력 방식과 PPTAgent의 순수 자연어 방식의 **하이브리드**이다.

**3. 레퍼런스 패턴 주입으로 "0에서 시작"하지 않음**

LLM에게 "프레젠테이션을 만들어줘"라고 하면 결과가 일관성 없고 품질이 낮다.
레퍼런스의 실제 패턴(섹션 흐름, 작성 스타일, 디자인 의도)을 주입하면
**검증된 패턴 위에서 새로운 콘텐츠를 생성**하게 되어 품질이 크게 향상된다.

**4. 글쓰기 일관성 유지**

Step 4에서 이전 완성 슬라이드의 불릿 포인트 샘플을 프롬프트에 포함하여,
슬라이드 간 문체 일관성을 유지한다:

```typescript
const lastSlide = state.completedSlides[state.completedSlides.length - 1];
const bulletSample = lastSlide.bulletPoints?.slice(0, 2).join(' / ') || '';
writingStyleReminder = `**글쓰기 일관성**: 이전 슬라이드의 문체 패턴을 유지하세요. 예시: "${bulletSample}"`;
```

---

## 5. 슬라이드 생성 로직

### 5.1 타입 시스템: SlideContent

```typescript
export interface SlideContent {
  slideNumber: number;
  title: string;
  layout: SlideLayout;            // 8종 레이아웃
  contentType: ContentType;       // bullets | paragraph | image | chart | diagram | mixed
  bulletPoints?: string[];
  bodyText?: string;
  imageDescription?: string;
  chartType?: 'bar' | 'pie' | 'line' | 'table';
  chartData?: Record<string, unknown>;
  mermaidCode?: string;           // Mermaid 다이어그램 코드
  speakerNotes: string;
  composition?: CompositionVariant; // 11종 시각적 구도
}
```

### 5.2 8종 슬라이드 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│                   8 Slide Layouts (16:9)                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ title-slide  │  │ title-content│  │ two-column   │           │
│  │              │  │ ┌──────────┐│  │ ┌────┐┌────┐│           │
│  │   TITLE      │  │ │ TITLE    ││  │ │LEFT││RGHT││           │
│  │   subtitle   │  │ ├──────────┤│  │ │    ││    ││           │
│  │              │  │ │  BODY    ││  │ │    ││    ││           │
│  │              │  │ │  (12")   ││  │ └────┘└────┘│           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ image-text   │  │ chart        │  │ diagram      │           │
│  │ ┌────┐┌────┐│  │ ┌──────────┐│  │ ┌──────────┐│           │
│  │ │IMG ││TEXT ││  │ │ CHART    ││  │ │ DIAGRAM  ││           │
│  │ │    ││    ││  │ │ (12")    ││  │ │ (12")    ││           │
│  │ └────┘└────┘│  │ └──────────┘│  │ └──────────┘│           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │section-divider│  │ conclusion   │                              │
│  │              │  │ ┌──────────┐│                              │
│  │   SECTION    │  │ │  BODY    ││                              │
│  │   TITLE      │  │ │  (12")   ││                              │
│  │              │  │ └──────────┘│                              │
│  └──────────────┘  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 11종 Composition Variant 시스템

이것은 PPT Agent의 **핵심 차별점** 중 하나이다. 동일한 콘텐츠를 다양한 시각적 구도로 표현할 수 있다:

```typescript
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
  | 'default';            // 기본 불릿 포인트
```

**각 Composition의 시각적 표현:**

```
grid-cards:          flow-horizontal:       hub-spoke:
┌────┐┌────┐        ┌──┐  ┌──┐  ┌──┐     ┌──┐
│ 01 ││ 02 │        │S1│→│S2│→│S3│         │  │
└────┘└────┘        └──┘  └──┘  └──┘   ┌──┤HUB├──┐
┌────┐┌────┐                            │  └──┘   │
│ 03 ││ 04 │                           ┌┴┐  ┌┴┐ ┌┴┐
└────┘└────┘                           │A│  │B│ │C│
                                       └─┘  └─┘ └─┘

timeline:            side-by-side:         icon-list:
─●──────●──────●─    ┌────┐│┌────┐        ● 항목 1
 S1     S2     S3    │LEFT│││RGHT│        ● 항목 2
 ┌──┐  ┌──┐  ┌──┐   │    │││    │        ● 항목 3
 │  │  │  │  │  │    └────┘│└────┘        ● 항목 4
 └──┘  └──┘  └──┘

center-highlight:    stack-vertical:       comparison-table:
                     ┌────────────┐        ┌──────┬──────┐
    ┌───┐           │  Layer 1   │        │ A    │ B    │
    │ 💡│           ├────────────┤        ├──────┼──────┤
    └───┘           │  Layer 2   │        │ val1 │ val2 │
   설명 텍스트       ├────────────┤        │ val3 │ val4 │
                     │  Layer 3   │        └──────┴──────┘
                     └────────────┘
```

### 5.4 자동 Composition 추론

LLM이 composition을 지정하지 않은 경우, 콘텐츠 특성에 따라 자동으로 추론한다:

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

### 5.5 SlideCandidate: 3안 선택 메커니즘

Step 4에서 각 슬라이드마다 LLM이 3가지 후보를 생성한다:

```typescript
export interface SlideCandidate {
  id: string;           // "cand-3-a", "cand-3-b", "cand-3-c"
  label: string;        // 후보 이름
  description: string;  // 후보 설명
  slide: SlideContent;  // 완성된 슬라이드 데이터
}

// 사용자가 선택하면:
usePipeline.confirmSlide(selectedCandidate.slide);
// → completedSlides에 추가
// → currentSlideIndex 증가
// → 다음 슬라이드 제작으로 진행
```

### 5.6 ContentSpecification: 콘텐츠 명세서

Step 3에서 생성되는 명세서는 Step 4의 **가이드라인** 역할을 한다:

```typescript
export interface ContentSpecification {
  title: string;
  subtitle?: string;
  totalSlides: number;
  narrativeArc: string;           // "문제 인식 → 현황 분석 → 해결책 → 기대효과"
  targetAudience: string;
  presentationGoal: string;
  slideSpecs: SlideSpec[];
}

export interface SlideSpec {
  slideNumber: number;
  sectionName: string;
  purpose: string;
  keyMessage: string;             // 청중이 기억해야 할 한 줄
  requiredElements: string[];     // 필수 포함 데이터/내용
  suggestedVisual?: string;       // 시각화 제안
  transitionNote: string;         // 다음 슬라이드로의 전환
}
```

---

## 6. 디자인 시스템

### 6.1 테마 아키텍처

```typescript
export interface SlideTheme {
  id: string;
  name: string;
  description: string;
  bg: string;           // CSS 배경 (gradient 또는 solid)
  bgAlt: string;        // 역전 배경 (title/section 슬라이드용)
  titleColor: string;   // 제목 텍스트 색상
  bodyColor: string;    // 본문 텍스트 색상
  mutedColor: string;   // 흐린 텍스트 색상
  accent: string;       // 주 강조색
  accentLight: string;  // 밝은 강조색 (카드 배경 등)
  decorBar: string;     // 장식 바 색상
  bulletColor: string;  // 불릿 포인트 색상
  slideNumColor: string;// 슬라이드 번호 색상
  cardBorder: string;   // 카드 테두리 색상
}
```

### 6.2 3종 프리셋 테마

| 테마 | ID | 특징 | 주 색상 | 강조색 |
|------|-----|------|---------|--------|
| 코퍼레이트 블루 | `corporate-blue` | 깔끔하고 전문적인 네이비 블루 | #f8fafc → #e2e8f0 | #2563eb |
| 다크 프리미엄 | `dark-premium` | 고급스러운 다크 테마, 골드 액센트 | #1a1a2e → #16213e | #f59e0b |
| 모던 그라데이션 | `modern-gradient` | 트렌디한 퍼플-블루 그라데이션 | #fafafa → #f0f0ff | #7c3aed |

### 6.3 장식 요소 시스템

```
일반 슬라이드:                        역전 슬라이드 (title/section):
┌─ accent bar (0.06" 높이)──────┐     ┌─ accent bar ──────────────┐
│█                              │     │                   ◯       │ ← 반투명 원(장식)
│█ (좌측 accent bar)            │     │                            │
│                               │     │                            │
│  Title                        │     │     TITLE                  │
│  ─── accent underline         │     │                            │
│                               │     │                            │
│  Body content                 │     │                            │
│                               │     │  ◯                        │ ← 반투명 원(장식)
│                           N   │     │                        N   │
└───────────────────────────────┘     └────────────────────────────┘
```

---

## 7. 차트/다이어그램/이미지 처리

### 7.1 Mermaid 다이어그램

Mermaid 코드는 **mermaid.ink 서비스**를 통해 PNG로 변환된다:

```typescript
// ppt/mermaid.ts
export function mermaidToImageUrl(mermaidCode: string): string {
  // Mermaid 코드 → base64 인코딩 → mermaid.ink URL 생성
  const encoded = Buffer.from(mermaidCode).toString('base64');
  return `https://mermaid.ink/img/${encoded}`;
}

export async function mermaidToBuffer(mermaidCode: string): Promise<Buffer> {
  const url = mermaidToImageUrl(mermaidCode);
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}
```

PPTX 생성 시:
```typescript
// generator.ts
if (content.mermaidCode) {
  const imgBuf = await mermaidToBuffer(content.mermaidCode);
  const base64 = imgBuf.toString('base64');
  slide.addImage({
    data: `image/png;base64,${base64}`,
    x: layout.body.x, y: layout.body.y,
    w: layout.body.w, h: layout.body.h,
    sizing: { type: 'contain', w: layout.body.w, h: layout.body.h },
  });
}
```

### 7.2 차트 렌더링

PptxGenJS의 네이티브 차트 기능을 사용한다:

```typescript
function applyChart(slide, content, body, theme) {
  const chartData = [{
    name: data.seriesName || '데이터',
    labels: data.labels || ['항목1', '항목2', '항목3'],
    values: data.values || [30, 50, 20],
  }];

  const chartTypeMap = {
    bar:  PptxGenJS.charts.BAR,
    pie:  PptxGenJS.charts.PIE,
    line: PptxGenJS.charts.LINE,
  };

  slide.addChart(chartTypeMap[content.chartType], chartData, {
    x: body.x, y: body.y, w: body.w, h: body.h,
    showTitle: false,
    showValue: true,
    chartColors: [theme.accent, theme.accentLight, theme.bodyColor],  // 테마 색상 적용
  });
}
```

지원 차트 유형:
- **Bar**: 가로 막대 차트
- **Pie**: 원형 차트
- **Line**: 선 차트

### 7.3 이미지 처리

현재 PPT Agent의 이미지 처리는 **간접적**이다:
- `imageDescription` 필드로 이미지 설명을 텍스트로 포함
- Mermaid 코드로 다이어그램을 자동 생성
- 차트 데이터로 차트를 자동 생성
- **직접 이미지 생성 (DALL-E 등)은 미구현** (→ 개선 방향 참고)

---

## 8. PPTX 내보내기

### 8.1 PptxGenJS 기반 생성기

```typescript
export async function generatePptx(plan: PresentationPlan): Promise<Buffer> {
  const pptx = new PptxGenJS();
  const theme = getThemeById(plan.selectedThemeId || SLIDE_THEMES[0].id);

  pptx.author = 'PPT Agent';
  pptx.title = plan.title;
  pptx.subject = plan.subtitle || '';
  pptx.layout = 'LAYOUT_WIDE';  // 16:9 (13.33" × 7.5")

  // 1. 표지 슬라이드 (항상 역전 배경)
  const titleSlide = pptx.addSlide();
  applyBackground(titleSlide, theme, true);
  applyDecorations(titleSlide, theme, true);

  // 2. 콘텐츠 슬라이드 (반복)
  for (const slideContent of plan.slides) {
    const slide = pptx.addSlide();
    await applySlideContent(slide, slideContent, theme);
  }

  // 3. Buffer로 출력
  return await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
}
```

### 8.2 슬라이드 렌더링 분기 로직

```
applySlideContent(slide, content, theme)
    │
    ├── title-slide?       → 역전 배경 + 중앙 제목 + 서브타이틀
    ├── section-divider?   → 역전 배경 + 중앙 제목
    │
    └── 일반 콘텐츠 슬라이드:
         │
         ├── mermaidCode?   → Mermaid PNG 삽입
         ├── chartType?     → applyChart() (Bar/Pie/Line)
         │
         └── composition 기반 렌더링:
              │
              ├── grid-cards        → renderGridCards()
              ├── flow-horizontal   → renderFlowHorizontal()
              ├── flow-vertical     → renderFlowVertical()
              ├── hub-spoke         → renderHubSpoke()
              ├── side-by-side      → renderSideBySide()
              ├── timeline          → renderTimeline()
              ├── icon-list         → renderIconList()
              ├── comparison-table  → renderComparisonTable()
              ├── center-highlight  → renderCenterHighlight()
              ├── stack-vertical    → renderStackVertical()
              └── default           → renderDefault() (불릿 포인트)
```

### 8.3 레이아웃 템플릿 포지션 (templates.ts)

8종 레이아웃의 정확한 위치 좌표 (인치 단위, 16:9 = 13.33" × 7.5"):

```typescript
const LAYOUTS = {
  'title-slide':     { title: {x:0.5, y:1.5, w:12.0, h:1.5}, body: {x:0.5, y:3.2, w:12.0, h:3.0} },
  'title-content':   { title: {x:0.5, y:0.3, w:12.0, h:0.8}, body: {x:0.5, y:1.5, w:12.0, h:5.5} },
  'two-column':      { title: {x:0.5, y:0.3, w:12.0, h:0.8}, body: {x:0.5, y:1.5, w:5.5,  h:5.5},
                       secondary: {x:6.5, y:1.5, w:5.5, h:5.5} },
  'image-text':      { title: {x:0.5, y:0.3, w:12.0, h:0.8}, body: {x:0.5, y:1.5, w:5.5,  h:5.5},
                       secondary: {x:6.5, y:1.5, w:5.5, h:5.5} },
  'chart':           { title: {x:0.5, y:0.3, w:12.0, h:0.8}, body: {x:0.5, y:1.5, w:12.0, h:5.5} },
  'diagram':         { title: {x:0.5, y:0.3, w:12.0, h:0.8}, body: {x:0.5, y:1.5, w:12.0, h:5.5} },
  'section-divider': { title: {x:0.5, y:2.5, w:12.0, h:1.5}, body: {x:0.5, y:4.2, w:12.0, h:2.0} },
  'conclusion':      { title: {x:0.5, y:0.3, w:12.0, h:0.8}, body: {x:0.5, y:1.5, w:12.0, h:5.5} },
};
```

### 8.4 폰트 전략

```typescript
const FONT_FAMILY = 'Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif';
```

한국어 최적화를 위해 CJK 폰트 스택을 사용한다:
- **Apple SD Gothic Neo**: macOS 기본 한국어 폰트
- **Malgun Gothic**: Windows 기본 한국어 폰트
- **Noto Sans KR**: 크로스 플랫폼 폴백
- **sans-serif**: 최종 폴백

---

## 9. 프론트엔드 UI/UX

### 9.1 2-Panel 레이아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Back]  Step 1: 방향 설정  ●──●──○──○──○   [Theme▼] [LLM▼]     │
├──────────────────────────┬──────────────────────────────────────────┤
│                          │                                          │
│    Chat Panel (45%)      │       Preview Panel (55%)                │
│                          │                                          │
│  ┌────────────────────┐  │  ┌────────────────────────────────────┐  │
│  │ 💬 사용자 메시지     │  │  │                                    │  │
│  └────────────────────┘  │  │   슬라이드 프리뷰                    │  │
│                          │  │   (선택한 테마 적용)                  │  │
│  ┌────────────────────┐  │  │                                    │  │
│  │ 🤖 AI 응답          │  │  │   [◀ 1/10 ▶]                      │  │
│  │ (스트리밍 중...)     │  │  │                                    │  │
│  └────────────────────┘  │  └────────────────────────────────────┘  │
│                          │                                          │
│  ┌────────────────────┐  │  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ 후보 선택 카드       │  │  │ 후보A │ │ 후보B │ │ 후보C │           │
│  │ (Option Cards)      │  │  └──────┘ └──────┘ └──────┘           │
│  └────────────────────┘  │                                          │
│                          │  ┌────────────────────────────────────┐  │
│  ┌────────────────────┐  │  │ [📥 PPT 다운로드]                   │  │
│  │ 입력창              │  │  └────────────────────────────────────┘  │
│  └────────────────────┘  │                                          │
├──────────────────────────┴──────────────────────────────────────────┤
│                  Resizable Divider (드래그 가능)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 주요 컴포넌트 구조

```
ChatContainer (메인 오케스트레이터)
├── StepIndicator
│   └── 5개 스텝 진행 상태 표시
├── ChatPanel
│   ├── MessageList
│   │   ├── UserMessage
│   │   └── AssistantMessage (Markdown 렌더링)
│   ├── OptionCards (후보 선택)
│   └── ChatInput
│       ├── 텍스트 입력
│       └── 파일 업로드 버튼
├── PreviewPanel
│   ├── SlidePreview (테마 적용 프리뷰)
│   ├── SlideNavigation (◀ N/M ▶)
│   └── ThemeSelector
└── SettingsBar
    ├── ThemeSelector (3종 테마)
    ├── LlmProviderSelector (Claude/OpenAI)
    └── DownloadButton
```

### 9.3 Hook 레이어 상세

5개 Custom Hook이 UI 로직을 관리한다:

| Hook | 역할 | 주요 상태 |
|------|------|----------|
| `useChat` | LLM 스트리밍 & 메시지 관리 | messages, isStreaming, abort |
| `usePipeline` | 파이프라인 상태 머신 | PipelineState, currentOptions |
| `usePptGeneration` | PPT 다운로드 핸들러 | isGenerating, error |
| `useReferences` | 레퍼런스 CRUD | references, isLoading |
| `useSlidePreview` | 슬라이드 프리뷰 내비게이션 | slides, currentIndex |

#### usePipeline 상태 머신 (핵심)

```typescript
// 주요 액션
setDocumentAnalysis(analysis)    // Step 0 → Step 1 전환
processStructuredData(data)      // LLM 응답에서 구조화 데이터 처리
selectOption(optionId)           // Step 1/2/4에서 후보 선택
confirmSlide(slide)              // Step 4에서 슬라이드 확정
advanceStep()                    // 다음 Step으로 진행
resetFromStep(stepId)            // 특정 Step부터 재시작
setSlideComposition(idx, comp)   // 완성 슬라이드의 composition 변경
setTheme(themeId)                // 테마 변경
```

### 9.4 모바일 대응

- 데스크톱: 좌우 2-Panel (리사이즈 가능)
- 모바일: 탭 전환 (Chat / Preview)
- Tailwind CSS 4 기반 반응형 디자인

---

## 10. 기술 스택

### 10.1 전체 의존성 맵

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PPT Agent Tech Stack                        │
│                                                                      │
│  ┌─── Framework ─────────┐  ┌─── LLM ──────────────────────────┐   │
│  │ Next.js 16.1.6        │  │ @anthropic-ai/sdk ^0.78.0        │   │
│  │ React 19.2.3          │  │ openai ^6.27.0                   │   │
│  │ TypeScript 5           │  │                                  │   │
│  │ Tailwind CSS 4         │  │ Claude Sonnet 4                  │   │
│  └───────────────────────┘  │ OpenAI/OpenRouter                │   │
│                              └──────────────────────────────────┘   │
│  ┌─── Document Parsing ──┐  ┌─── PPT Generation ───────────────┐   │
│  │ pdfjs-dist ^3.11.174  │  │ pptxgenjs ^4.0.1                │   │
│  │ pdf-parse ^1.1.1      │  │ mermaid ^11.13.0                │   │
│  │ mammoth ^1.11.0       │  │ html2canvas-pro ^2.0.2          │   │
│  │ jszip ^3.10.1         │  │ @napi-rs/canvas ^0.1.96         │   │
│  └───────────────────────┘  └──────────────────────────────────┘   │
│                                                                      │
│  ┌─── UI ────────────────┐  ┌─── Utilities ───────────────────┐    │
│  │ react-markdown ^10.1  │  │ nanoid ^5.1.6                  │    │
│  │ remark-gfm ^4.0.1    │  │ jspdf ^4.2.0                   │    │
│  │ next-themes ^0.4.6   │  │                                 │    │
│  └───────────────────────┘  └─────────────────────────────────┘    │
│                                                                      │
│  ┌─── Dev Dependencies ──────────────────────────────────────────┐  │
│  │ @tailwindcss/postcss ^4  │  eslint ^9  │  eslint-config-next │  │
│  │ @types/node ^20          │  @types/react ^19                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 핵심 설정

**Next.js 설정 (next.config.ts):**
```typescript
{
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
  serverActions: { bodySizeLimit: '100mb' },
}
```

**TypeScript 설정:**
```json
{
  "target": "ES2017",
  "lib": ["dom", "dom.iterable", "esnext"],
  "strict": true,
  "paths": { "@/*": ["./src/*"] }
}
```

**LLM 모델 설정:**
```typescript
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
export const OPENAI_MODEL = 'anthropic/claude-sonnet-4';  // OpenRouter 경유
export const DEFAULT_PROVIDER = 'openai';
```

### 10.3 환경변수

| 변수 | 용도 | 필수 여부 |
|------|------|----------|
| `ANTHROPIC_API_KEY` | Claude API 키 | provider가 claude일 때 |
| `OPENAI_API_KEY` | OpenAI/OpenRouter API 키 | provider가 openai일 때 |
| `OPENAI_BASE_URL` | OpenRouter 등 커스텀 엔드포인트 | 선택 |

---

## 11. 제한사항 & 약점

### 11.1 기능적 제한

| 제한사항 | 설명 | 심각도 |
|----------|------|--------|
| **이미지 생성 미지원** | DALL-E, Stable Diffusion 등 이미지 생성 API 미연동. 텍스트 설명으로만 표현 | 높음 |
| **웹 검색 미지원** | 실시간 데이터 수집 불가. 사용자가 직접 입력해야 함 | 중간 |
| **슬라이드 편집 미지원** | 생성 후 개별 슬라이드 수정 기능 없음. 재생성 필요 | 높음 |
| **다국어 제한** | 시스템 프롬프트가 한국어 고정. 영어/기타 언어 프레젠테이션 생성 시 한계 | 중간 |
| **로컬 LLM 미지원** | Ollama 등 로컬 모델 지원 없음. 항상 클라우드 API 필요 | 낮음 |
| **협업 기능 없음** | 멀티유저, 공유, 동시 편집 미지원 | 낮음 |
| **버전 관리 없음** | 이전 생성 결과 저장/복원 불가 | 중간 |

### 11.2 기술적 제한

| 제한사항 | 설명 | 심각도 |
|----------|------|--------|
| **JSON 파일 기반 저장소** | references.json 단일 파일에 저장. 동시성/확장성 한계 | 중간 |
| **서버 상태 없음** | 모든 세션 상태가 클라이언트 React state. 새로고침 시 소실 | 높음 |
| **PDF Vision 폴백 의존** | 이미지 기반 PDF는 Vision API를 호출해야 하므로 비용 증가 | 낮음 |
| **OpenAI PDF 미지원** | OpenAI 프로바이더에서 PDF 문서 블록을 네이티브 지원하지 않음 | 중간 |
| **PPTX 그래디언트 제한** | PptxGenJS의 그래디언트 지원이 제한적. 단색 폴백 | 낮음 |
| **Mermaid 외부 의존** | mermaid.ink 서비스에 의존. 서비스 다운 시 다이어그램 렌더링 실패 | 중간 |
| **테마 수 제한** | 3종 프리셋만 존재. 커스텀 테마 생성 불가 | 중간 |
| **발표자 모드 없음** | 슬라이드 프리뷰만 가능. 실제 발표 모드 미지원 | 낮음 |

### 11.3 프롬프트/LLM 관련 제한

| 제한사항 | 설명 | 심각도 |
|----------|------|--------|
| **구조화 출력 불안정** | HTML 주석 기반 파싱은 LLM이 포맷을 벗어나면 실패 | 중간 |
| **컨텍스트 윈도우 압박** | 모든 진행 상황 + 레퍼런스를 매번 프롬프트에 포함. Step 4 후반부 압박 | 높음 |
| **온도 고정** | Step별 최적 온도 조절 없이 기본 0.7 사용 (분석은 0.3) | 낮음 |
| **에러 복구 제한** | LLM이 잘못된 JSON을 반환하면 해당 Step을 재시도해야 함 | 중간 |

---

## 12. 경쟁사 대비 포지셔닝 & 개선 방향

### 12.1 3사 비교 테이블

| 특성 | PPT Agent (우리) | PPTAgent (ICIP-CAS) | Presenton |
|------|------------------|--------------------|-----------|
| **언어** | TypeScript/React | Python | Python + TypeScript |
| **플랫폼** | 웹 (Next.js) | CLI + Gradio Web UI | Electron 데스크톱 + Docker |
| **LLM** | Claude Sonnet 4, OpenAI | OpenAI 호환 (모든 모델) | OpenAI, Gemini, Claude, Ollama, Custom |
| **파이프라인** | 5-Step 대화형 | V1: 2-Stage, V2: 3-Phase | 10-Step (아웃라인→구조→콘텐츠→렌더링→PPTX) |
| **사용자 개입** | 매 Step에서 3안 중 선택 | 자동 (최소 개입) | SSE로 실시간, 편집 지원 |
| **레퍼런스** | 2단계 LLM 분석 + 프롬프트 주입 | ViT 이미지 임베딩 + 스키마 추출 | PPTX 템플릿 + HTML/React 변환 |
| **이미지 생성** | ❌ 미지원 | ❌ (V1), ✅ (V2: CodeExecutor) | ✅ DALL-E 3, Gemini, Pexels, ComfyUI |
| **차트** | ✅ PptxGenJS 네이티브 | ✅ Python 코드 실행 | ✅ Recharts (웹) + PPTX 변환 |
| **다이어그램** | ✅ Mermaid → PNG | ❌ (직접) | ✅ Mermaid (컴포넌트 내장) |
| **웹 검색** | ❌ 미지원 | ✅ (V2: Tavily, arXiv, Semantic Scholar) | ✅ OpenAI/Google/Anthropic 내장 검색 |
| **PPTX 출력** | ✅ PptxGenJS (프로그래매틱) | ✅ python-pptx (편집 기반) | ✅ DOM→스크린샷→python-pptx |
| **로컬 LLM** | ❌ | ❌ | ✅ Ollama |
| **슬라이드 편집** | ❌ | ❌ | ✅ (텍스트/구조/스케치 편집) |
| **자동 평가** | ❌ | ✅ PPTEval (3차원 자동 평가) | ❌ |
| **Composition** | ✅ 11종 시각적 구도 | ❌ (레퍼런스 구도 복제) | ✅ 템플릿 기반 |
| **테마** | 3종 프리셋 | 레퍼런스 PPT 색상 계승 | HTML/Tailwind 자유 디자인 |
| **데이터 저장** | JSON 파일 (임시) | 파일시스템 | SQLite (로컬) |

### 12.2 PPT Agent의 강점 (경쟁 우위)

**1. 5-Step 대화형 파이프라인**
- PPTAgent: 완전 자동화 (사용자 개입 최소)
- Presenton: 아웃라인→콘텐츠→렌더링 (선형 흐름)
- **우리**: 매 단계에서 3안 선택 → **사용자 의도를 정밀하게 반영**

**2. 11종 Composition Variant**
- 경쟁사에 없는 **시각적 구도 다양성**
- grid-cards, hub-spoke, timeline, flow-horizontal 등 풍부한 표현

**3. 콘텐츠 명세서 (Step 3)**
- 슬라이드 제작 전에 **명세서를 먼저 작성**하여 일관성 보장
- 경쟁사에 없는 독창적 단계

**4. TypeScript 풀스택**
- 타입 안전성으로 LLM 응답 파싱 오류 감소
- 프론트엔드-백엔드 동일 타입 시스템

**5. 레퍼런스 Step별 맞춤 주입**
- 방향 설정 시: 섹션 흐름 강조
- 슬라이드 제작 시: 디자인 의도 + 퍼지 매칭
- 각 단계에서 레퍼런스의 가장 관련성 높은 정보를 선별적으로 제공

### 12.3 PPT Agent의 약점 (개선 필요)

**1. 이미지 생성 부재** (vs Presenton의 DALL-E 3, Pexels, ComfyUI)
- 현재 텍스트 설명만 가능
- 시각적 임팩트 크게 감소

**2. 웹 검색 부재** (vs PPTAgent V2의 딥리서치, Presenton의 내장 검색)
- 실시간 데이터 수집 불가
- 사용자가 모든 정보를 직접 제공해야 함

**3. 슬라이드 편집 부재** (vs Presenton의 텍스트/스케치 편집)
- 생성 후 수정 불가, 전체 재생성 필요
- 사용자 경험 저하

**4. 세션 영속성 부재**
- 브라우저 새로고침 시 모든 진행 상태 소실
- 장시간 작업 시 리스크

**5. 자동 평가 부재** (vs PPTAgent의 PPTEval)
- 생성된 프레젠테이션의 품질을 객관적으로 측정할 방법 없음

### 12.4 개선 로드맵 (우선순위순)

| 우선순위 | 개선 항목 | 설명 | 참고 경쟁사 |
|---------|----------|------|-----------|
| 🔴 P0 | **세션 영속성** | LocalStorage 또는 DB 기반 상태 저장 | Presenton (SQLite) |
| 🔴 P0 | **슬라이드 편집** | 생성된 슬라이드의 텍스트/레이아웃 수정 기능 | Presenton |
| 🟠 P1 | **이미지 생성** | DALL-E, Gemini Flash, Pexels 통합 | Presenton |
| 🟠 P1 | **웹 검색** | Anthropic/OpenAI 내장 검색 도구 활용 | PPTAgent V2, Presenton |
| 🟡 P2 | **커스텀 테마** | 사용자가 색상/폰트를 직접 설정하는 테마 에디터 | Presenton |
| 🟡 P2 | **구조화 출력 안정화** | JSON Schema 기반 strict 모드 (response_format) | Presenton |
| 🟢 P3 | **로컬 LLM 지원** | Ollama OpenAI 호환 API 연동 | Presenton |
| 🟢 P3 | **자동 평가** | Content/Design/Coherence 3차원 평가 | PPTAgent V1 |
| 🟢 P3 | **MCP 서버** | Model Context Protocol 통합 | PPTAgent V2, Presenton |
| ⚪ P4 | **PDF 내보내기** | Puppeteer 또는 LibreOffice 기반 PDF 변환 | Presenton |
| ⚪ P4 | **발표자 모드** | 슬라이드쇼 모드 + 발표자 노트 표시 | - |
| ⚪ P4 | **협업 기능** | 실시간 공동 편집 (WebSocket) | - |

### 12.5 아키텍처적 개선 방향

**1. 구조화 출력 강화**
```
현재: <!--STRUCTURED_DATA{...}--> (HTML 주석 파싱)
개선: LLM의 response_format (JSON Schema strict 모드) 활용
참고: Presenton의 ensure_strict_json_schema() 패턴
```

**2. SSE 스트리밍 이벤트 분리**
```
현재: 단일 스트림으로 텍스트 + 구조화 데이터 혼합
개선: SSE 이벤트 타입 분리 ("outline", "structure", "slide", "complete")
참고: Presenton의 SSE 이벤트 모델
```

**3. 에이전트 자율성 강화**
```
현재: 5-Step 고정 파이프라인 (사용자가 매번 선택)
개선: V2의 환경 기반 리플렉션 도입 (렌더링 후 자동 품질 검증)
참고: PPTAgent V2의 reflect 도구
```

**4. 도구 체계 도입**
```
현재: LLM이 텍스트만 생성
개선: Tool Calling으로 웹 검색, 이미지 생성, 차트 데이터 조회 등 도구 활용
참고: PPTAgent V2의 MCP 기반 30+ 도구, Presenton의 Tool Calling
```

---

> **문서 작성 일자**: 2026-03-11
> **최종 분석 결론**: PPT Agent는 5-Step 대화형 파이프라인과 11종 Composition Variant이라는
> 독창적 강점을 가지고 있으나, 이미지 생성·웹 검색·슬라이드 편집 등의 핵심 기능이 부재하여
> 경쟁사 대비 기능 완성도가 낮은 상태이다. 세션 영속성과 편집 기능을 우선적으로 보완하고,
> 이미지 생성과 웹 검색을 통합하면 경쟁사 대비 차별화된 포지션을 확보할 수 있다.

# PPT Agent 자체 프로젝트 심층 분석 보고서 (Part 1/3)

> **분석 대상**: PPT Agent (Next.js/TypeScript) — "Wrtn Architecture Mapper"
> **버전**: 0.1.0
> **분석 일자**: 2026-03-17 (초판 2026-03-11 전면 개정)
> **분석 목적**: 프로젝트 아키텍처·구현 수준의 체계적 정리 및 경쟁사 대비 포지셔닝 분석
> **문서 언어**: 한국어 (기술 용어 영어 병기)

---

## 목차 (전체 3파트)

### Part 1 (본 문서)
1. [프로젝트 개요](#1-프로젝트-개요)
2. [전체 시스템 아키텍처](#2-전체-시스템-아키텍처)
3. [Architecture Mapper: 핵심 시스템](#3-architecture-mapper-핵심-시스템)
4. [레퍼런스 분석 시스템](#4-레퍼런스-분석-시스템)

### Part 2
5. Chat 파이프라인 (6-Step 레거시)
6. 프롬프트 전략
7. 슬라이드 생성 로직 & Composition 시스템
8. ExpressionFamily & 시각적 표현 시스템

### Part 3
9. PPTX 내보내기
10. 프론트엔드 UI/UX & 컴포넌트 아키텍처
11. 기술 스택 & 인프라
12. 제한사항 & 약점
13. 경쟁사 대비 포지셔닝 & 개선 방향

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정의

PPT Agent는 AI 기반 **엔터프라이즈 아키텍처 프레젠테이션 자동 생성 웹 애플리케이션**이다.

2026-03-11 초판 분석 이후 프로젝트의 핵심 방향이 전환되었다:

| 구분 | 초판 (2026-03-11) | 현재 (2026-03-17) |
|------|-------------------|-------------------|
| **메인 시스템** | Chat 기반 5-Step 파이프라인 | Architecture Mapper |
| **앱 타이틀** | PPT Agent | Wrtn Architecture Mapper |
| **진입점** | `/` → `/chat` | `/` → `/architecture` |
| **Chat 파이프라인** | 메인 | 레거시 (`/chat`, `/legacy` → `/chat`) |
| **파이프라인 단계** | 5-Step | 6-Step (디자인플랜 + 표현방식 추가) |
| **Architecture Mapper** | 미존재 | 핵심 시스템 (5개 API, 8개 라이브러리, 644줄 UI) |

현재 PPT Agent는 **두 가지 시스템**을 동시에 보유한다:

1. **Architecture Mapper** (메인): RFI/RFP 문서를 분석하여 고객 시스템 컴포넌트를 자동 추출하고, Wrtn 기술 모듈을 오버레이하여 아키텍처 슬라이드 1장을 즉시 생성
2. **Chat Pipeline** (레거시): 6단계 대화형 파이프라인을 통해 다슬라이드 프레젠테이션을 점진적으로 완성

- **프레임워크**: Next.js 16.1.6 (App Router)
- **언어**: TypeScript + React 19.2.3
- **LLM**: Claude Sonnet 4 / OpenAI (OpenRouter 호환)
- **출력**: .pptx (PptxGenJS)

### 1.2 핵심 기능 목록

| 기능 | 설명 | 시스템 |
|------|------|--------|
| RFI 아키텍처 추출 | 고객 RFI/RFP에서 시스템 컴포넌트 자동 추출 (30종 패턴 매칭 + LLM) | Architecture Mapper |
| Wrtn 모듈 오버레이 | 고객 컴포넌트에 Wrtn 기술 모듈 자동 매핑 (8종 매핑 규칙) | Architecture Mapper |
| 3종 레이아웃 스타일 | enterprise-grid, layered-flow, platform-stack 자동 선택/전환 | Architecture Mapper |
| SVG 실시간 프리뷰 | 베지에 커브 연결선 + 그룹/컴포넌트 배치 시각화 | Architecture Mapper |
| 인라인 편집 | 그룹 타이틀, 컴포넌트 라벨, 연결선 라벨 직접 수정 | Architecture Mapper |
| 레이아웃 변형 생성 | 3가지 대안 레이아웃 자동 생성 및 비교 | Architecture Mapper |
| 레퍼런스 제안서 시스템 | PPTX/PDF/DOCX를 2단계 LLM 분석하여 스타일·구조 학습 | 공통 |
| 6-Step 대화형 파이프라인 | 문서분석→자동기획→콘텐츠명세→디자인플랜→표현방식→슬라이드완성 | Chat Pipeline |
| 14종 ExpressionFamily | 시각적 표현 패밀리 기반 와이어프레임 추천 | Chat Pipeline |
| 11종 Composition Variant | grid-cards, hub-spoke, timeline 등 다양한 시각적 구도 | Chat Pipeline |
| 3종 디자인 테마 | Corporate Blue, Dark Premium, Modern Gradient | 공통 |
| 다중 문서 파싱 | PDF (Vision 폴백), DOCX (레이아웃 추출), PPTX (테마/레이아웃 추출) | 공통 |
| 차트/다이어그램 | Bar, Pie, Line 차트 + Mermaid 다이어그램 자동 렌더링 | Chat Pipeline |
| PPTX 내보내기 | PptxGenJS 기반 16:9 편집 가능 PPTX 생성 | 공통 |
| 다중 LLM 지원 | Claude (Anthropic SDK) + OpenAI/OpenRouter | 공통 |
| 실시간 스트리밍 | ReadableStream + SSE 기반 토큰/이벤트 실시간 전달 | 공통 |

### 1.3 프로젝트 규모

```
언어: TypeScript (100%)
프레임워크: Next.js 16.1.6 + React 19.2.3
소스 파일: 70+ 핵심 파일
총 소스 코드: ~8,500줄 이상

주요 파일별 규모:
  ppt/generator.ts .............. 1,095줄  (PPTX 생성 엔진)
  components/chat/ChatContainer.tsx .. 735줄  (채팅 오케스트레이터)
  app/architecture/page.tsx ........ 644줄  (아키텍처 매퍼 UI)
  components/preview/SlideRenderer.tsx . 609줄  (슬라이드 렌더러)
  lib/types.ts .................... 580줄  (중앙 타입 정의)
  components/preview/PreviewPanel.tsx .. 545줄  (프리뷰 패널)
  hooks/usePipeline.ts ............ 512줄  (파이프라인 상태 머신)
  llm/prompts.ts .................. 423줄  (시스템 프롬프트)
  reference/analyzer.ts ........... 414줄  (레퍼런스 분석기)
  document/pdfLayoutExtractor.ts ... 329줄  (PDF 레이아웃 추출)
  lib/architecture/extractor.ts .... 281줄  (아키텍처 컴포넌트 추출)
  document/docxLayoutExtractor.ts .. 268줄  (DOCX 레이아웃 추출)
  components/preview/ExpressionWireframeRenderer.tsx .. 249줄
  reference/promptBuilder.ts ....... 246줄  (프롬프트 주입 빌더)
  lib/architecture/overlayMapper.ts . 206줄  (Wrtn 모듈 매핑)
  document/pdfVisionExtractor.ts ... 200줄  (Vision API 추출)
  expression/recommender.ts ........ 177줄  (표현방식 추천)
  lib/architecture/layoutPlanner.ts . 167줄  (레이아웃 포지셔닝)
  pipeline/validator.ts ............ 158줄  (데이터 검증)
  hooks/useChat.ts ................. 154줄  (채팅 스트리밍)
  hooks/useReferences.ts ........... 153줄  (레퍼런스 CRUD)
  ppt/architectureExporter.ts ...... 152줄  (아키텍처 PPTX 내보내기)
  components/architecture/ArchitectureCanvas.tsx .. 141줄
  architecture/types.ts ............ 139줄  (아키텍처 전용 타입)
```

### 1.4 프로젝트 구조

```
PPT Agent/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── page.tsx                      # 루트 (/ → /architecture 리다이렉트)
│   │   ├── layout.tsx                    # 루트 레이아웃 (ThemeProvider, Toast)
│   │   ├── globals.css                   # Tailwind CSS 4 글로벌 스타일
│   │   ├── fonts/                        # Geist WOFF2 폰트 (sans + mono)
│   │   │
│   │   ├── architecture/                 # ★ 메인 시스템
│   │   │   └── page.tsx                  # 아키텍처 매퍼 UI (644줄)
│   │   │
│   │   ├── chat/                         # 레거시 채팅 파이프라인
│   │   │   └── page.tsx                  # ChatContainer 렌더링
│   │   ├── references/                   # 레퍼런스 관리
│   │   │   └── page.tsx                  # 레퍼런스 업로드/관리 UI (90줄)
│   │   ├── legacy/                       # 레거시 리다이렉트
│   │   │   └── page.tsx                  # /legacy → /chat
│   │   │
│   │   └── api/                          # API Routes (Server-side)
│   │       ├── architecture/             # ★ 아키텍처 매퍼 API
│   │       │   ├── extract/route.ts      # 고객 컴포넌트 추출 (40줄)
│   │       │   ├── overlay/route.ts      # Wrtn 모듈 오버레이 (33줄)
│   │       │   ├── render/route.ts       # 슬라이드 모델 렌더링 (31줄)
│   │       │   ├── refine/route.ts       # 레이아웃 변형 생성 (28줄)
│   │       │   └── export/route.ts       # PPTX 내보내기 (24줄)
│   │       ├── chat/route.ts             # LLM 스트리밍 채팅 (45줄)
│   │       ├── upload/route.ts           # 문서 업로드 & 파싱 (44줄)
│   │       ├── analyze-doc/route.ts      # 문서 LLM 분석 (24줄)
│   │       ├── generate-ppt/route.ts     # PPTX 생성 (27줄)
│   │       ├── references/               # 레퍼런스 CRUD
│   │       │   ├── route.ts              # GET/POST + SSE 스트리밍 (120줄+)
│   │       │   └── [id]/route.ts         # GET/DELETE 단건
│   │       └── mermaid-to-image/route.ts # Mermaid → PNG
│   │
│   ├── components/                       # React 컴포넌트
│   │   ├── architecture/                 # ★ 아키텍처 매퍼 컴포넌트
│   │   │   └── ArchitectureCanvas.tsx    # SVG 기반 슬라이드 프리뷰 (141줄)
│   │   ├── chat/                         # 채팅 UI
│   │   │   ├── ChatContainer.tsx         # 메인 오케스트레이터 (735줄)
│   │   │   ├── ChatInput.tsx             # 입력 UI + 파일 업로드 (143줄)
│   │   │   ├── MessageList.tsx           # 메시지 목록 + 자동 스크롤 (81줄)
│   │   │   ├── MessageBubble.tsx         # 사용자/AI 메시지 스타일링 (32줄)
│   │   │   └── MarkdownRenderer.tsx      # Markdown 렌더링 (89줄)
│   │   ├── preview/                      # 슬라이드 프리뷰
│   │   │   ├── PreviewPanel.tsx          # 다중 뷰 모드 프리뷰 패널 (545줄)
│   │   │   ├── SlideRenderer.tsx         # 11종 composition 렌더러 (609줄)
│   │   │   └── ExpressionWireframeRenderer.tsx  # 14종 와이어프레임 (249줄)
│   │   ├── reference/                    # 레퍼런스 관리 UI
│   │   │   ├── ReferencePanel.tsx        # 슬라이드 아웃 드로어 (143줄)
│   │   │   ├── ReferenceUploadForm.tsx   # 파일/텍스트 업로드 폼 (138줄)
│   │   │   ├── ReferenceList.tsx         # 레퍼런스 목록 (63줄)
│   │   │   └── ReferenceDetail.tsx       # 상세 분석 모달 (282줄)
│   │   ├── settings/                     # 설정 UI
│   │   │   ├── LlmProviderSelect.tsx     # Claude/OpenAI 선택 (21줄)
│   │   │   ├── ThemeSelector.tsx         # 테마 스와치 (45줄)
│   │   │   └── ThemeToggle.tsx           # 다크/라이트 모드 (31줄)
│   │   ├── options/                      # 후보 선택 카드
│   │   │   ├── OptionCard.tsx            # 선택 카드 (45줄)
│   │   │   └── OptionCardGroup.tsx       # 카드 그룹 + 확인 (50줄)
│   │   ├── steps/
│   │   │   └── StepIndicator.tsx         # 6단계 진행 표시기 (67줄)
│   │   └── ui/                           # 공통 UI
│   │       ├── Button.tsx                # variant/size 지원 (39줄)
│   │       ├── Card.tsx                  # 선택 가능한 카드 (33줄)
│   │       ├── Spinner.tsx               # 로딩 스피너 (11줄)
│   │       ├── Toast.tsx                 # 알림 시스템 (67줄)
│   │       └── PanelResizer.tsx          # 리사이즈 핸들 (64줄)
│   │
│   ├── hooks/                            # Custom React Hooks
│   │   ├── useChat.ts                    # 채팅 스트리밍 (154줄)
│   │   ├── usePipeline.ts               # 파이프라인 상태 머신 (512줄)
│   │   ├── usePptGeneration.ts           # PPT 다운로드 (49줄)
│   │   ├── useReferences.ts              # 레퍼런스 CRUD + SSE (153줄)
│   │   └── useSlidePreview.ts            # 프리뷰 네비게이션 (91줄)
│   │
│   └── lib/                              # 핵심 비즈니스 로직
│       ├── types.ts                      # 전체 타입 정의 (580줄)
│       ├── constants.ts                  # 상수 & 스텝 정의 (23줄)
│       ├── slideThemes.ts                # 3종 디자인 테마 (80줄)
│       ├── compositionOptions.ts         # Composition 옵션 빌더 (88줄)
│       │
│       ├── architecture/                 # ★ 아키텍처 매퍼 코어
│       │   ├── types.ts                  # 아키텍처 전용 타입 (139줄)
│       │   ├── extractor.ts              # 고객 컴포넌트 추출 (281줄)
│       │   ├── overlayMapper.ts          # Wrtn 모듈 매핑 (206줄)
│       │   ├── layoutPlanner.ts          # 위치 계산 엔진 (167줄)
│       │   ├── slideModelBuilder.ts      # 슬라이드 모델 조립 (29줄)
│       │   ├── referenceStyle.ts         # 레퍼런스 기반 스타일 (31줄)
│       │   ├── refine.ts                 # 레이아웃 변형 생성 (37줄)
│       │   └── llm.ts                    # JSON 생성 유틸 (47줄)
│       │
│       ├── llm/                          # LLM 통합 레이어
│       │   ├── factory.ts                # Provider 팩토리
│       │   ├── provider.ts               # LlmProvider 인터페이스 (12줄)
│       │   ├── claude.ts                 # Anthropic Claude 구현 (83줄)
│       │   ├── openai.ts                 # OpenAI/OpenRouter 구현 (84줄)
│       │   └── prompts.ts               # Step별 시스템 프롬프트 (423줄)
│       │
│       ├── document/                     # 문서 파싱 & 분석
│       │   ├── types.ts                  # DocumentAnalysis 타입
│       │   ├── parser.ts                 # PDF/DOCX/PPTX 텍스트 추출 (99줄)
│       │   ├── analyzer.ts               # LLM 기반 문서 분석
│       │   ├── pdfLayoutExtractor.ts     # PDF 레이아웃 추출 (329줄)
│       │   ├── pdfVisionExtractor.ts     # Vision API 폴백 (200줄)
│       │   ├── pdfToImage.ts             # PDF → JPEG 변환 (79줄)
│       │   ├── pptxLayoutExtractor.ts    # PPTX 레이아웃/테마 추출
│       │   └── docxLayoutExtractor.ts    # DOCX 레이아웃 추출 (268줄)
│       │
│       ├── pipeline/                     # 파이프라인 진행 로직
│       │   ├── steps.ts                  # 스텝 진행 & 완료 검증 (26줄)
│       │   ├── parser.ts                 # 구조화 데이터 파서 (29줄)
│       │   ├── validator.ts              # 데이터 검증 & 변환 (158줄)
│       │   └── slideProgress.ts          # 슬라이드 진행 추적 (52줄)
│       │
│       ├── ppt/                          # PPTX 생성
│       │   ├── generator.ts              # PptxGenJS 엔진 (1,095줄)
│       │   ├── architectureExporter.ts   # 아키텍처 PPTX 내보내기 (152줄)
│       │   ├── templates.ts              # 8종 레이아웃 포지션 (56줄)
│       │   └── mermaid.ts                # Mermaid → PNG (15줄)
│       │
│       ├── reference/                    # 레퍼런스 제안서
│       │   ├── store.ts                  # JSON 파일 기반 저장소
│       │   ├── analyzer.ts               # 2단계 LLM 분석 (414줄)
│       │   └── promptBuilder.ts          # 프롬프트 주입 빌더 (246줄)
│       │
│       └── expression/                   # 표현방식 추천
│           └── recommender.ts            # 역할/키워드 기반 추천 (177줄)
│
├── data/
│   └── references.json                   # 레퍼런스 영속 저장소
│
├── scripts/
│   └── canvas-shim.js                    # Canvas 폴리필
│
├── test/
│   └── data/                             # 테스트 PDF
│
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 2. 전체 시스템 아키텍처

### 2.1 시스템 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Next.js 16.1.6 (App Router)                          │
│                                                                              │
│  ┌─────────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │       프론트엔드 (React 19)          │  │       API Routes (Server)       │ │
│  │                                      │  │                                │ │
│  │  ★ Architecture Mapper               │  │  ★ /api/architecture/          │ │
│  │  ┌────────────────────────────────┐  │  │    ├── extract    POST        │ │
│  │  │ architecture/page.tsx (644줄)  │  │  │    ├── overlay    POST        │ │
│  │  │ ArchitectureCanvas.tsx (141줄) │  │  │    ├── render     POST        │ │
│  │  └────────────────────────────────┘  │  │    ├── refine     POST        │ │
│  │                                      │  │    └── export     POST        │ │
│  │  Chat Pipeline (레거시)              │  │                                │ │
│  │  ┌────────────────────────────────┐  │  │  /api/chat           POST     │ │
│  │  │ ChatContainer (735줄)          │  │  │  /api/upload         POST     │ │
│  │  │ ├─ MessageList                 │  │  │  /api/analyze-doc    POST     │ │
│  │  │ ├─ ChatInput                   │  │  │  /api/generate-ppt   POST     │ │
│  │  │ ├─ PreviewPanel (545줄)        │  │  │  /api/references     CRUD     │ │
│  │  │ └─ OptionCards                 │  │  │  /api/mermaid-to-image POST   │ │
│  │  └────────────────────────────────┘  │  │                                │ │
│  │                                      │  │                                │ │
│  │  Hooks Layer:                        │  │  Streaming:                    │ │
│  │  useChat ────────────────────────────── ReadableStream (토큰)           │ │
│  │  usePipeline (State Machine, 512줄)  │  │  SSE (레퍼런스 진행)           │ │
│  │  usePptGeneration                    │  │                                │ │
│  │  useReferences (SSE 파싱)            │  │                                │ │
│  │  useSlidePreview                     │  │                                │ │
│  └─────────────────────────────────────┘  └───────────┬────────────────────┘ │
│                                                        │                      │
│                                             ┌──────────▼──────────────────┐  │
│                                             │     Core Library (lib/)      │  │
│                                             │                              │  │
│                                             │  ★ architecture/             │  │
│                                             │    extractor (281줄)         │  │
│                                             │    overlayMapper (206줄)     │  │
│                                             │    layoutPlanner (167줄)     │  │
│                                             │    slideModelBuilder         │  │
│                                             │    referenceStyle            │  │
│                                             │    refine                    │  │
│                                             │                              │  │
│                                             │  llm/ (claude + openai)      │  │
│                                             │  document/ (파싱 + 분석)     │  │
│                                             │  pipeline/ (상태 + 검증)     │  │
│                                             │  ppt/ (생성 1,095줄 + 내보내기)│ │
│                                             │  reference/ (분석 + 주입)    │  │
│                                             │  expression/ (추천)          │  │
│                                             └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   외부 서비스        │
                          │                     │
                          │  Anthropic API      │
                          │  OpenAI/OpenRouter   │
                          │  mermaid.ink         │
                          └─────────────────────┘
```

### 2.2 이중 시스템 아키텍처

PPT Agent는 두 개의 독립적인 프레젠테이션 생성 시스템을 포함한다:

```
┌───────────────────────────────────────────────────────────────────────┐
│                        PPT Agent 이중 시스템                            │
│                                                                       │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐│
│  │  ★ Architecture Mapper      │  │  Chat Pipeline (레거시)          ││
│  │  (메인 시스템)               │  │                                  ││
│  │                              │  │                                  ││
│  │  목적: 아키텍처 슬라이드 1장  │  │  목적: 다슬라이드 프레젠테이션    ││
│  │                              │  │                                  ││
│  │  입력: RFI/RFP 문서          │  │  입력: 자연어 대화               ││
│  │       + 수동 메모             │  │       + 문서 업로드              ││
│  │       + 레퍼런스 선택         │  │       + 레퍼런스                 ││
│  │                              │  │                                  ││
│  │  흐름:                       │  │  흐름:                           ││
│  │  Extract → Overlay → Render  │  │  6-Step 파이프라인               ││
│  │  → Refine → Export           │  │  (문서→기획→명세→디자인→표현→완성)││
│  │                              │  │                                  ││
│  │  출력: 1장 아키텍처 PPTX     │  │  출력: N장 프레젠테이션 PPTX     ││
│  │  (편집 가능 도형)             │  │  (텍스트 + 차트 + 다이어그램)    ││
│  └─────────────────────────────┘  └─────────────────────────────────┘│
│                                                                       │
│  공유 인프라:                                                         │
│  ├── llm/ (Claude + OpenAI 프로바이더)                                │
│  ├── document/ (PDF/DOCX/PPTX 파싱)                                  │
│  ├── reference/ (레퍼런스 분석 & 저장)                                 │
│  ├── slideThemes.ts (3종 테마)                                        │
│  └── types.ts (공통 타입 580줄)                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.3 API 엔드포인트 전체 맵

| 엔드포인트 | 메서드 | 시스템 | 목적 | 입력 | 출력 | maxDuration |
|-----------|--------|--------|------|------|------|------------|
| `/api/architecture/extract` | POST | Arch | 고객 컴포넌트 추출 | rfiText, referenceIds, manualNotes, provider | ArchitectureExtractionResult | - |
| `/api/architecture/overlay` | POST | Arch | Wrtn 모듈 매핑 | extraction, referenceIds | ArchitectureOverlayPlan | - |
| `/api/architecture/render` | POST | Arch | 슬라이드 모델 렌더링 | overlayPlan, themeId | ArchitectureSlideModel | - |
| `/api/architecture/refine` | POST | Arch | 레이아웃 변형 | overlayPlan, targetScope, instruction | ArchitectureVariation[] | - |
| `/api/architecture/export` | POST | Arch | PPTX 내보내기 | ArchitectureSlideModel | PPTX binary | - |
| `/api/chat` | POST | Chat | LLM 스트리밍 | messages, stepId, pipelineState | ReadableStream | 60s |
| `/api/upload` | POST | 공통 | 문서 파싱 | file (multipart) | {filename, text, charCount} | 120s |
| `/api/analyze-doc` | POST | Chat | 문서 LLM 분석 | text, provider | DocumentAnalysis | 60s |
| `/api/generate-ppt` | POST | Chat | PPTX 생성 | PresentationPlan | PPTX binary | - |
| `/api/references` | GET | 공통 | 레퍼런스 목록 | - | ReferenceProposal[] | - |
| `/api/references` | POST | 공통 | 레퍼런스 생성 | file 또는 {name, text} | SSE → ReferenceProposal | 120s |
| `/api/references/[id]` | GET/DEL | 공통 | 단건 조회/삭제 | id | ReferenceProposal / {success} | - |
| `/api/mermaid-to-image` | POST | Chat | Mermaid→PNG | {mermaidCode} | PNG image | - |

---

## 3. Architecture Mapper: 핵심 시스템

### 3.1 개요

Architecture Mapper는 PPT Agent의 **현재 메인 시스템**으로, 고객의 RFI/RFP 문서를 분석하여
엔터프라이즈 아키텍처 슬라이드를 자동 생성한다. 기존의 대화형 파이프라인과 달리,
**5단계 자동화 파이프라인**으로 동작하며, 사용자는 결과물을 편집하고 변형을 비교할 수 있다.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Architecture Mapper 파이프라인                              │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Extract  │→│ Overlay  │→│ Render   │→│ Refine   │→│ Export   │     │
│  │          │  │          │  │          │  │ (선택)   │  │          │     │
│  │ RFI에서  │  │ Wrtn     │  │ 위치계산 │  │ 레이아웃 │  │ PPTX    │     │
│  │ 컴포넌트 │  │ 모듈     │  │ + 스타일 │  │ 변형     │  │ 다운로드 │     │
│  │ 추출     │  │ 매핑     │  │ 적용     │  │ 3가지    │  │          │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                                              │
│  extractor.ts   overlayMapper  layoutPlanner  refine.ts   architectureExp.  │
│  (281줄)        (206줄)        (167줄)                     (152줄)           │
│                 slideModelBuilder (29줄)                                      │
│                 referenceStyle (31줄)                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Step 1: Extract — 고객 컴포넌트 추출 (extractor.ts, 281줄)

RFI/RFP 문서에서 고객의 기존 시스템 컴포넌트를 **30종 패턴 매칭 + LLM 분석**으로 자동 추출한다.

#### 3.2.1 컴포넌트 타입 정의 (architecture/types.ts)

```typescript
export type ComponentType =
  | 'channel'           // 채널 (Genesys, IVR, 콜센터)
  | 'customer-system'   // 고객 시스템 (CRM, ERP, 포털)
  | 'integration'       // 연동 (API Gateway, 검색, 워크플로우)
  | 'data-store'        // 데이터 저장소 (DB, TIBERO, S3)
  | 'admin'             // 운영/관리 (Admin, Ops, 거버넌스)
  | 'analytics'         // 분석 (Dashboard, KPI, 리포트)
  | 'security'          // 보안 (SSO, LDAP, RBAC)
  | 'wrtn-module';      // Wrtn 기술 모듈
```

#### 3.2.2 30종 패턴 매칭 규칙 (inferComponentSpec)

```
Genesys / voice / 콜센터 / AICC / IVR / Zendesk  → channel      (high)
CRM / CS History / Order History / Portal / ERP    → customer-system (high)
검색 / Retrieval / API Gateway                     → integration  (medium)
Workflow / 결재 / Approval / Lifecycle              → integration  (medium)
Admin / 운영 / Deployment / Activation / Governance → admin        (medium)
Dashboard / Analytics / KPI / Reports               → analytics    (medium)
TIBERO / DB / Storage / Cache / S3                  → data-store   (medium)
SSO / LDAP / Security / RBAC / Auth                 → security     (medium)
```

#### 3.2.3 추출 결과 타입 (ArchitectureExtractionResult)

```typescript
{
  projectTitle: string             // 추론된 프로젝트 제목
  executiveSummary: string         // 핵심 요약
  customerProblems: string[]       // 고객 문제점
  decisionDrivers: string[]        // 의사결정 요인
  currentState: string             // AS-IS 상태
  targetState: string              // TO-BE 목표
  customerComponents: CustomerComponent[]  // 추출된 컴포넌트
  integrationPoints: string[]      // 연동 포인트 (6종 패턴)
  missingInformation: string[]     // 부족한 정보
}
```

#### 3.2.4 3중 폴백 전략

```
┌───────────────────────────────────────────────────────┐
│               추출 폴백 체인                             │
│                                                        │
│  1. LLM 분석 (12초 타임아웃)                            │
│     ├── 성공 → LLM 결과 사용                            │
│     └── 실패/타임아웃                                   │
│          │                                              │
│          ▼                                              │
│  2. 휴리스틱 패턴 매칭 (30종 규칙)                       │
│     ├── 문서 텍스트 + 수동 메모에서 패턴 탐지             │
│     └── uniqueByLabel()로 중복 제거 + 증거 병합           │
│          │                                              │
│          ▼                                              │
│  3. buildFallbackExtraction()                           │
│     ├── 부분 LLM 결과 + 휴리스틱 결과 병합               │
│     ├── inferProjectTitle()로 제목 추론                  │
│     └── inferIntegrationPoints()로 연동점 추론           │
└───────────────────────────────────────────────────────┘
```

핵심 함수들:
- `withTimeout<T>(promise, ms)`: Promise를 ms 내 미완료 시 null 반환
- `inferComponentSpec(label)`: 라벨에서 타입+중요도 추론 (30종 regex)
- `normalizeLabel(s)`: lowercase + trim + 공백 합치기
- `uniqueByLabel(arr)`: 정규화 라벨로 중복 제거, 증거 병합, 중요도 업그레이드
- `heuristicComponents(text, manualNotes)`: 전체 텍스트에 30종 규칙 적용
- `mergeManualComponents(heuristic, manual)`: 수동 메모로 보강

### 3.3 Step 2: Overlay — Wrtn 모듈 매핑 (overlayMapper.ts, 206줄)

고객 컴포넌트를 분석하여 **Wrtn 기술 모듈을 자동 매핑**하고, 아키텍처 그룹과 연결선을 생성한다.

#### 3.3.1 9종 Wrtn 모듈

| 모듈 ID | 모듈명 | 매핑 조건 |
|---------|--------|-----------|
| stt | STT | voice/콜센터 컴포넌트 존재 시 |
| intent-engine | Intent Engine | voice/search/규정 관련 존재 시 |
| policy-retrieval | Policy Retrieval | 규정/문서 관련 존재 시 |
| agent-orchestrator | Agent Orchestrator | genesys/crm/고객 관련 또는 폴백 |
| workflow-engine | Workflow Engine | workflow/승인 관련 존재 시 |
| rag-search | RAG Search | integration + 규정/문서/검색 존재 시 |
| analytics-dashboard | Analytics Dashboard | analytics 타입 존재 시 |
| admin-console | Admin Console | admin/운영 관련 존재 시 |
| security-layer | Security Layer | security 타입 존재 시 |

#### 3.3.2 6종 아키텍처 그룹

```
┌──────────────────────────────────────────────────────────┐
│  group-input      : 입력 채널 (channel 타입)              │
│  group-customer   : 고객 시스템 (customer-system 타입)     │
│  group-wrtn       : Wrtn 핵심 (모든 활성 Wrtn 모듈)       │
│  group-ops        : 운영 (admin + security 타입)           │
│  group-analytics  : 분석 (analytics 타입)                 │
│  group-data       : 데이터 (data-store + integration 타입) │
└──────────────────────────────────────────────────────────┘
```

#### 3.3.3 레이아웃 스타일 자동 선택

```typescript
function inferLayoutStyle(extraction): LayoutStyle {
  if (customerComponents.length >= 8) return 'enterprise-grid';  // 복잡한 시스템
  if (integrationPoints.length >= 3)  return 'layered-flow';     // 연동 중심
  return 'platform-stack';                                        // 기본
}
```

#### 3.3.4 연결선 생성 로직

각 고객 컴포넌트 → 매핑된 Wrtn 모듈로 `request` 또는 `data` 흐름 연결선을 자동 생성한다.
analytics-dashboard는 추가로 group-analytics 앵커 포인트에 `event` 흐름을 연결한다.

### 3.4 Step 3: Render — 슬라이드 모델 렌더링

#### 3.4.1 레이아웃 포지셔닝 (layoutPlanner.ts, 167줄)

100x100 좌표 공간에서 그룹과 컴포넌트의 위치를 계산한다.

**3종 레이아웃별 그룹 포지션:**

```
enterprise-grid (기본):                   layered-flow:
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│ [input 3,3,20,12]                │     │ [input 2,5,14,35]                │
│         [customer 25,3,30,25]    │     │        [customer 18,5,18,35]     │
│ [wrtn-core 3,32,55,35]          │     │ [wrtn-core 38,5,22,55]          │
│      [ops 60,3,37,25]           │     │        [ops 62,5,18,20]         │
│ [analytics 60,32,37,15]         │     │        [analytics 62,27,18,15]  │
│ [data 3,70,94,25]               │     │ [data 2,65,96,30]               │
└──────────────────────────────────┘     └──────────────────────────────────┘

platform-stack:
┌──────────────────────────────────┐
│ [input 2,2,50,12]                │
│ [customer 2,17,30,28]            │
│      [wrtn-core 34,17,64,50]     │
│ [ops 2,48,30,22]                 │
│ [analytics 2,73,48,24]           │
│ [data 52,70,46,27]               │
└──────────────────────────────────┘
```

**컴포넌트 배치 알고리즘 (layoutItems):**
```typescript
function layoutItems(n: number, box: Box): Position[] {
  // N개 아이템을 box 내부에 균등 배치
  // cols = ceil(sqrt(n)), rows = ceil(n/cols)
  // 각 아이템의 w/h 계산 후 패딩 적용
  // 반환: {x, y, w, h}[]
}
```

**베지에 커브 연결선:**
4-포인트 L-자형 경로: 출발 앵커 → 중간 X → 중간 Y → 도착 앵커

#### 3.4.2 스타일 프로필 (referenceStyle.ts, 31줄)

레퍼런스의 테마 색상을 기반으로 다이어그램 스타일 프로필을 생성:

```typescript
interface DiagramStyleProfile {
  titleColor: string;          // #111827 (폴백)
  subtitleColor: string;       // #4b5563
  backgroundColor: string;     // light/dark 추론
  groupFillColor: string;
  groupStrokeColor: string;
  customerFillColor: string;   // 고객 컴포넌트 색상
  wrtnFillColor: string;       // Wrtn 모듈 색상
  sharedFillColor: string;     // 공유/데이터 색상
  connectionColor: string;
  legendStyle: 'dots' | 'badges';
  density: 'compact' | 'balanced' | 'spacious';
}
```

밀도(density) 추론:
- `compact`: 15+ 슬라이드 레퍼런스
- `balanced`: 8~14 슬라이드
- `spacious`: 7 이하

#### 3.4.3 슬라이드 모델 조립 (slideModelBuilder.ts, 29줄)

```typescript
function buildArchitectureSlideModel(overlayPlan, themeId?) {
  const styleProfile = buildDiagramStyleProfile(references);
  const positioned = buildPositionedModel(overlayPlan);
  return {
    title: overlayPlan.extraction.projectTitle,
    subtitle: overlayPlan.extraction.executiveSummary,
    layoutStyle: overlayPlan.layoutStyle,
    themeId,
    styleProfile,
    groups: positioned.groups,          // PositionedGroup[]
    components: positioned.components,  // PositionedComponent[]
    connections: positioned.connections, // PositionedConnection[]
    legend: [
      { label: 'Customer Systems', colorToken: 'customer' },
      { label: 'Wrtn Technology', colorToken: 'wrtn' },
      { label: 'Shared / Data', colorToken: 'shared' },
    ],
  };
}
```

### 3.5 Step 4: Refine — 레이아웃 변형 (refine.ts, 37줄)

3가지 레이아웃 스타일을 로테이션하여 대안을 자동 생성:

```
LAYOUT_ROTATION = ['enterprise-grid', 'layered-flow', 'platform-stack']

기준안 (idx 0): 현재 레이아웃
대안 A (idx 1): 다음 레이아웃
대안 B (idx 2): 그 다음 레이아웃
```

그룹 범위 리파인 시: 해당 그룹 타이틀에 "Optimized" 또는 "Focused" 접미사 추가

### 3.6 Step 5: Export — PPTX 내보내기 (architectureExporter.ts, 152줄)

PptxGenJS를 사용하여 편집 가능한 PPTX 도형으로 내보낸다:

```
좌표 변환: 100% → 인치 (13.333" × 7.5" = 16:9)
  toInchX(pct) = pct / 100 * 13.333
  toInchY(pct) = pct / 100 * 7.5
```

내보내기 요소:
- 배경색 (스타일 프로필 기반)
- 제목 텍스트 (24pt, Arial, 볼드)
- 부제 텍스트 (11pt, 선택적)
- 그룹 사각형 (1.2pt 테두리, 15% 투명도 채우기) + 타이틀 (11pt 볼드)
- 컴포넌트 둥근 사각형 (0.8pt 테두리) + 라벨 (9pt, 중앙 정렬)
- 연결선 (1pt, 삼각형 화살표)
- 범례 (0.12in 원 + 8pt 라벨)

### 3.7 프론트엔드 UI 흐름 (architecture/page.tsx, 644줄)

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Architecture Mapper UI 흐름                          │
│                                                                      │
│  Step 1: 입력                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ☑ 레퍼런스 선택 (체크박스)                                       │  │
│  │ 📄 RFI 업로드 (드래그 앤 드롭) 또는 텍스트 입력                   │  │
│  │ 📝 수동 메모 (고객 시스템 보충)                                   │  │
│  │ [기술 추출 버튼] [빠르게 1장 만들기 버튼]                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  Step 2: 추출 결과 검토                                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 프로젝트 제목, 요약, 문제점, 의사결정 요인                         │  │
│  │ AS-IS 상태, TO-BE 목표                                          │  │
│  │ 추출된 컴포넌트 목록 (타입, 중요도, 출처 증거)                     │  │
│  │ 연동 포인트, 부족 정보                                           │  │
│  │ [Wrtn 오버레이 버튼]                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  Step 3: Wrtn 모듈 오버레이                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Wrtn 모듈 목록 (토글 ON/OFF + 매핑 근거)                         │  │
│  │ 테마 선택 (3종 그리드)                                           │  │
│  │ [슬라이드 만들기 버튼]                                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  Step 5: 편집 & 내보내기                                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ★ ArchitectureCanvas (SVG 실시간 프리뷰)                        │  │
│  │ 리파인 범위 선택 (전체 레이아웃 / 개별 그룹)                       │  │
│  │ 그룹 타이틀 인라인 편집                                           │  │
│  │ 컴포넌트 라벨 인라인 편집                                         │  │
│  │ 연결선 라벨 인라인 편집                                           │  │
│  │ [변형 보기 버튼] → 3가지 대안 갤러리                               │  │
│  │ [PPTX 다운로드 버튼]                                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

주요 상태 변수:
- `provider`: 'claude' | 'openai'
- `selectedReferenceIds`: string[] (선택된 레퍼런스)
- `rfiText`: string (RFI 문서 텍스트)
- `manualNotes`: string (수동 보충 메모)
- `themeId`: string (선택된 테마)
- `extraction`: ArchitectureExtractionResult | null
- `overlayPlan`: ArchitectureOverlayPlan | null
- `slideModel`: ArchitectureSlideModel | null
- `variations`: ArchitectureVariation[]
- `selectedScope`: string (리파인 대상)

### 3.8 SVG 프리뷰 (ArchitectureCanvas.tsx, 141줄)

좌표계: 0~100% 기반 CSS 절대 위치

렌더링 레이어:
1. **배경**: backgroundColor + cardBorder 테두리
2. **상단 장식 바**: decorBar 그라디언트 (1.5px)
3. **제목**: 2.2vw + 부제 0.9vw (좌측 정렬)
4. **범례**: 우측 상단 (0.7vw 원 + 라벨)
5. **SVG 연결선**: 스트로크 패스 + 화살표 원 (0.35px, 0.32r)
6. **그룹**: 둥근 사각형 + 타이틀 헤더
7. **컴포넌트**: 둥근 사각형 + 중앙 볼드 텍스트

색상 토큰 매핑:
- `wrtn` → wrtnFillColor (초록 계열)
- `shared` → sharedFillColor (파란 계열)
- `analytics` → groupFillColor
- 기본 → customerFillColor (회색 계열)

---

## 4. 레퍼런스 분석 시스템

### 4.1 개요

PPT Agent의 레퍼런스 제안서 시스템은 기존 프레젠테이션 문서(PPTX/PDF/DOCX/텍스트)를
분석하여 디자인 패턴, 작성 스타일, 구조를 학습한다. 분석 결과는 **두 가지 방식**으로 활용된다:

1. **Architecture Mapper**: 레퍼런스의 테마 색상 → DiagramStyleProfile로 변환하여 슬라이드 스타일링
2. **Chat Pipeline**: 분석 결과를 매 LLM 프롬프트에 동적 주입하여 스타일 일관성 확보

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
│  │    ├── EMU → % 좌표 변환 (9144000 × 6858000)         │            │
│  │    ├── shape별 유형/위치/크기/색상/폰트 추출            │            │
│  │    ├── 테마 색상 스킴 추출 (theme1.xml: dk1~accent6)  │            │
│  │    ├── 폰트 추출 (majorFont, minorFont)               │            │
│  │    └── 슬라이드별 composition 요약                    │            │
│  │                                                      │            │
│  │  PDF → 이중 추출 전략                                 │            │
│  │    경로 A: pdfLayoutExtractor.ts (329줄)              │            │
│  │      ├── pdfjs-dist로 텍스트 아이템 추출               │            │
│  │      ├── groupTextItems(): 1.8x 폰트 높이 기준 그룹핑 │            │
│  │      ├── classifyBlock(): textbox/table 분류           │            │
│  │      └── 3% 미만 크기 블록 필터링                      │            │
│  │    경로 B: pdfLayoutExtractor.extractPdfLayoutsViaVision() │       │
│  │      ├── pdfToImage.ts로 JPEG 변환 (scale 1.5, 144dpi)│            │
│  │      ├── 3페이지 배치로 Vision API 호출                │            │
│  │      └── 다이어그램을 개별 shape으로 분해 지시           │            │
│  │                                                      │            │
│  │  DOCX → docxLayoutExtractor.ts (268줄)               │            │
│  │    ├── mammoth HTML 출력 파싱                         │            │
│  │    ├── H1/H2로 페이지 분리                            │            │
│  │    ├── 표/리스트/제목/본문 shape 생성                  │            │
│  │    └── 가상 위치 계산 (y=5%부터 누적)                  │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                         │                                            │
│                         ▼                                            │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ Step 2: LLM 2단계 분석 (Promise.all 병렬 실행)       │            │
│  │                                                      │            │
│  │  Level 1: analyzeBasicPatterns()                     │            │
│  │    ├── sectionFlow: 섹션 흐름 패턴 (표지→목차→...)    │            │
│  │    ├── slidePatterns: 레이아웃/밀도/차트 유무 per 슬라이드│           │
│  │    ├── writingStyle:                                 │            │
│  │    │   ├── tone: 문체 톤                              │            │
│  │    │   ├── sentencePatterns: 문장 구조 패턴            │            │
│  │    │   ├── commonPhrases: 자주 쓰는 표현              │            │
│  │    │   └── bulletStyle: 불릿 포인트 스타일             │            │
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
│  │                                                      │            │
│  │  컨텍스트 길이 초과 대응: 점진적 축소 재시도             │            │
│  │    limits = [20000, 10000, 5000] 글자수               │            │
│  │    JSON 파싱 실패 시: 잘린 JSON 복구 시도              │            │
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

### 4.2 문서 파싱 상세 (document/)

#### 4.2.1 기본 텍스트 추출 (parser.ts, 99줄)

```typescript
// 라우팅
parseDocument(buffer, 'pdf')  → parsePdf()   // pdfjs-dist 레거시 빌드
parseDocument(buffer, 'docx') → parseDocx()  // mammoth.extractRawText()
parseDocument(buffer, 'pptx') → parsePptx()  // JSZip + XML <a:t> 태그

// PPTX 특수: 슬라이드별 텍스트 분리
parsePptxSlides(buffer): string[]  // slide1.xml, slide2.xml, ... 순차 파싱
```

#### 4.2.2 PDF Vision 폴백 (pdfVisionExtractor.ts, 200줄)

이미지 기반 PDF(텍스트 <50자)를 처리하는 3경로 분기:

```
provider === 'claude'?
  → extractViaClaudePdf(): PDF를 base64로 네이티브 document 블록 전송

ANTHROPIC_API_KEY 있음?
  → Claude로 우선 시도 (PDF 네이티브 지원이 더 정확)

그 외:
  → extractViaImageVision():
    ├── pdfPagesToImages()로 JPEG 변환 (scale 1.5)
    ├── 5페이지 배치로 Vision API 호출
    └── "--- 페이지 N ---" 구분자로 결과 파싱
```

#### 4.2.3 PPTX 레이아웃 추출 (pptxLayoutExtractor.ts)

```typescript
interface SlideShape {
  type: 'textbox' | 'image' | 'chart' | 'table' | 'diagram' | 'shape' | 'group' | 'other';
  name: string;
  position: { x: number; y: number; w: number; h: number };  // 0~100%
  text?: string;
  subType?: string;
  childCount?: number;
  fillColor?: string;     // hex
  fontFace?: string;
  fontSize?: number;       // pt
}

// EMU → % 좌표 변환
const SLIDE_WIDTH_EMU  = 9144000;  // 16:9 너비
const SLIDE_HEIGHT_EMU = 6858000;  // 16:9 높이

// 테마 추출
interface ReferenceThemeInfo {
  primaryColor: string;        // dk1
  secondaryColor: string;      // dk2
  accentColors: string[];      // accent1~6
  fontHeading: string;         // Latin + EA
  fontBody: string;
  backgroundStyle: string;     // solid / gradient / image
}
```

### 4.3 프롬프트 빌더 (promptBuilder.ts, 246줄)

분석된 레퍼런스는 **모든 Step의 LLM 프롬프트에 자동 주입**된다:

```typescript
// 주요 함수
buildReferenceBlock(analyses)         // 단일/다중 레퍼런스 통합 블록 생성
buildStepSpecificHint(stepId, analyses)  // Step별 맞춤 힌트
matchReferenceSlides(sectionName, analyses)  // 퍼지 매칭

// Step별 강조점
Step 1 (자동기획): 섹션 흐름 + narrativeConnection
Step 2 (구조기획): 슬라이드 수 + purpose/strategy
Step 3 (콘텐츠명세): 작성 톤 + 불릿 스타일
Step 4 (표현방식): 디자인 의도 + 시각 요소 + 레이아웃 청사진
```

### 4.4 SSE 스트리밍 진행 (references/route.ts)

레퍼런스 업로드는 SSE(Server-Sent Events)로 실시간 진행 상황을 전달한다:

```
data: {"type":"progress","detail":"파일 읽기 완료"}
data: {"type":"progress","detail":"텍스트 추출 중..."}
data: {"type":"progress","detail":"레이아웃 청사진 추출 중..."}
data: {"type":"progress","detail":"LLM 분석 중..."}
data: {"type":"progress","detail":"저장 중..."}
data: {"type":"result","data":{...ReferenceProposal...}}
// 또는
data: {"type":"error","message":"분석 실패: ..."}
```

### 4.5 레퍼런스 시스템의 이중 활용

```
                     ┌──────────────────┐
                     │ ReferenceProposal │
                     │   (분석 결과)      │
                     └────────┬─────────┘
                              │
                 ┌────────────┼────────────┐
                 │                          │
                 ▼                          ▼
     Architecture Mapper              Chat Pipeline
     ┌──────────────────┐     ┌──────────────────────────┐
     │ referenceStyle.ts │     │ promptBuilder.ts          │
     │                   │     │                           │
     │ themeInfo 추출    │     │ buildReferenceBlock()     │
     │ → DiagramStyle    │     │ buildStepSpecificHint()   │
     │   Profile 생성    │     │ matchReferenceSlides()    │
     │                   │     │                           │
     │ 색상/밀도/범례    │     │ 모든 Step 프롬프트에       │
     │ 스타일 결정       │     │ 패턴·스타일·구조 주입      │
     └──────────────────┘     └──────────────────────────┘
```

---

> **Part 1 끝** — Part 2에서는 Chat 파이프라인, 프롬프트 전략, 슬라이드 생성 로직, ExpressionFamily 시스템을 다룹니다.

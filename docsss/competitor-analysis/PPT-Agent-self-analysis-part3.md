# PPT Agent 자체 프로젝트 심층 분석 보고서 (Part 3/3)

> **분석 대상**: PPT Agent (Next.js/TypeScript) — "Wrtn Architecture Mapper"
> **분석 일자**: 2026-03-17

---

## 9. PPTX 내보내기

### 9.1 이중 내보내기 시스템

PPT Agent는 두 개의 독립적인 PPTX 내보내기 시스템을 보유한다:

| 시스템 | 파일 | 용도 | 출력 | 줄 수 |
|--------|------|------|------|-------|
| Architecture Exporter | `ppt/architectureExporter.ts` | 아키텍처 슬라이드 1장 | 편집 가능 도형 | 152줄 |
| Chat Pipeline Generator | `ppt/generator.ts` | 다슬라이드 프레젠테이션 | 텍스트+차트+다이어그램 | 1,095줄 |

### 9.2 Architecture Exporter (architectureExporter.ts, 152줄)

아키텍처 슬라이드 모델을 **편집 가능한 도형**으로 내보낸다:

```
좌표 변환 (100% → 인치):
  toInchX(pct) = pct / 100 × 13.333"
  toInchY(pct) = pct / 100 × 7.5"

내보내기 요소:
  1. 배경색 (styleProfile.backgroundColor)
  2. 제목 (24pt, Arial, 볼드)
  3. 부제 (11pt, 선택적)
  4. 그룹 사각형 (1.2pt 테두리, 15% 투명도 채우기)
  5. 그룹 타이틀 (11pt, 볼드)
  6. 컴포넌트 둥근 사각형 (0.8pt 테두리, rectRound)
  7. 컴포넌트 라벨 (9pt, 중앙 정렬, 수직 중앙)
  8. 연결선 (1pt, 삼각형 화살표 endArrowType)
  9. 범례 (0.12in 원 + 8pt 라벨)
```

색상 토큰 매핑 (colorForToken):
```
wrtn     → #059669 (에메랄드 그린)
shared   → #2563eb (블루)
analytics → #8b5cf6 (퍼플)
customer → #6b7280 (그레이)
```

**핵심 특징**: 모든 요소가 PowerPoint 네이티브 도형으로 내보내지므로, 사용자가 PowerPoint에서 직접 편집(위치 이동, 텍스트 수정, 색상 변경) 가능.

### 9.3 Chat Pipeline Generator (generator.ts, 1,095줄)

다슬라이드 프레젠테이션을 생성하는 **핵심 엔진**이다:

#### 9.3.1 전체 구조

```typescript
async function generatePptx(plan: PresentationPlan): Promise<Buffer> {
  const pptx = new PptxGenJS();
  const theme = getThemeById(plan.selectedThemeId);

  pptx.author = 'PPT Agent';
  pptx.title = plan.title;
  pptx.layout = 'LAYOUT_WIDE';  // 16:9 (13.33" × 7.5")

  // 1. 표지 슬라이드 (역전 배경)
  const titleSlide = pptx.addSlide();
  applyBackground(titleSlide, theme, true);
  applyDecorations(titleSlide, theme, true);

  // 2. 콘텐츠 슬라이드 (반복)
  for (const slideContent of plan.slides) {
    const slide = pptx.addSlide();
    await applySlideContent(slide, slideContent, theme);
  }

  return await pptx.write({ outputType: 'nodebuffer' });
}
```

#### 9.3.2 슬라이드 렌더링 분기

```
applySlideContent(slide, content, theme)
    │
    ├── title-slide?       → 역전 배경 + 중앙 제목 + subtitle + keynote
    ├── section-divider?   → 역전 배경 + 중앙 제목
    │
    └── 일반 콘텐츠 슬라이드:
         │
         ├── subtitle?     → 서브타이틀 렌더링 (12pt, muted)
         ├── keyMessage?   → 콜아웃 박스 (accent 좌측 바 + 배경)
         ├── mermaidCode?  → Mermaid PNG 삽입 (mermaidToBuffer)
         ├── chartType?    → applyChart() (Bar/Pie/Line)
         │
         └── composition 기반 렌더링 (applyComposition):
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
         │
         ├── secondaryPoints? → 하단 보조 포인트 렌더링
         ├── footnote?        → 하단 각주 (구분선 + 8pt 텍스트)
         └── speakerNotes?    → 발표자 노트 추가
```

#### 9.3.3 11종 Composition 렌더러 상세

**renderGridCards()**: N개 불릿을 카드 그리드로 렌더링
```
- cols = ceil(sqrt(N)), 최대 4열
- 카드: 둥근 사각형 + 번호 원 + 텍스트
- 색상: accent (짝수), accentLight (홀수)
```

**renderFlowHorizontal()**: 가로 흐름 화살표
```
- N개 불릿을 좌→우 배치
- 각 단계: 둥근 사각형 + 텍스트
- 단계 사이: 삼각형 화살표 (accent)
```

**renderFlowVertical()**: 세로 흐름
```
- N개 불릿을 위→아래 배치
- 각 단계: 사각형 + 텍스트
- 원형 번호 + 연결 화살표
```

**renderHubSpoke()**: 허브-스포크 방사형
```
- 제목 → 중앙 타원 (accent)
- 불릿 → 주변 둥근 사각형 (accentLight)
- 각도 분배: 360°/N
- 허브→스포크 연결선
```

**renderSideBySide()**: 좌우 분할
```
- 좌측: 제목 영역 (accent 배경)
- 우측: 불릿 포인트 목록
```

**renderTimeline()**: 타임라인
```
- 가로 기준선 (accent)
- 원형 마커 + 단계명
- 설명 텍스트 (짝수: 위, 홀수: 아래)
```

**renderIconList()**: 아이콘 리스트
```
- 좌측: 원형 아이콘 (iconHints에서 이모지 사용)
- 우측: 텍스트
- 교대 배경색 (홀수행: accentLight 스트라이프)
```

**renderComparisonTable()**: 비교 테이블
```
- 2열: 제목 행 (accent 배경) + 데이터 행
- 좌측/우측 각각 불릿 분배
- 교대 행 배경색
```

**renderCenterHighlight()**: 중앙 강조
```
- 중앙: 큰 원형 + 핵심 메시지/제목
- 하단: 보조 불릿 포인트
```

**renderStackVertical()**: 레이어 스택
```
- N개 불릿을 세로 레이어로 쌓기
- 각 레이어: 사각형 + 텍스트
- 상단이 넓고 하단이 좁은 피라미드형
```

**renderDefault()**: 기본 불릿 포인트
```
- 표준 불릿 포인트 목록
- 불릿 마커: ● (accent 색상)
- 14pt 본문 텍스트
```

#### 9.3.4 리치 필드 렌더링

**keyMessage (콜아웃 박스)**:
```
┌──────────────────────────────────┐
│ █ │  핵심 메시지 텍스트           │  ← accent 좌측 바 + 밝은 배경
└──────────────────────────────────┘
```

**subtitle**:
```
부제 텍스트                         ← 12pt, mutedColor
```

**footnote**:
```
──────────────────────────────────  ← 0.3pt 구분선
* 각주 텍스트                       ← 8pt, mutedColor
```

**secondaryPoints**:
```
• 보조 포인트 1                     ← 10pt, bodyColor
• 보조 포인트 2
```

#### 9.3.5 차트 렌더링

```typescript
function applyChart(slide, content, body, theme) {
  const chartTypeMap = {
    bar:  PptxGenJS.charts.BAR,
    pie:  PptxGenJS.charts.PIE,
    line: PptxGenJS.charts.LINE,
  };

  slide.addChart(chartTypeMap[content.chartType], chartData, {
    x: body.x, y: body.y, w: body.w, h: body.h,
    showTitle: false,
    showValue: true,
    chartColors: [theme.accent, theme.accentLight, theme.bodyColor],
  });
}
```

#### 9.3.6 장식 요소 시스템

```
일반 슬라이드:                        역전 슬라이드 (title/section):
┌─ accent bar (0.06" 높이)──────┐     ┌─ accent bar ──────────────┐
│█                              │     │                   ◯       │ ← 반투명 원
│█ (좌측 accent bar)            │     │                            │
│                               │     │     TITLE                  │
│  Title                        │     │                            │
│  ─── accent underline         │     │                            │
│                               │     │  ◯                        │ ← 반투명 원
│  Body content                 │     │                        N   │
│                           N   │     └────────────────────────────┘
└───────────────────────────────┘
```

#### 9.3.7 폰트 전략

```typescript
const FONT_FAMILY = 'Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif';
```

한국어 CJK 폰트 스택:
- **Apple SD Gothic Neo**: macOS 기본 한국어 폰트
- **Malgun Gothic**: Windows 기본 한국어 폰트
- **Noto Sans KR**: 크로스 플랫폼 폴백
- **sans-serif**: 최종 폴백

---

## 10. 프론트엔드 UI/UX & 컴포넌트 아키텍처

### 10.1 Architecture Mapper UI (644줄)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Architecture Mapper UI                              │
│                                                                       │
│  [← 돌아가기]  [Claude ▼]  [LLM Provider]                             │
│                                                                       │
│  ┌───────────────────────────────────────────┐ ┌──────────────────┐  │
│  │  Step 1: 입력                              │ │                  │  │
│  │  ☑ 레퍼런스 A                              │ │  ArchitectureCanvas│  │
│  │  ☑ 레퍼런스 B                              │ │  (SVG 프리뷰)     │  │
│  │                                            │ │                  │  │
│  │  📄 RFI 파일 드래그 앤 드롭                 │ │  ┌──────────┐   │  │
│  │  ┌────────────────────────────────────┐    │ │  │ group1   │   │  │
│  │  │  RFI 텍스트 내용...                 │    │ │  │ ┌──┐┌──┐│   │  │
│  │  │                                    │    │ │  │ └──┘└──┘│   │  │
│  │  └────────────────────────────────────┘    │ │  └──────────┘   │  │
│  │                                            │ │       ↓ ↗        │  │
│  │  📝 수동 메모                               │ │  ┌──────────┐   │  │
│  │  ┌────────────────────────────────────┐    │ │  │ wrtn-core│   │  │
│  │  │                                    │    │ │  └──────────┘   │  │
│  │  └────────────────────────────────────┘    │ │                  │  │
│  │                                            │ │                  │  │
│  │  [🔍 기술 추출]  [⚡ 빠르게 1장 만들기]      │ │                  │  │
│  │                                            │ │                  │  │
│  │  Step 2: 추출 결과 (접이식)                │ │                  │  │
│  │  Step 3: Wrtn 오버레이 (접이식)            │ │                  │  │
│  │  Step 5: 편집 & 내보내기 (접이식)          │ │                  │  │
│  └───────────────────────────────────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.2 Chat Pipeline UI (2-Panel, 레거시)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [← Back]  Step 1: 자동 기획  ●──●──○──○──○──○   [Theme▼] [LLM▼]    │
├──────────────────────────┬──────────────────────────────────────────┤
│                          │                                          │
│    Chat Panel            │       Preview Panel                      │
│    (리사이즈 가능)        │       (545줄)                            │
│                          │                                          │
│  ┌────────────────────┐  │  ★ 다중 뷰 모드:                        │
│  │ 사용자 메시지        │  │                                          │
│  └────────────────────┘  │  1. Auto Planning → 방향/구조/청사진 프리뷰│
│                          │  2. Content Spec → 슬라이드 명세 분석      │
│  ┌────────────────────┐  │  3. Deck Design → 역할 할당 표시         │
│  │ AI 응답             │  │  4. Expression → 와이어프레임 후보 3안   │
│  │ (Markdown 스트리밍)  │  │  5. Slide Candidates → 슬라이드 3안    │
│  └────────────────────┘  │  6. Final Deck → 슬라이드 캐러셀 + 다운로드│
│                          │                                          │
│  ┌────────────────────┐  │  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ 후보 선택 카드       │  │  │ 후보A │ │ 후보B │ │ 후보C │           │
│  └────────────────────┘  │  └──────┘ └──────┘ └──────┘           │
│                          │                                          │
│  ┌────────────────────┐  │  ┌────────────────────────────────────┐  │
│  │ 입력창 + 📎 업로드   │  │  │ [PPT 다운로드] [테마 선택]         │  │
│  └────────────────────┘  │  └────────────────────────────────────┘  │
├──────────────────────────┴──────────────────────────────────────────┤
│                  PanelResizer (드래그 가능, 20~80%)                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.3 주요 컴포넌트 계층 구조

```
ChatContainer (735줄, 메인 오케스트레이터)
├── StepIndicator (67줄)
│   └── 6개 스텝 (0~5) + 연결선 + 클릭 내비게이션
├── ReferencePanel (143줄, 슬라이드아웃)
│   ├── ReferenceUploadForm (138줄)
│   │   ├── 파일 업로드 탭
│   │   └── 텍스트 입력 탭
│   ├── ReferenceList (63줄)
│   └── ReferenceDetail (282줄, 모달)
│       ├── 메타 정보
│       ├── 섹션 흐름
│       ├── 작성 스타일 분석
│       ├── 슬라이드 패턴 테이블
│       ├── 레이아웃 청사진 시각화
│       └── 슬라이드별 상세 분석
├── ChatPanel
│   ├── MessageList (81줄, 자동 스크롤)
│   │   └── MessageBubble (32줄)
│   │       └── MarkdownRenderer (89줄)
│   ├── OptionCardGroup (50줄)
│   │   └── OptionCard (45줄)
│   └── ChatInput (143줄)
│       ├── 텍스트 입력 (자동 확장)
│       └── 파일 업로드 (PDF/DOCX/PPTX)
├── PreviewPanel (545줄, 다중 뷰 모드)
│   ├── SlideRenderer (609줄)
│   │   └── 11종 composition 렌더러
│   ├── ExpressionWireframeRenderer (249줄)
│   │   └── 14종 패밀리 와이어프레임
│   ├── ThemeSelector (45줄)
│   └── 슬라이드 캐러셀 + 썸네일
└── SettingsBar
    ├── LlmProviderSelect (21줄)
    └── ThemeToggle (31줄)
```

### 10.4 Hook 레이어 상세

| Hook | 줄 수 | 역할 | 주요 상태 |
|------|-------|------|----------|
| `usePipeline` | 512줄 | 파이프라인 상태 머신 | PipelineState, selectedExpressions, finalPlan |
| `useChat` | 154줄 | LLM 스트리밍 & 메시지 관리 | messages, isStreaming, abort |
| `useReferences` | 153줄 | 레퍼런스 CRUD + SSE 파싱 | references, isLoading, progressDetail |
| `useSlidePreview` | 91줄 | 슬라이드 프리뷰 내비게이션 | slides, currentIndex |
| `usePptGeneration` | 49줄 | PPT 다운로드 핸들러 | isGenerating, error |

### 10.5 반응형 디자인

- **데스크톱**: 좌우 2-Panel (PanelResizer로 20~80% 리사이즈)
- **모바일**: 탭 전환 (Chat / Preview)
- **Architecture Mapper**: 좌측 입력 폼 + 우측 SVG 프리뷰
- Tailwind CSS 4 기반 유틸리티 클래스
- next-themes로 다크/라이트 모드 지원

---

## 11. 기술 스택 & 인프라

### 11.1 전체 의존성 맵

```
┌──────────────────────────────────────────────────────────────────────┐
│                       PPT Agent Tech Stack                            │
│                                                                       │
│  ┌─── Framework ──────────┐  ┌─── AI / LLM ─────────────────────┐   │
│  │ Next.js 16.1.6         │  │ @anthropic-ai/sdk ^0.78.0         │   │
│  │ React 19.2.3           │  │ openai ^6.27.0                    │   │
│  │ TypeScript 5            │  │                                   │   │
│  │ Tailwind CSS 4          │  │ Claude Sonnet 4                   │   │
│  └────────────────────────┘  │ OpenAI/OpenRouter                 │   │
│                               └───────────────────────────────────┘   │
│  ┌─── Document Parsing ───┐  ┌─── PPT Generation ────────────────┐   │
│  │ pdfjs-dist ^3.11.174   │  │ pptxgenjs ^4.0.1                 │   │
│  │ pdf-parse ^1.1.1       │  │ mermaid ^11.13.0                 │   │
│  │ mammoth ^1.11.0        │  │ html2canvas-pro ^2.0.2           │   │
│  │ jszip ^3.10.1          │  │ @napi-rs/canvas ^0.1.96          │   │
│  └────────────────────────┘  │ jspdf ^4.2.0                     │   │
│                               └───────────────────────────────────┘   │
│  ┌─── UI ─────────────────┐  ┌─── Utilities ─────────────────────┐   │
│  │ react-markdown ^10.1   │  │ nanoid ^5.1.6                    │   │
│  │ remark-gfm ^4.0.1     │  │                                   │   │
│  │ next-themes ^0.4.6    │  │                                   │   │
│  └────────────────────────┘  └───────────────────────────────────┘   │
│                                                                       │
│  ┌─── Dev Dependencies ──────────────────────────────────────────┐   │
│  │ @playwright/test ^1.58.2  │ @tailwindcss/postcss ^4            │   │
│  │ eslint ^9                 │ @types/node ^20                    │   │
│  │ eslint-config-next        │ @types/react ^19                   │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 11.2 핵심 설정

**Next.js (next.config.ts):**
```typescript
{
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas', 'canvas'],
  experimental: {
    serverActions: { bodySizeLimit: '100mb' },
  },
}
```

**TypeScript:**
```json
{
  "target": "ES2017",
  "lib": ["dom", "dom.iterable", "esnext"],
  "strict": true,
  "moduleResolution": "bundler",
  "paths": { "@/*": ["./src/*"] }
}
```

**LLM 모델:**
```typescript
CLAUDE_MODEL   = 'claude-sonnet-4-20250514';
OPENAI_MODEL   = 'anthropic/claude-sonnet-4';  // OpenRouter 경유
DEFAULT_PROVIDER = 'openai';
```

### 11.3 환경변수

| 변수 | 용도 | 필수 여부 |
|------|------|----------|
| `ANTHROPIC_API_KEY` | Claude API 키 | provider가 claude일 때 |
| `OPENAI_API_KEY` | OpenAI/OpenRouter API 키 | provider가 openai일 때 |
| `OPENAI_BASE_URL` | OpenRouter 등 커스텀 엔드포인트 | 선택 |

### 11.4 스트리밍 아키텍처

```typescript
// LlmProvider 인터페이스
interface LlmProvider {
  streamChat(options: StreamChatOptions): ReadableStream<Uint8Array>;
}

// Claude 구현 (claude.ts, 83줄)
const stream = client.messages.stream({
  model: CLAUDE_MODEL,
  max_tokens: 8192,
  temperature: options.temperature ?? 0.7,
  system: options.systemPrompt,
  messages: anthropicMessages,
});
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

// OpenAI 구현 (openai.ts, 84줄)
// 동일 인터페이스, OpenAI SDK의 stream: true 옵션 사용
// ContentBlock → OpenAI 포맷 변환 (image → image_url, PDF → 텍스트 폴백)
```

### 11.5 데이터 영속성

```
데이터 저장소:
  references.json ── 파일 기반 JSON 저장소
  ├── getReferences(): ReferenceProposal[]
  ├── addReference(ref): void
  ├── getById(id): ReferenceProposal | null
  └── deleteById(id): boolean

세션 상태:
  React State (usePipeline) ── 클라이언트 메모리 전용
  ├── 새로고침 시 소실
  └── URL 상태 없음
```

---

## 12. 제한사항 & 약점

### 12.1 기능적 제한

| 제한사항 | 설명 | 심각도 | 시스템 |
|----------|------|--------|--------|
| **이미지 생성 미지원** | DALL-E, Stable Diffusion 등 이미지 생성 API 미연동. 텍스트 설명으로만 표현 | 높음 | Chat |
| **웹 검색 미지원** | 실시간 데이터 수집 불가. 사용자가 직접 입력해야 함 | 중간 | 양쪽 |
| **Chat 슬라이드 편집 미지원** | Chat Pipeline에서 생성 후 개별 슬라이드 수정 불가. 재생성 필요 | 높음 | Chat |
| **아키텍처 1장 제한** | Architecture Mapper는 1장 아키텍처 슬라이드만 생성 가능 | 중간 | Arch |
| **다국어 제한** | 시스템 프롬프트·UI가 한국어 고정. 영어 프레젠테이션 한계 | 중간 | 양쪽 |
| **Wrtn 모듈 고정** | 9종 Wrtn 모듈이 하드코딩. 다른 기업/기술 스택 적용 불가 | 중간 | Arch |
| **로컬 LLM 미지원** | Ollama 등 로컬 모델 지원 없음 | 낮음 | 양쪽 |
| **협업 기능 없음** | 멀티유저, 공유, 동시 편집 미지원 | 낮음 | 양쪽 |
| **버전 관리 없음** | 이전 생성 결과 저장/복원 불가 | 중간 | 양쪽 |

### 12.2 기술적 제한

| 제한사항 | 설명 | 심각도 |
|----------|------|--------|
| **JSON 파일 기반 저장소** | references.json 단일 파일. 동시성/확장성 한계 | 중간 |
| **서버 상태 없음** | 모든 세션 상태가 클라이언트 React state. 새로고침 시 소실 | 높음 |
| **PDF Vision 폴백 의존** | 이미지 PDF는 Vision API 호출 → 비용 증가 | 낮음 |
| **OpenAI PDF 미지원** | OpenAI 프로바이더에서 PDF document 블록 네이티브 미지원 → 이미지 변환 필요 | 중간 |
| **PPTX 그래디언트 제한** | PptxGenJS의 CSS gradient 지원 제한적. 단색 폴백 | 낮음 |
| **Mermaid 외부 의존** | mermaid.ink 서비스에 의존. 서비스 다운 시 다이어그램 렌더링 실패 | 중간 |
| **테마 수 제한** | 3종 프리셋만 존재. 커스텀 테마 생성 불가 | 중간 |
| **아키텍처 레이아웃 좌표 하드코딩** | 3종 레이아웃의 그룹 좌표가 고정값. 동적 계산 부재 | 중간 |
| **패턴 매칭 한국어 편향** | extractor.ts의 30종 규칙이 한국어 키워드 중심 | 낮음 |

### 12.3 프롬프트/LLM 관련 제한

| 제한사항 | 설명 | 심각도 |
|----------|------|--------|
| **구조화 출력 불안정** | HTML 주석 기반 파싱은 LLM이 포맷을 벗어나면 실패 (폴백 메커니즘 존재) | 중간 |
| **컨텍스트 윈도우 압박** | 모든 진행 상황 + 레퍼런스를 매번 포함. Step 5 후반부 압박 | 높음 |
| **Architecture LLM 타임아웃** | 추출에 12초 타임아웃 적용. 복잡한 문서에서 불완전 결과 가능 | 중간 |
| **에러 복구 제한** | 잘못된 JSON 반환 시 폴백은 있지만, 사용자가 재시도해야 할 수 있음 | 중간 |
| **온도 전략 제한** | 대부분 0.7 고정 (분석만 0.3, architecture/llm.ts만 0.2) | 낮음 |

---

## 13. 경쟁사 대비 포지셔닝 & 개선 방향

### 13.1 3사 비교 테이블 (2026-03-17 업데이트)

| 특성 | PPT Agent (우리) | PPTAgent (ICIP-CAS) | Presenton |
|------|------------------|--------------------|-----------|
| **언어** | TypeScript/React | Python | Python + TypeScript |
| **플랫폼** | 웹 (Next.js) | CLI + Gradio Web UI | Electron 데스크톱 + Docker |
| **LLM** | Claude Sonnet 4, OpenAI | OpenAI 호환 (모든 모델) | OpenAI, Gemini, Claude, Ollama, Custom |
| **메인 기능** | ★ 아키텍처 매퍼 + 대화형 파이프라인 | 자동 PPT 생성 | 다목적 PPT 생성 |
| **파이프라인** | Arch: 5-Step 자동 / Chat: 6-Step 대화형 | V1: 2-Stage, V2: 3-Phase | 10-Step 선형 |
| **사용자 개입** | Arch: 편집+변형 / Chat: 후보 선택 | 자동 (최소 개입) | SSE 실시간, 편집 지원 |
| **레퍼런스** | 2단계 LLM 분석 + 이중 활용 | ViT 이미지 임베딩 + 스키마 | PPTX 템플릿 + HTML 변환 |
| **이미지 생성** | ❌ 미지원 | ❌ (V1), ✅ (V2) | ✅ DALL-E 3, Gemini, Pexels, ComfyUI |
| **차트** | ✅ PptxGenJS 네이티브 (bar/pie/line) | ✅ Python 코드 실행 | ✅ Recharts + PPTX 변환 |
| **다이어그램** | ✅ Mermaid → PNG + ★ SVG 아키텍처 | ❌ (직접) | ✅ Mermaid (내장) |
| **웹 검색** | ❌ 미지원 | ✅ (V2: Tavily, arXiv) | ✅ OpenAI/Google 내장 |
| **PPTX 출력** | ✅ PptxGenJS (프로그래매틱) | ✅ python-pptx (편집 기반) | ✅ DOM→스크린샷→python-pptx |
| **로컬 LLM** | ❌ | ❌ | ✅ Ollama |
| **슬라이드 편집** | ★ 아키텍처: 인라인 편집 / Chat: ❌ | ❌ | ✅ 텍스트/구조/스케치 |
| **자동 평가** | ❌ | ✅ PPTEval (3차원) | ❌ |
| **Composition** | ✅ 11종 시각적 구도 | ❌ (레퍼런스 복제) | ✅ 템플릿 기반 |
| **ExpressionFamily** | ★ 14종 시각 표현 + 8종 정보구조 + 7종 목표 | ❌ | ❌ |
| **디자인 플랜** | ★ 역할 할당 + 톤/모티프/밀도 전략 | ❌ | ❌ |
| **아키텍처 매핑** | ★ RFI→컴포넌트→Wrtn오버레이→슬라이드 | ❌ | ❌ |
| **테마** | 3종 프리셋 + 레퍼런스 테마 추출 | 레퍼런스 PPT 색상 계승 | HTML/Tailwind 자유 디자인 |
| **데이터 저장** | JSON 파일 (임시) | 파일시스템 | SQLite (로컬) |

### 13.2 PPT Agent의 강점 (경쟁 우위)

**1. ★ Architecture Mapper (유일무이)**
- **경쟁사에 없는 완전한 독자 기능**
- RFI 문서 → 30종 패턴 매칭 + LLM → 고객 컴포넌트 자동 추출
- Wrtn 기술 모듈 자동 오버레이 매핑
- 3종 레이아웃 스타일 자동 선택 + 3종 대안 비교
- SVG 실시간 프리뷰 + 인라인 편집
- 편집 가능한 PPTX 도형으로 내보내기

**2. ★ ExpressionFamily 시스템 (독자적)**
- 14종 시각적 표현 패밀리 + 8종 정보구조 + 7종 커뮤니케이션 목표
- 역할 기반 가중치 + 키워드 부스터로 과학적 추천
- 와이어프레임 시각화로 선택 전 미리보기
- 경쟁사에서 이 수준의 시각적 표현 분류 체계는 존재하지 않음

**3. ★ 디자인 플랜 (Step 3, 독자적)**
- 슬라이드별 역할 할당 (9종 SlideRole)
- 전체 톤, 시각 모티프, 밀도/반복/변화/강조 규칙 체계적 수립
- 경쟁사의 "콘텐츠 → 바로 제작" 방식과 차별화되는 **중간 설계 단계**

**4. 11종 Composition Variant**
- grid-cards, hub-spoke, timeline, flow-horizontal 등
- 동일 콘텐츠를 다양한 시각적 구도로 표현 가능
- 자동 추론 + 수동 변경 모두 지원

**5. 6-Step 대화형 파이프라인**
- Step 1의 자동 기획 (방향+구조 통합)으로 효율성 향상
- Step 3~4의 디자인 플랜/표현방식으로 **디자인 품질 체계적 관리**
- 폴백 메커니즘으로 LLM 실패 시에도 작동

**6. 레퍼런스 이중 활용**
- Architecture Mapper: 테마 색상 → DiagramStyleProfile
- Chat Pipeline: 패턴·스타일 → 모든 Step 프롬프트 주입
- 하나의 레퍼런스가 두 시스템에서 동시에 가치를 제공

**7. TypeScript 풀스택 타입 안전성**
- 580줄 중앙 타입 + 139줄 아키텍처 타입
- LLM 응답 파싱에서 타입 검증
- 프론트엔드-백엔드 동일 타입 시스템

### 13.3 PPT Agent의 약점 (개선 필요)

**1. 이미지 생성 부재** (vs Presenton의 DALL-E 3, Pexels, ComfyUI)
- 시각적 임팩트 크게 감소
- 텍스트 설명만으로는 전문적 프레젠테이션 한계

**2. 웹 검색 부재** (vs PPTAgent V2, Presenton)
- 실시간 데이터/통계 수집 불가
- 사용자가 모든 정보를 직접 제공해야 함

**3. Chat 슬라이드 편집 부재** (vs Presenton)
- Chat Pipeline에서 생성 후 수정 불가 (Architecture Mapper는 편집 가능)
- 전체 재생성 필요

**4. 세션 영속성 부재**
- 브라우저 새로고침 시 모든 진행 상태 소실
- 장시간 작업 시 리스크

**5. Architecture Mapper의 Wrtn 종속성**
- 9종 Wrtn 모듈이 하드코딩되어 범용 아키텍처 도구로 사용 불가
- 다른 기업/기술 스택에 적용하려면 코드 수정 필요

**6. 자동 평가 부재** (vs PPTAgent의 PPTEval)
- 생성된 프레젠테이션 품질을 객관적으로 측정할 방법 없음

### 13.4 개선 로드맵 (우선순위순)

| 우선순위 | 개선 항목 | 설명 | 참고 경쟁사 |
|---------|----------|------|-----------|
| P0 | **세션 영속성** | LocalStorage 또는 DB 기반 상태 저장 | Presenton (SQLite) |
| P0 | **Chat 슬라이드 편집** | 생성된 슬라이드의 텍스트/레이아웃 수정 기능 | Presenton |
| P0 | **Arch Mapper 범용화** | Wrtn 모듈을 설정 가능한 기술 스택으로 일반화 | - |
| P1 | **이미지 생성** | DALL-E 3, Gemini Flash, Pexels 통합 | Presenton |
| P1 | **웹 검색** | Anthropic/OpenAI 내장 검색 도구 활용 | PPTAgent V2, Presenton |
| P1 | **Arch Mapper 다슬라이드** | 아키텍처 1장 → 전체 제안서 (표지+아키텍처+상세+비교+결론) | - |
| P2 | **커스텀 테마** | 사용자 정의 색상/폰트 테마 에디터 | Presenton |
| P2 | **구조화 출력 안정화** | JSON Schema strict 모드 (response_format) | Presenton |
| P2 | **아키텍처 레이아웃 동적 계산** | 하드코딩 좌표 → 컴포넌트 수/크기 기반 동적 배치 | - |
| P3 | **로컬 LLM 지원** | Ollama OpenAI 호환 API 연동 | Presenton |
| P3 | **자동 평가** | Content/Design/Coherence 3차원 평가 | PPTAgent V1 |
| P3 | **MCP 서버** | Model Context Protocol 통합 | PPTAgent V2, Presenton |
| P4 | **PDF 내보내기** | Puppeteer 기반 PDF 변환 | Presenton |
| P4 | **발표자 모드** | 슬라이드쇼 + 발표자 노트 표시 | - |
| P4 | **협업 기능** | 실시간 공동 편집 (WebSocket) | - |

### 13.5 아키텍처적 개선 방향

**1. 구조화 출력 강화**
```
현재: <!--STRUCTURED_DATA{...}--> (HTML 주석 파싱)
개선: LLM의 response_format (JSON Schema strict 모드) 활용
효과: 파싱 실패율 대폭 감소, 폴백 코드 단순화
```

**2. Architecture Mapper 범용화**
```
현재: 9종 Wrtn 모듈 하드코딩 (overlayMapper.ts)
개선: 기술 모듈 설정 파일(YAML/JSON) + 매핑 규칙 설정 UI
효과: 모든 기업의 기술 스택에 적용 가능한 범용 도구로 전환
```

**3. 두 시스템 통합**
```
현재: Architecture Mapper (1장) + Chat Pipeline (N장) 별도 동작
개선: Architecture 슬라이드를 Chat Pipeline의 한 슬라이드로 삽입
      또는 Arch Mapper를 다슬라이드로 확장하여 완전한 제안서 생성
효과: 사용자 워크플로우 단일화, 제안서 전체를 하나의 시스템에서 완성
```

**4. 에이전트 자율성 강화**
```
현재: 6-Step 고정 파이프라인 + Arch Mapper 수동 진행
개선: V2의 환경 기반 리플렉션 도입 (렌더링 후 자동 품질 검증)
      Architecture Mapper에 자동 리파인 루프
효과: 수동 개입 없이도 일정 수준의 품질 보장
```

**5. 도구 체계 도입**
```
현재: LLM이 텍스트만 생성 (Architecture에서만 JSON 생성)
개선: Tool Calling으로 웹 검색, 이미지 생성, 차트 데이터 조회 등
효과: LLM의 능동적 정보 수집 + 외부 리소스 활용
```

---

## 부록: 소스 코드 통계

### 파일별 줄 수 (상위 25개)

| 순위 | 파일 | 줄 수 | 카테고리 |
|------|------|-------|---------|
| 1 | ppt/generator.ts | 1,095 | PPTX 생성 |
| 2 | chat/ChatContainer.tsx | 735 | 컴포넌트 |
| 3 | architecture/page.tsx | 644 | 페이지 |
| 4 | preview/SlideRenderer.tsx | 609 | 컴포넌트 |
| 5 | lib/types.ts | 580 | 타입 |
| 6 | preview/PreviewPanel.tsx | 545 | 컴포넌트 |
| 7 | hooks/usePipeline.ts | 512 | 훅 |
| 8 | llm/prompts.ts | 423 | 프롬프트 |
| 9 | reference/analyzer.ts | 414 | 라이브러리 |
| 10 | document/pdfLayoutExtractor.ts | 329 | 문서처리 |
| 11 | reference/ReferenceDetail.tsx | 282 | 컴포넌트 |
| 12 | architecture/extractor.ts | 281 | 아키텍처 |
| 13 | document/docxLayoutExtractor.ts | 268 | 문서처리 |
| 14 | preview/ExpressionWireframeRenderer.tsx | 249 | 컴포넌트 |
| 15 | reference/promptBuilder.ts | 246 | 레퍼런스 |
| 16 | architecture/overlayMapper.ts | 206 | 아키텍처 |
| 17 | document/pdfVisionExtractor.ts | 200 | 문서처리 |
| 18 | expression/recommender.ts | 177 | 표현방식 |
| 19 | architecture/layoutPlanner.ts | 167 | 아키텍처 |
| 20 | pipeline/validator.ts | 158 | 파이프라인 |
| 21 | hooks/useChat.ts | 154 | 훅 |
| 22 | hooks/useReferences.ts | 153 | 훅 |
| 23 | ppt/architectureExporter.ts | 152 | PPTX 생성 |
| 24 | chat/ChatInput.tsx | 143 | 컴포넌트 |
| 25 | reference/ReferencePanel.tsx | 143 | 컴포넌트 |

### 카테고리별 합산

| 카테고리 | 파일 수 | 총 줄 수 | 비율 |
|---------|--------|---------|------|
| 컴포넌트 (components/) | 18 | ~3,500 | 41% |
| 라이브러리 (lib/) | 25+ | ~3,200 | 38% |
| 훅 (hooks/) | 5 | ~960 | 11% |
| 페이지 (app/) | 5 | ~750 | 9% |
| API 라우트 (api/) | 10+ | ~400 | 5% |
| **총계** | **70+** | **~8,500** | **100%** |

---

> **문서 작성 일자**: 2026-03-17
> **최종 분석 결론**: PPT Agent는 2026-03-11 초판 분석 이후 **Architecture Mapper**를 메인 시스템으로 전환하고,
> Chat Pipeline을 6-Step으로 확장하며, **ExpressionFamily**, **디자인 플랜**, **아키텍처 SVG 프리뷰**,
> **인라인 편집** 등 독자적 기능을 대거 추가하였다.
>
> 특히 Architecture Mapper의 "RFI → 컴포넌트 추출 → Wrtn 오버레이 → SVG 프리뷰 → 편집 가능 PPTX"
> 파이프라인과, ExpressionFamily의 "14종 시각 표현 × 8종 정보구조 × 7종 커뮤니케이션 목표" 분류 체계는
> 경쟁사에 없는 **유일무이한 독자 기능**이다.
>
> 그러나 이미지 생성·웹 검색·세션 영속성 부재, Wrtn 종속성, Chat 편집 미지원 등의 약점이 여전히 존재한다.
> Architecture Mapper의 범용화(Wrtn 탈종속)와 두 시스템의 통합이 차기 우선 과제이다.

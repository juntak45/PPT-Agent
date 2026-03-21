# Presenton 경쟁사 심층 분석 보고서

> **분석 대상**: [presenton/presenton](https://github.com/presenton/presenton)
> **GitHub Stars**: 4,300+ | **Forks**: 832 | **라이선스**: Apache 2.0
> **분석 일자**: 2026-03-11
> **분석 목적**: PPT Agent (Next.js/TypeScript) 프로젝트에 적용 가능한 인사이트 도출

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [아키텍처 & 파이프라인 구조](#2-아키텍처--파이프라인-구조)
3. [LLM 통합](#3-llm-통합)
4. [프롬프트 전략](#4-프롬프트-전략)
5. [슬라이드 생성 로직](#5-슬라이드-생성-로직)
6. [디자인 시스템](#6-디자인-시스템)
7. [PPTX/PDF 내보내기](#7-pptxpdf-내보내기)
8. [차트/다이어그램/이미지 처리](#8-차트다이어그램이미지-처리)
9. [프론트엔드 UI/UX](#9-프론트엔드-uiux)
10. [기술 스택](#10-기술-스택)
11. [제한사항 & 약점](#11-제한사항--약점)
12. [PPT Agent 프로젝트 적용 인사이트](#12-ppt-agent-프로젝트-적용-인사이트)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목적

Presenton은 AI를 활용한 오픈소스 프레젠테이션 생성기이다. Gamma, Beautiful AI, Decktopus 같은
상용 도구의 오픈소스 대안을 목표로 하며, 모든 처리를 로컬 디바이스에서 실행할 수 있다는 점이
핵심 차별점이다.

주요 포지셔닝:
- 로컬 실행 가능 (Ollama 등 로컬 LLM 지원)
- 완전한 오픈소스 (Apache 2.0)
- 데스크톱 앱 (Electron) + Docker 배포 모두 지원
- 커스텀 템플릿 시스템 (HTML + Tailwind CSS 기반)

### 1.2 핵심 기능 목록

| 기능 | 설명 |
|------|------|
| AI 프레젠테이션 생성 | 텍스트 입력 -> 자동 슬라이드 생성 |
| 다중 LLM 지원 | OpenAI, Gemini, Anthropic Claude, Ollama, Custom endpoint |
| 이미지 생성 | DALL-E 3, GPT-Image-1.5, Gemini Flash, Pexels, Pixabay, ComfyUI |
| 커스텀 템플릿 | HTML/Tailwind 기반, 기존 PPTX에서 추출 가능 |
| PPTX/PDF 내보내기 | LibreOffice + Puppeteer 기반 |
| MCP 서버 | Model Context Protocol 통합 |
| 웹 검색 | 프레젠테이션 생성 시 실시간 웹 검색 지원 |
| 문서 첨부 | PDF, DOCX 등 문서를 참조하여 슬라이드 생성 |

### 1.3 라이선스 구조

Apache 2.0 라이선스로, 상업적 사용이 자유롭다. 별도의 NOTICE 파일이 존재하며,
서드파티 라이선스 고지가 포함되어 있다. 우리 프로젝트에서 코드를 참조하거나
패턴을 차용하는 데 법적 제약이 없다.

### 1.4 프로젝트 규모

```
커밋 수: 1,072+
오픈 이슈: 53개
PR: 21개
주요 언어: Python (백엔드), TypeScript (프론트엔드/Electron)
파일 수: 약 200+ 소스 파일
```

---

## 2. 아키텍처 & 파이프라인 구조

### 2.1 전체 시스템 아키텍처

```
+------------------------------------------------------------------+
|                        Electron Shell                             |
|  +--------------------+    IPC Bridge    +---------------------+  |
|  |    Electron Main   |<================>|   Preload Scripts   |  |
|  |    (main.ts)       |                  |   (index.ts)        |  |
|  +--------+-----------+                  +---------------------+  |
|           |                                                       |
|           | 프로세스 관리                                           |
|           v                                                       |
|  +-----------------------------------------------------------+   |
|  |              서버 프로세스 관리 (servers.ts)                  |   |
|  |  +------------------------+  +-------------------------+  |   |
|  |  |   FastAPI Server       |  |   Next.js Server        |  |   |
|  |  |   (Python/uvicorn)     |  |   (Node.js)             |  |   |
|  |  |   Port: Dynamic        |  |   Port: Dynamic         |  |   |
|  |  +------------------------+  +-------------------------+  |   |
|  +-----------------------------------------------------------+   |
+------------------------------------------------------------------+

Docker 배포 시:
+------------------------------------------------------------------+
|                        Docker Container                           |
|  +----------+   +----------------+   +-----------------------+   |
|  |  nginx   |-->|  Next.js :3000 |   |  FastAPI :8000        |   |
|  |  :80     |   +----------------+   +-----------------------+   |
|  +----------+   |  LibreOffice   |   |  Chromium/Puppeteer   |   |
|                 +----------------+   +-----------------------+   |
+------------------------------------------------------------------+
```

### 2.2 Electron 앱 구조

Electron 메인 프로세스가 두 개의 서버를 자식 프로세스로 관리한다:

```
electron/
  app/
    main.ts                          # Electron 메인 프로세스
    ipc/
      api_handlers.ts                # FastAPI 프록시 핸들러
      export_handlers.ts             # PPTX/PDF 내보내기 핸들러
      footer_handlers.ts             # 푸터 설정
      libreoffice_install_handlers.ts # LibreOffice 설치 관리
      log_handler.ts                 # 로그 전달
      presentation_to_pptx_model_handlers.ts  # PPTX 모델 변환
      read_file.ts                   # 파일 읽기
      slide_metadata.ts              # 슬라이드 메타데이터
      template_api_handlers.ts       # 템플릿 API
      theme_handlers.ts              # 테마 관리
      upload_image.ts                # 이미지 업로드
      user_config_handlers.ts        # 사용자 설정
    preloads/
      index.ts                       # 메인 프리로드
      libreoffice-installer.ts       # LibreOffice 설치 UI
      pptx-export.ts                 # PPTX 내보내기 UI
    services/
      settings-store.ts              # 로컬 설정 저장소
    utils/
      constants.ts                   # 상수
      dialog.ts                      # 다이얼로그 유틸
      index.ts                       # 유틸 모음
      libreoffice-check.ts           # LibreOffice 설치 확인
      libreoffice-urls.ts            # OS별 LibreOffice 다운로드 URL
      servers.ts                     # 서버 프로세스 관리
```

핵심 패턴: **IPC 브릿지를 통한 프론트엔드-백엔드 통신**.
Electron의 `contextBridge`로 보안 채널을 만들고, IPC 핸들러가
FastAPI 서버로 HTTP 요청을 프록시한다.

### 2.3 프레젠테이션 생성 파이프라인 (핵심)

사용자가 프롬프트를 입력하면 다음 단계로 처리된다:

```
[사용자 입력]
    |
    v
+-------------------+
| 1. 입력 처리      |  content, files, web_search, 설정값 수집
+-------------------+
    |
    v
+-------------------+
| 2. 문서 로딩      |  PDF/DOCX/PPTX -> 텍스트 추출 (docling)
| (선택적)          |  청크 분할 (score_based_chunker)
+-------------------+
    |
    v
+-------------------+
| 3. 웹 검색        |  LLM 웹 검색 도구 호출 (선택적)
| (선택적)          |  OpenAI/Google/Anthropic 내장 검색
+-------------------+
    |
    v
+-------------------+
| 4. 아웃라인 생성  |  LLM이 슬라이드 제목/요약 생성
|                   |  generate_outline() 호출
+-------------------+
    |
    v
+-------------------+
| 5. 구조 생성      |  각 슬라이드의 상세 구조 결정
|                   |  generate_structure() 호출
+-------------------+
    |
    v
+-------------------+
| 6. 레이아웃 매칭  |  구조에 맞는 레이아웃 컴포넌트 선택
|                   |  presentation_layout 매칭
+-------------------+
    |
    v
+-------------------+
| 7. 콘텐츠 생성    |  각 슬라이드의 실제 텍스트/데이터 생성
|                   |  LLM structured output 사용
+-------------------+
    |
    v
+-------------------+
| 8. 에셋 처리      |  이미지 생성/검색, 아이콘 검색
|                   |  process_slide_and_fetch_assets()
+-------------------+
    |
    v
+-------------------+
| 9. HTML 렌더링    |  React 컴포넌트로 슬라이드 렌더링
|                   |  V1ContentRender + 각 레이아웃
+-------------------+
    |
    v
+-------------------+
| 10. PPTX 변환     |  DOM -> 스크린샷 -> python-pptx
| (내보내기 시)     |  또는 Puppeteer PDF 생성
+-------------------+
```

### 2.4 프론트엔드-백엔드 통신 구조

통신은 두 가지 모드로 동작한다:

**Electron 모드 (데스크톱):**
```
React UI --> IPC Channel --> Electron Main --> HTTP --> FastAPI
                                                  |
                                                  +--> Next.js API Routes
```

**Docker/Web 모드:**
```
React UI --> Next.js API Routes --> HTTP --> FastAPI
      |
      +--> nginx reverse proxy (Docker에서)
```

API 엔드포인트 구조:
```
FastAPI (백엔드):
  /api/v1/ppt/
    presentation/generate          # 프레젠테이션 생성 (SSE 스트리밍)
    presentation/edit              # 슬라이드 편집
    slide/content                  # 슬라이드 콘텐츠
    slide/layout                   # 레이아웃 정보
    pptx-slides/process            # PPTX 파일 분석
    pptx-fonts/process             # 폰트 추출
    slide-to-html                  # 슬라이드->HTML 변환
    html-to-react                  # HTML->React 변환
    template/                      # 템플릿 관리
  /api/v1/mock/                    # 목업 데이터
  /api/v1/webhook/                 # 웹훅 관리

Next.js (프론트엔드 API):
  /api/presentation_to_pptx_model  # PPTX 모델 변환
  /api/export/                     # 내보내기 처리
```

### 2.5 SSE (Server-Sent Events) 스트리밍

프레젠테이션 생성은 SSE를 통해 실시간으로 진행 상황을 전달한다:

```python
# SSE 응답 모델 (models/sse_response.py)
class SSEResponse:
    event: str      # "outline", "structure", "slide", "complete", "error"
    data: dict      # 이벤트별 데이터
```

클라이언트는 EventSource API로 각 단계의 결과를 실시간 수신하며,
UI에 점진적으로 슬라이드를 렌더링한다. 이 패턴은 사용자 경험에 매우 중요하다.

### 2.6 백그라운드 태스크

```python
# api/v1/ppt/background_tasks.py
# FastAPI BackgroundTasks를 활용한 비동기 처리
# - 웹훅 전송
# - 에셋 후처리
# - 분석 데이터 전송
```

---

## 3. LLM 통합

### 3.1 지원 LLM 프로바이더

Presenton은 6개의 LLM 프로바이더를 통합 추상화 레이어로 지원한다:

| 프로바이더 | 구현 방식 | 특이사항 |
|-----------|----------|---------|
| **OpenAI** | openai Python SDK | GPT-4o, GPT-5 등 지원. Responses API 통합 |
| **Google Gemini** | google-genai SDK | Gemini Flash/Pro. 이미지 생성도 가능 |
| **Anthropic Claude** | anthropic SDK | Claude 3.5/4. Tool calling 지원 |
| **Ollama** | OpenAI 호환 API | 로컬 모델 (Llama, Mistral 등) |
| **Custom** | OpenAI 호환 API | 임의의 OpenAI-compatible 엔드포인트 |
| **Codex** | OpenAI Responses API | OAuth 토큰 자동 갱신, 이벤트 기반 스트리밍 |

### 3.2 LLM 클라이언트 아키텍처

```python
# services/llm_client.py - 핵심 추상화 클래스

class LLMClient:
    """6개 LLM 백엔드를 단일 인터페이스로 통합"""

    def _get_client(self):
        """프로바이더별 클라이언트 초기화"""
        # OpenAI: openai.AsyncOpenAI()
        # Google: google.genai.Client()
        # Anthropic: anthropic.AsyncAnthropic()
        # Ollama: openai.AsyncOpenAI(base_url="http://localhost:11434/v1")
        # Custom: openai.AsyncOpenAI(base_url=custom_url)
        # Codex: OpenAI Responses API 클라이언트

    # === 3가지 생성 모드 ===

    async def generate(self, messages, tools=None):
        """비구조화 텍스트 생성 + 선택적 도구 호출"""
        # 프로바이더별 분기: _generate_openai/google/anthropic/ollama/custom/codex

    async def generate_structured(self, messages, response_format):
        """JSON 스키마 검증된 구조화 응답"""
        # Pydantic 모델 또는 JSON Schema를 응답 포맷으로 사용
        # ensure_strict_json_schema()로 스키마 정규화

    async def stream(self, messages):
        """비동기 스트리밍 생성"""
        # SSE 이벤트로 토큰 단위 전달

    async def stream_structured(self, messages, response_format):
        """구조화 응답의 스트리밍 버전"""

    # === 웹 검색 ===

    async def _search_openai(self, messages):
        """OpenAI의 web_search_preview 도구 사용"""

    async def _search_google(self, messages):
        """Google의 google_search Grounding 도구 사용"""

    async def _search_anthropic(self, messages):
        """Anthropic의 web_search 도구 사용"""
```

### 3.3 프로바이더 전환 메커니즘

환경변수를 통해 프로바이더를 전환한다:

```bash
# .env 또는 Docker 환경변수
LLM_PROVIDER=openai          # openai | google | anthropic | ollama | custom
LLM_MODEL=gpt-4o             # 모델명
LLM_API_KEY=sk-...           # API 키

# Ollama 전용
OLLAMA_BASE_URL=http://localhost:11434

# Custom 전용
CUSTOM_LLM_BASE_URL=http://my-llm-server/v1
CUSTOM_LLM_API_KEY=...
```

프로바이더 열거형 정의:

```python
# enums/llm_provider.py
class LLMProvider(str, Enum):
    OPENAI = "openai"
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    CUSTOM = "custom"
    CODEX = "codex"
```

### 3.4 구조화 출력 (Structured Output) 처리

이것이 Presenton의 핵심 기술적 강점 중 하나이다. LLM 응답을 항상 JSON 스키마로 강제한다:

```python
# utils/schema_utils.py

def ensure_strict_json_schema(schema: dict) -> dict:
    """OpenAI strict 모드 호환 스키마로 변환
    - additionalProperties: false 강제
    - 모든 필드를 required로 설정
    - $ref 참조 인라인 처리
    - 지원되지 않는 format 제거
    """

def flatten_json_schema(schema: dict) -> dict:
    """$ref 참조를 모두 인라인으로 풀어서 단일 스키마로 변환"""

def remove_fields_from_schema(schema, fields_to_remove):
    """특정 필드를 스키마에서 제거 (예: 이미지 URL 필드 제거 후 LLM에 전달)"""

def add_field_in_schema(schema, field_name, field_schema, required=False):
    """스키마에 동적으로 필드 추가 (예: speaker_notes 필드)"""
```

**핵심 패턴**: 슬라이드 레이아웃 컴포넌트마다 Zod 스키마를 정의하고,
이를 JSON Schema로 변환하여 LLM에 `response_format`으로 전달한다.
이렇게 하면 LLM이 반드시 해당 레이아웃의 데이터 구조에 맞는 JSON을 반환한다.

### 3.5 도구 호출 (Tool Calling) 구현

```python
# services/llm_tool_calls_handler.py
# 재귀적 도구 호출 처리 (최대 5단계)

async def handle_tool_calls(client, messages, tool_calls, tools, depth=0):
    """
    1. LLM이 도구 호출 요청
    2. 도구 실행 결과를 메시지에 추가
    3. 다시 LLM에 전달
    4. 최종 텍스트 응답까지 반복
    """
```

### 3.6 Ollama 모델 관리

```python
# constants/supported_ollama_models.py
# 지원되는 Ollama 모델 목록과 메타데이터

# models/ollama_model_metadata.py
class OllamaModelMetadata:
    name: str
    size: int
    parameter_size: str
    quantization_level: str

# models/ollama_model_status.py
class OllamaModelStatus:
    name: str
    is_downloaded: bool
    is_running: bool
```

Ollama 통합 시 OpenAI 호환 API 엔드포인트(`/v1/chat/completions`)를 사용하므로,
OpenAI SDK를 그대로 재활용한다. 이것은 우리 프로젝트에서도 동일하게 적용 가능한 패턴이다.

---

## 4. 프롬프트 전략

### 4.1 프롬프트 파일 구조

```
electron/servers/fastapi/
  utils/llm_calls/
    generate_outline.py          # 아웃라인 생성 프롬프트
    generate_structure.py        # 슬라이드 구조 생성 프롬프트
    generate_slide_content.py    # 슬라이드 콘텐츠 생성 프롬프트
    edit_slide.py                # 슬라이드 편집 프롬프트
    edit_slide_html.py           # HTML 슬라이드 편집 프롬프트
  api/v1/ppt/endpoints/
    prompts.py                   # HTML/React 변환 프롬프트
```

### 4.2 아웃라인 생성 프롬프트

아웃라인 생성은 첫 번째 단계로, 프레젠테이션의 전체 구조를 결정한다:

```
시스템 프롬프트 구조:
- 역할: "프레젠테이션 구조 전문가"
- 입력: 사용자 텍스트, 슬라이드 수, 톤, 장황도
- 출력: 각 슬라이드의 제목과 요약 (JSON)

사용자 프롬프트에 포함되는 요소:
1. content: 사용자가 입력한 주제/내용
2. num_slides: 원하는 슬라이드 수 (기본 8)
3. tone: DEFAULT | CASUAL | PROFESSIONAL | FUNNY | EDUCATIONAL | SALES_PITCH
4. verbosity: 간결/보통/상세
5. language: 출력 언어
6. custom_instructions: 사용자 커스텀 지시사항
7. include_title_slide: 타이틀 슬라이드 포함 여부
8. include_table_of_contents: 목차 포함 여부
```

### 4.3 슬라이드 구조 생성 프롬프트

아웃라인이 생성된 후, 각 슬라이드의 상세 구조를 결정한다:

```
슬라이드 구조 결정 기준:
- 슬라이드 제목과 요약을 분석
- 적합한 레이아웃 타입 결정 (차트형, 불릿형, 이미지형 등)
- 필요한 데이터 필드 목록 생성
- 이미지/아이콘 필요 여부 결정
```

### 4.4 HTML 생성 프롬프트 (핵심 프롬프트)

PPTX 파일을 커스텀 템플릿으로 변환할 때 사용하는 프롬프트:

```
시스템 프롬프트 핵심 지시사항:
1. "Make sure the design from html and tailwind is exact to the slide"
   (슬라이드의 디자인을 HTML/Tailwind으로 정확히 재현)

2. OXML 데이터에서 정확한 위치와 크기 매칭

3. 레이아웃 우선순위:
   - flex/grid 레이아웃 먼저 사용
   - absolute positioning은 최후 수단

4. 반응형 텍스트:
   - 가용 공간에 따른 글자 수 제한
   - overflow 방지

5. 컨테이너 크기:
   - 최대 1280px x 720px (16:9 비율)

6. 불릿 포인트:
   - 유연한 배열 지원
   - 아이템 수 제한 명시
```

### 4.5 React 컴포넌트 변환 프롬프트

HTML을 동적 React/TSX 컴포넌트로 변환하는 프롬프트:

```
핵심 지시사항:
1. Zod 스키마 생성:
   - 모든 필드에 기본값 설정
   - 이미지/아이콘은 별도 스키마 (prompt + URL)
   - 반복 컴포넌트는 배열 지원

2. 컴포넌트 명명 규칙:
   - "dynamicSlideLayout" 형식

3. 글자/아이템 수 제한:
   - 시각적 분석 기반으로 정확한 제한 설정

4. 차트 지원:
   - Recharts 라이브러리 사용
   - 데이터 구조를 Zod 스키마로 정의

5. 다이어그램 지원:
   - Mermaid 라이브러리 사용
   - 다이어그램 정의를 스키마 필드로 포함

6. 출력 형식:
   - 코드만 반환 (설명 없음)
```

### 4.6 슬라이드 편집 프롬프트

사용자가 슬라이드를 수정할 때:

```
시스템 프롬프트 핵심 규칙:
1. "Do not change Image prompts and Icon queries if not asked"
   (요청하지 않은 이미지/아이콘은 변경하지 않음)

2. "Speaker note should be simple, clear, concise"
   (발표자 노트: 100-250자 제한)

3. 톤/장황도/커스텀 지시사항 유지

4. 기존 언어 유지

5. 구조화 출력:
   - 기존 스키마에서 이미지/아이콘 URL 필드 제거
   - speaker_notes 필드 추가
   - LLM이 콘텐츠만 수정하도록 유도
```

### 4.7 HTML 편집 프롬프트

스케치/이미지 기반 편집:

```
핵심 규칙:
1. 시각적 표시에 맞춰 변경
2. 표시되지 않은 요소는 변경하지 않음
3. 기존 디자인과의 일관성 유지
4. 프레젠테이션 크기(1280x720) 변경 불가
5. 코드만 출력
```

### 4.8 프롬프트 전략의 핵심 인사이트

**1. 단계적 생성 (Staged Generation)**
한 번에 전체 프레젠테이션을 생성하지 않고, 아웃라인 -> 구조 -> 콘텐츠로 나누어
각 단계에서 LLM의 부담을 줄인다. 이 패턴은 우리 프로젝트에서도 반드시 따라야 한다.

**2. 스키마 기반 강제 (Schema-Driven Generation)**
LLM에게 "자유롭게 JSON을 만들어줘"가 아니라, 정확한 JSON Schema를 전달하여
레이아웃 컴포넌트가 기대하는 형태의 데이터를 강제로 받는다.

**3. 필드 조작 전략**
편집 시 이미지/아이콘 URL 필드를 스키마에서 제거하여, LLM이 실수로
URL을 변경하는 것을 원천 차단한다. 매우 실용적인 접근.

**4. 톤/장황도 시스템**
6가지 톤 (default, casual, professional, funny, educational, sales_pitch)과
장황도 수준을 프롬프트에 주입하여 출력 스타일을 제어한다.

---

## 5. 슬라이드 생성 로직

### 5.1 레이아웃 결정 방법

Presenton의 레이아웃 결정은 두 단계로 이루어진다:

**1단계: LLM이 슬라이드 구조를 생성하면, 해당 구조에 맞는 레이아웃을 매칭**

```python
# models/presentation_layout.py
# 각 슬라이드의 레이아웃 정보를 담는 모델

# models/slide_layout_index.py
# 슬라이드 인덱스와 레이아웃 매핑
```

**2단계: 레이아웃 컴포넌트가 Zod 스키마를 노출하여, 해당 레이아웃에 필요한 데이터 형태를 결정**

각 레이아웃 컴포넌트(TSX 파일)는 자체 Zod 스키마를 정의하고 있어서,
LLM이 해당 스키마에 맞는 콘텐츠를 생성해야 한다.

### 5.2 레이아웃 타입 분류 (neo-general 테마 기준)

29개의 레이아웃이 다음 카테고리로 분류된다:

**텍스트 중심 레이아웃:**
```
- NumberedBulletsSlideLayout         # 번호 매김 불릿
- BulletWithIconsSlideLayout         # 아이콘 포함 불릿
- BulletIconsOnlySlideLayout         # 아이콘만 있는 불릿
- IndexedThreeColumnList             # 3컬럼 인덱스 목록
- TextSplitWithEmphasisBlock         # 강조 블록 포함 텍스트
- HeadlineTextWithBulletsAndStats    # 헤드라인 + 불릿 + 통계
- TitleWithGridBasedHeadingAndDescription  # 그리드 기반 헤드라인
```

**차트/데이터 레이아웃:**
```
- ChartWithBulletsSlideLayout        # 차트 + 불릿
- TitleWithFullWidthChart            # 전체 너비 차트
- TitleMetricsWithChart              # 지표 + 차트
- MultiChartGridSlideLayout          # 다중 차트 그리드
- TitleDescriptionMultiChartGridWithBullets   # 다중 차트 + 불릿
- TitleDescriptionMultiChartGridWithMetrics   # 다중 차트 + 지표
```

**이미지 레이아웃:**
```
- HeadlineDescriptionWithImage              # 헤드라인 + 이미지
- HeadlineDescriptionWithDoubleImage        # 헤드라인 + 이미지 2개
- MetricsWithImageSlideLayout               # 지표 + 이미지
```

**지표/통계 레이아웃:**
```
- GridBasedEightMetricsSnapshots     # 8개 지표 그리드
- LayoutTextBlockWithMetricCards     # 텍스트 + 지표 카드
- ChallengeAndOutcomeWithOneStat     # 과제/결과 + 통계
- TitleMetricValueMetricLabelFunnelStages  # 퍼널 지표
```

**특수 레이아웃:**
```
- TableOfContentWithoutPageNumber    # 목차
- TitleDescriptionWithTable          # 테이블
- Timeline                           # 타임라인
- QuoteSlideLayout                   # 인용구
- LeftAlignQuote                     # 좌측 정렬 인용구
- TeamSlideLayout                    # 팀 소개
- TitleTopDescriptionFourTeamMembersGrid  # 팀원 그리드
- ThankYouContactInfoFooterImageSlide    # 감사 슬라이드
- TitleThreeColumnRiskConstraints    # 3컬럼 리스크/제약
```

### 5.3 콘텐츠 배치 알고리즘

콘텐츠 배치는 React 컴포넌트 수준에서 이루어진다:

```
1. LLM이 Zod 스키마에 맞는 JSON 데이터 생성
2. JSON 데이터가 React 컴포넌트의 props로 전달
3. 각 컴포넌트가 Tailwind CSS로 레이아웃 결정
4. 1280x720 컨테이너 내에서 반응형 렌더링
```

핵심 원칙:
- **절대 위치(absolute positioning) 최소화**: flex/grid 우선
- **글자 수 제한**: 각 영역의 가용 공간에 따른 maxLength 설정
- **배열 아이템 수 제한**: 불릿/카드 등의 최대 개수 지정
- **overflow 방지**: CSS overflow-hidden + 텍스트 truncation

### 5.4 컴포넌트 시스템

각 레이아웃 컴포넌트의 구조:

```typescript
// 예시: BulletWithIconsSlideLayout.tsx (추정 구조)

import { z } from "zod";

// 1. Zod 스키마 정의
const bulletItemSchema = z.object({
  title: z.string().max(40).default("Bullet Title"),
  description: z.string().max(120).default("Description text"),
  __icon_query__: z.string().default("settings"),
  __icon_url__: z.string().default("/placeholder-icon.svg"),
});

const slideSchema = z.object({
  headline: z.string().max(60).default("Slide Headline"),
  bullets: z.array(bulletItemSchema).max(4).default([]),
});

// 2. React 컴포넌트
export default function BulletWithIconsSlideLayout({
  data
}: {
  data: z.infer<typeof slideSchema>
}) {
  return (
    <div className="w-[1280px] h-[720px] p-16 flex flex-col">
      <h2 className="text-4xl font-bold mb-8">{data.headline}</h2>
      <div className="grid grid-cols-2 gap-6 flex-1">
        {data.bullets.map((bullet, i) => (
          <div key={i} className="flex items-start gap-4">
            <img src={bullet.__icon_url__} className="w-12 h-12" />
            <div>
              <h3 className="text-xl font-semibold">{bullet.title}</h3>
              <p className="text-base text-gray-600">{bullet.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. 스키마 내보내기 (LLM에 전달용)
export { slideSchema };
```

### 5.5 에셋 처리 파이프라인

슬라이드 콘텐츠가 생성된 후, 에셋을 비동기로 처리한다:

```python
# utils/process_slides.py

async def process_slide_and_fetch_assets(slide_content, output_dir):
    """
    1. 슬라이드 데이터에서 __image_prompt__, __icon_query__ 키 탐색
    2. 각 에셋에 대해 비동기 fetch 실행
       - 이미지: image_generation_service.generate_image()
       - 아이콘: icon_finder_service.find_icon()
    3. 생성된 URL로 슬라이드 데이터 업데이트
    4. 생성된 에셋 목록 반환
    """

async def process_old_and_new_slides_and_fetch_assets(
    old_content, new_content, output_dir
):
    """
    편집 시 최적화:
    - 이전 슬라이드와 새 슬라이드의 프롬프트/쿼리 비교
    - 동일한 프롬프트면 이전 URL 재사용
    - 변경된 것만 새로 생성
    -> 불필요한 API 호출 방지
    """
```

이 "이전 URL 재사용" 패턴은 비용 절감과 속도 향상에 매우 효과적이다.

---

## 6. 디자인 시스템

### 6.1 테마 시스템

Presenton은 테마를 "프레젠테이션 템플릿"이라고 부르며,
각 테마는 독립적인 디렉토리에 레이아웃 컴포넌트 세트와 settings.json으로 구성된다.

```
electron/servers/nextjs/app/presentation-templates/
  neo-general/                    # 기본 범용 테마
    settings.json                 # 테마 설정
    BulletWithIconsSlideLayout.tsx
    ChartWithBulletsSlideLayout.tsx
    ... (29개 레이아웃 파일)
```

### 6.2 settings.json 구조 (추정)

```json
{
  "name": "Neo General",
  "description": "Modern general-purpose presentation template",
  "fonts": {
    "heading": "Inter",
    "body": "Inter"
  },
  "colors": {
    "primary": "#1a1a2e",
    "secondary": "#16213e",
    "accent": "#0f3460",
    "background": "#ffffff",
    "text": "#1a1a2e"
  },
  "layouts": [
    "BulletWithIconsSlideLayout",
    "ChartWithBulletsSlideLayout",
    ...
  ]
}
```

### 6.3 커스텀 템플릿 생성 파이프라인

기존 PPTX에서 커스텀 템플릿을 생성하는 과정:

```
[PPTX 업로드]
    |
    v
[LibreOffice로 PDF 변환]
    |
    v
[슬라이드별 PNG 스크린샷 생성]
    |
    v
[OXML(Open XML) 데이터 추출]
    |
    v
[폰트 분석 및 정규화]
    |
    v
[GPT-5 Vision으로 HTML 생성]     <-- 슬라이드 이미지 + OXML 데이터를 LLM에 전달
    |
    v
[HTML -> React/TSX 변환]          <-- 두 번째 LLM 호출
    |
    v
[Zod 스키마 자동 생성]
    |
    v
[DB에 레이아웃 코드 저장]
    |
    v
[커스텀 템플릿 사용 가능]
```

이 파이프라인은 매우 혁신적이다. 기존 PPTX를 "디컴파일"하여
재사용 가능한 React 컴포넌트로 변환한다.

### 6.4 폰트 처리

```python
# 폰트 정규화 로직 (pptx_slides.py에서)

def normalize_font_name(font_name):
    """
    'Montserrat Bold Italic' -> 'Montserrat'
    스타일 디스크립터 제거:
    - italic, bold, light, medium, thin, black, condensed 등
    - camelCase 분리
    - 가중치 숫자 제거 (100-900)
    """

# Google Fonts 호환성 확인
async def check_google_fonts_availability(font_name):
    """
    정규화된 폰트명이 Google Fonts에 존재하는지 확인
    존재하면: 포맷된 URL 반환 (https://fonts.googleapis.com/css2?family=...)
    미존재: 지원되지 않는 폰트 목록에 추가
    """
```

### 6.5 색상/스타일 처리

```
1. 테마 수준 색상: settings.json에서 정의
2. 컴포넌트 수준 색상: Tailwind CSS 클래스로 직접 적용
3. 동적 색상: LLM이 콘텐츠와 함께 색상 결정하지 않음 (테마 고정)
```

이 접근 방식의 장점: 디자인 일관성 보장. LLM이 색상을 결정하면 매번 다른 결과가 나올 수 있다.

### 6.6 UI 컴포넌트 구조 (Radix UI 기반)

프론트엔드 UI는 Radix UI 프리미티브를 기반으로 한다:

```
사용된 Radix UI 컴포넌트 (28개):
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
```

---

## 7. PPTX/PDF 내보내기

### 7.1 PPTX 생성 파이프라인

이것이 Presenton의 가장 복잡한 부분 중 하나이다:

```
[React 슬라이드 렌더링 (브라우저/Puppeteer)]
    |
    v
[DOM 요소 분석]
    |     |
    |     v
    |  [HTML 텍스트 구조 추출]
    |     html_to_text_runs_service.py
    |     -> 텍스트 런(run) 분리
    |     -> 볼드/이탤릭/색상/크기 추출
    |
    v
[스크린샷 캡처 (html2canvas/Puppeteer)]
    |
    v
[python-pptx로 PPTX 생성]
    |
    +-- 텍스트 박스: 위치, 크기, 스타일 정보로 생성
    +-- 이미지: 스크린샷에서 추출 또는 원본 사용
    +-- 차트: 이미지로 변환하여 삽입
    +-- 배경: 슬라이드 배경 이미지/색상 설정
    |
    v
[PPTX 파일 저장]
```

### 7.2 PPTX 모델 변환 (Next.js API Route)

```
경로: /api/presentation_to_pptx_model/route.ts

이 API는 프론트엔드의 슬라이드 렌더링 결과를 분석하여
python-pptx에 전달할 데이터 모델로 변환한다:

1. 각 슬라이드의 DOM 트리 순회
2. 텍스트 요소 -> TextBox 모델
3. 이미지 요소 -> Picture 모델
4. SVG 요소 -> Picture 모델 (래스터화)
5. 차트 요소 -> Picture 모델 (스크린샷)
6. 위치/크기 정보를 EMU(English Metric Units) 변환
```

### 7.3 python-pptx 기반 PPTX 생성

```python
# services/pptx_presentation_creator.py

class PptxPresentationCreator:
    """
    python-pptx 라이브러리를 사용한 PPTX 파일 생성

    핵심 메서드:
    - create_presentation()     # 새 Presentation 객체 생성
    - add_slide()               # 슬라이드 추가
    - add_text_box()            # 텍스트 박스 배치
    - add_image()               # 이미지 삽입
    - set_background()          # 배경 설정
    - apply_text_formatting()   # 텍스트 서식 적용

    좌표계:
    - EMU (English Metric Units) 사용
    - 1인치 = 914400 EMU
    - 슬라이드: 10인치 x 7.5인치 (9144000 x 6858000 EMU)
    """
```

### 7.4 HTML -> 텍스트 런 변환

PPTX에서 텍스트의 서식을 유지하기 위해, HTML의 텍스트 구조를 분석한다:

```python
# services/html_to_text_runs_service.py

class HtmlToTextRunsService:
    """
    HTML의 텍스트를 python-pptx의 텍스트 런(Run)으로 변환

    예시:
    <p>This is <b>bold</b> and <i>italic</i> text</p>

    변환 결과:
    [
        TextRun(text="This is ", bold=False, italic=False),
        TextRun(text="bold", bold=True, italic=False),
        TextRun(text=" and ", bold=False, italic=False),
        TextRun(text="italic", bold=False, italic=True),
        TextRun(text=" text", bold=False, italic=False),
    ]

    지원 서식:
    - bold, italic, underline
    - font-size, font-family, color
    - text-align
    - line-height
    """
```

### 7.5 PDF 내보내기

PDF 내보내기는 상대적으로 단순하다:

```
[Puppeteer/Chromium으로 슬라이드 렌더링]
    |
    v
[각 슬라이드를 PDF 페이지로 캡처]
    |
    v
[PDF 파일 합성]
```

환경변수:
```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium  # Docker에서
```

### 7.6 LibreOffice 통합

PPTX 파일 분석과 추가 변환에 LibreOffice를 사용한다:

```python
# PPTX -> PDF 변환 (커스텀 템플릿 생성 시)
subprocess.run([
    "libreoffice",
    "--headless",
    "--convert-to", "pdf",
    "--outdir", output_dir,
    pptx_path
])

# Electron 앱에서 LibreOffice 자동 설치
# utils/libreoffice-check.ts - 설치 여부 확인
# utils/libreoffice-urls.ts - OS별 다운로드 URL
# ipc/libreoffice_install_handlers.ts - 설치 프로세스 관리
```

### 7.7 PPTX 품질 수준 분석

Presenton의 PPTX 출력 품질에 대한 알려진 이슈들:

```
Issue #404: "Headlines missing in exported pptx File"
Issue #403: "Generated content does not fit exactly into the slide"
Issue #416: "Custom templates dont export images into pptx but in pdf"
```

이는 PPTX 변환의 근본적 한계를 보여준다:
1. DOM -> PPTX 변환 시 일부 요소 누락 가능
2. CSS 레이아웃과 PPTX 레이아웃의 차이로 위치 불일치
3. 이미지 처리에서 커스텀 템플릿 특수 케이스 미처리

---

## 8. 차트/다이어그램/이미지 처리

### 8.1 차트 시스템 (Recharts)

```typescript
// 프론트엔드에서 Recharts 사용
// 패키지: recharts 2.15.4

// 차트 데이터는 Zod 스키마로 정의되어 LLM이 생성:
const chartDataSchema = z.object({
  data: z.array(z.object({
    label: z.string(),
    value: z.number(),
  })),
  chartType: z.enum(["bar", "line", "pie", "area"]),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
});
```

차트 레이아웃 종류:
- `ChartWithBulletsSlideLayout` - 차트 + 불릿 포인트
- `TitleWithFullWidthChart` - 전체 너비 차트
- `TitleMetricsWithChart` - 지표 + 차트
- `MultiChartGridSlideLayout` - 다중 차트 그리드 (2x2, 3x1 등)
- `TitleDescriptionMultiChartGridWithBullets` - 다중 차트 + 불릿
- `TitleDescriptionMultiChartGridWithMetrics` - 다중 차트 + 지표

PPTX 내보내기 시 차트는 **이미지로 래스터화**되어 삽입된다.
이는 python-pptx의 네이티브 차트 기능을 사용하지 않는다는 의미이다.

### 8.2 다이어그램 시스템 (Mermaid)

```typescript
// Mermaid 11.9.0 사용
// 다이어그램 정의가 Zod 스키마 필드로 포함

// 예시 Mermaid 다이어그램 코드 (LLM이 생성):
const mermaidCode = `
graph TD
    A[시작] --> B{판단}
    B -->|예| C[실행]
    B -->|아니오| D[종료]
`;
```

Mermaid 다이어그램도 PPTX 내보내기 시 이미지로 래스터화된다.

### 8.3 이미지 생성 서비스

```python
# services/image_generation_service.py

class ImageGenerationService:
    """7개 이미지 프로바이더 지원"""

    def __init__(self, output_dir):
        self.output_dir = output_dir
        # 환경변수로 프로바이더 결정

    async def generate_image(self, image_prompt: ImagePrompt):
        """프로바이더에 따라 적절한 메서드 호출"""

    # === AI 이미지 생성 ===

    async def generate_image_openai_dalle3(self, prompt):
        """DALL-E 3으로 이미지 생성
        - base64 인코딩 응답
        - PNG 파일로 저장
        - UUID 파일명
        """

    async def generate_image_openai_gpt_image_1_5(self, prompt):
        """GPT-Image-1.5로 이미지 생성
        - 최신 OpenAI 이미지 모델
        """

    async def generate_image_gemini_flash(self, prompt):
        """Google Gemini Flash로 이미지 생성
        - asyncio 스레딩으로 비동기 처리
        - JPEG 파일로 저장
        """

    # === 스톡 이미지 ===

    async def get_image_from_pexels(self, query):
        """Pexels API에서 관련 이미지 검색
        - URL 직접 반환 (로컬 저장 없음)
        """

    async def get_image_from_pixabay(self, query):
        """Pixabay API에서 관련 이미지 검색
        - URL 직접 반환
        """

    # === 커스텀 이미지 생성 ===

    async def generate_image_comfyui(self, prompt):
        """ComfyUI 워크플로우 기반 이미지 생성
        1. 워크플로우 JSON에 프롬프트 주입
        2. ComfyUI API에 제출
        3. 완료 대기 (폴링)
        4. 생성된 이미지 다운로드
        """
```

환경변수 설정:
```bash
IMAGE_PROVIDER=dalle3          # dalle3 | gpt_image_1_5 | gemini_flash |
                               # pexels | pixabay | comfyui | nanobanana | disabled
IMAGE_API_KEY=...              # 이미지 생성 API 키
PEXELS_API_KEY=...             # Pexels 전용
PIXABAY_API_KEY=...            # Pixabay 전용
COMFYUI_BASE_URL=...           # ComfyUI 서버 URL
```

### 8.4 아이콘 검색 시스템

```python
# services/icon_finder_service.py

class IconFinderService:
    """벡터 검색 기반 아이콘 파인더

    사전 구축된 아이콘 벡터 스토어:
    - assets/icons-vectorstore.json (15.1MB)
    - assets/icons.json (6.5MB)

    아이콘 컬렉션:
    - static/icons/bold/ 디렉토리에 수백 개의 SVG 아이콘

    검색 방식:
    1. 사용자 쿼리를 벡터로 변환 (FastEmbed)
    2. 벡터 스토어에서 유사도 검색
    3. 가장 유사한 아이콘 SVG 경로 반환
    """
```

### 8.5 이미지/아이콘의 데이터 구조

슬라이드 데이터에서 이미지와 아이콘은 특수 키로 표현된다:

```json
{
  "headline": "Our Team",
  "members": [
    {
      "name": "John Doe",
      "role": "CEO",
      "__image_prompt__": "professional headshot of a business executive",
      "__image_url__": "",
      "__icon_query__": "leadership",
      "__icon_url__": ""
    }
  ]
}
```

`__image_prompt__`와 `__icon_query__`는 LLM이 생성하고,
`__image_url__`과 `__icon_url__`은 에셋 처리 파이프라인이 채운다.

이 더블 언더스코어 컨벤션은 일반 텍스트 필드와 에셋 필드를 명확히 구분한다.

### 8.6 플레이스홀더 시스템

에셋 생성이 실패하거나 비활성화된 경우:

```python
async def process_slide_add_placeholder_assets(slide_content):
    """
    이미지: 기본 플레이스홀더 이미지 URL
    아이콘: 기본 플레이스홀더 아이콘 URL
    -> UI에서 "이미지 생성 중..." 같은 표시 가능
    """
```

---

## 9. 프론트엔드 UI/UX

### 9.1 프론트엔드 앱 구조

```
electron/servers/nextjs/
  app/
    (presentation-generator)/      # 프레젠테이션 생성 그룹
      components/                  # 공통 컴포넌트
        EditableLayoutWrapper.tsx   # 인라인 편집 래퍼
        HeaderNab.tsx              # 헤더 내비게이션
        IconsEditor.tsx            # 아이콘 편집기
        ImageEditor.tsx            # 이미지 편집기
        MarkdownEditor.tsx         # 마크다운 편집기
        NewSlide.tsx               # 새 슬라이드 추가
        PresentationMode.tsx       # 프레젠테이션 모드
        PresentationRender.tsx     # 슬라이드 렌더링 (ScaleWrapper)
        SlideErrorBoundary.tsx     # 에러 바운더리
        TiptapText.tsx             # TipTap 텍스트 편집기
        TiptapTextReplacer.tsx     # 텍스트 교체 유틸
        V1ContentRender.tsx        # 핵심 콘텐츠 렌더러
      outline/                     # 아웃라인 페이지
        components/                # 아웃라인 전용 컴포넌트
        hooks/                     # 아웃라인 커스텀 훅
        types/                     # 타입 정의
        page.tsx                   # 아웃라인 페이지
        loading.tsx                # 로딩 상태
      [presentation_id]/           # 동적 라우트 (프레젠테이션 편집)
        page.tsx
    presentation-templates/        # 템플릿 컴포넌트
      neo-general/                 # 기본 테마 (29개 레이아웃)
        settings.json
        ...tsx
    api/
      presentation_to_pptx_model/  # PPTX 모델 변환 API
        route.ts
  store/
    store.ts                       # Redux 스토어 설정
    slices/                        # Redux 슬라이스들
```

### 9.2 상태 관리 (Redux Toolkit)

```typescript
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';

// 4개의 슬라이스로 상태 관리 (추정):
// 1. presentationSlice - 프레젠테이션 데이터 (슬라이드, 콘텐츠)
// 2. editorSlice - 편집기 상태 (선택된 슬라이드, 편집 모드)
// 3. themeSlice - 테마/템플릿 설정
// 4. uiSlice - UI 상태 (모달, 사이드바 등)
```

### 9.3 슬라이드 렌더링 시스템

**PresentationRender.tsx (SlideScale 컴포넌트)**:

```typescript
// 핵심 로직: 1280x720 기준으로 반응형 스케일링

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

function SlideScale({ children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      const safeWidth = Math.max(width, 100);
      setScale(Math.min((safeWidth / BASE_WIDTH) * 0.98, 1));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full shadow-lg">
      <div style={{ maxWidth: BASE_WIDTH, height: BASE_HEIGHT * scale }}>
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          userSelect: "none",
        }}>
          <V1ContentRender editMode={true} />
          <div className="absolute inset-0 z-30 bg-transparent" />
        </div>
      </div>
    </div>
  );
}
```

핵심 포인트:
- `ResizeObserver`로 실시간 컨테이너 크기 감시
- CSS `transform: scale()`로 비례 축소/확대
- `transformOrigin: "top left"`로 일관된 스케일링
- 투명 오버레이(z-30)로 슬라이드 위 클릭 이벤트 캡처
- `userSelect: none`으로 텍스트 선택 방지

### 9.4 인라인 편집 시스템 (EditableLayoutWrapper)

이 컴포넌트가 프론트엔드에서 가장 복잡한 부분이다:

```typescript
// EditableLayoutWrapper.tsx - 핵심 동작

// 1. DOM 요소 탐색
// 슬라이드 렌더링 후 400ms 대기 -> 모든 img/svg 요소 탐색

// 2. URL 매칭 전략
function isMatchingUrl(domUrl, dataUrl) {
  // 단계적 매칭:
  // a. 정확한 비교
  // b. 프로토콜 정규화 (http/https)
  // c. 플레이스홀더 감지
  // d. 파일명 추출 + 길이 검증
}

// 3. 인터랙션
// - 이미지 클릭 -> ImageEditor 활성화
// - SVG 아이콘 클릭 -> IconsEditor 활성화
// - hover 시 커서 변경 + 투명도 트랜지션

// 4. 상태 동기화
// - DOM 업데이트와 Redux 스토어 동시 갱신
// - 이미지 URL, 프롬프트, object-fit, focus point 관리

// 5. MutationObserver
// - DOM 변경 감지 -> 새로 추가된 미디어 요소 처리
// - 동적으로 추가되는 이미지/아이콘에도 편집 기능 적용
```

### 9.5 이미지 편집기 (ImageEditor)

```typescript
// ImageEditor.tsx - 3개 탭 구성

// Tab 1: AI 생성
// - 프롬프트 입력 -> API 호출 -> 이미지 그리드 표시
// - 생성 히스토리 유지
// - 로딩 시 Skeleton 플레이스홀더

// Tab 2: 업로드
// - 5MB 크기 제한
// - 이미지 형식만 허용
// - 이전 업로드 이미지 브라우징
// - 개별 삭제 (hover 시 삭제 아이콘)

// Tab 3: 편집
// - Object-fit 옵션: cover | contain | fill
// - Focus point 조정: 클릭으로 설정 (십자선 표시)

// UI 패턴:
// - Sheet 모달 (하단에서 슬라이드 업)
// - 닫을 때 300ms 애니메이션
// - Sonner 토스트로 에러 피드백
// - Mixpanel 이벤트 트래킹
```

### 9.6 텍스트 편집 (TipTap)

```typescript
// TiptapText.tsx
// TipTap 2.11.5 기반 리치 텍스트 편집기

// 지원 확장:
// - Underline (밑줄)
// - Markdown (마크다운 입력/출력)

// 편집 흐름:
// 1. 슬라이드의 텍스트 요소 클릭
// 2. TipTap 에디터 인라인 활성화
// 3. 편집 완료 시 Redux 스토어 업데이트
// 4. LLM 재생성 없이 즉시 반영
```

### 9.7 드래그 앤 드롭 (dnd-kit)

```typescript
// @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
// 슬라이드 순서 재배열에 사용

// 사용 패턴:
// - 사이드바에서 슬라이드 썸네일 드래그
// - 순서 변경 시 Redux 스토어 업데이트
// - 애니메이션 트랜지션 적용
```

### 9.8 프레젠테이션 모드

```typescript
// PresentationMode.tsx
// 전체 화면 프레젠테이션 뷰어

// 기능:
// - 전체 화면 모드
// - 키보드 네비게이션 (좌우 화살표, ESC)
// - 슬라이드 트랜지션
// - 발표자 노트 표시 (선택적)
```

### 9.9 Next.js 라우팅 구조

```
/ (홈페이지)                    -> Electron: resources/ui/homepage/
/(presentation-generator)/
  /outline                     -> 아웃라인 편집 페이지
  /[presentation_id]           -> 프레젠테이션 편집 페이지
/presentation-templates/       -> 템플릿 파일 (서빙용)
/api/                          -> API 라우트
```

### 9.10 테마 지원 (next-themes)

```typescript
// next-themes 0.4.6 사용
// 다크/라이트 모드 전환 지원
// system 설정 자동 감지
```

---

## 10. 기술 스택

### 10.1 백엔드 (Python)

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| FastAPI | 최신 | 웹 프레임워크 |
| uvicorn | 최신 | ASGI 서버 |
| python-pptx | - | PPTX 파일 생성 |
| openai | 최신 | OpenAI API 클라이언트 |
| anthropic | 최신 | Anthropic API 클라이언트 |
| google-genai | 최신 | Google GenAI 클라이언트 |
| aiohttp | 최신 | 비동기 HTTP 클라이언트 |
| chromadb | 최신 | 벡터 데이터베이스 (아이콘 검색) |
| docling | 최신 | 문서 로딩 (PDF, DOCX) |
| pdfplumber | 최신 | PDF 텍스트 추출 |
| sqlalchemy | 최신 | ORM (비동기) |
| sqlmodel | 최신 | SQL + Pydantic 통합 |
| pydantic | 최신 | 데이터 검증 |
| fastembed | - | 벡터 임베딩 (아이콘 검색) |
| fastmcp | - | MCP 서버 |

### 10.2 프론트엔드 (TypeScript/React)

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| Next.js | 14.2.14 | React 프레임워크 |
| React | 18.3.1 | UI 라이브러리 |
| Redux Toolkit | 2.2.8 | 상태 관리 |
| Radix UI | (28 패키지) | UI 프리미티브 |
| Tailwind CSS | - | 유틸리티 CSS |
| TipTap | 2.11.5 | 리치 텍스트 편집기 |
| Recharts | 2.15.4 | 차트 시각화 |
| Mermaid | 11.9.0 | 다이어그램 |
| dnd-kit | - | 드래그 앤 드롭 |
| html2canvas | 1.4.1 | DOM 스크린샷 |
| Puppeteer | 24.13.0 | 브라우저 자동화 |
| Zod | 4.0.5 | 스키마 검증 |
| Marked | 15.0.11 | 마크다운 파서 |
| Prismjs | 1.30.0 | 코드 하이라이팅 |
| Sonner | 2.0.6 | 토스트 알림 |
| next-themes | 0.4.6 | 테마 (다크/라이트) |
| uuid | 11.1.0 | UUID 생성 |
| Mixpanel | 2.67.0 | 분석 |
| @babel/standalone | 7.28.2 | 런타임 JSX 변환 |

### 10.3 데스크톱 (Electron)

| 기술 | 용도 |
|------|------|
| Electron | 데스크톱 앱 쉘 |
| electron-builder | 앱 패키징/배포 |
| IPC (Inter-Process Communication) | 프로세스 간 통신 |
| settings-store | 로컬 설정 영구 저장 |

### 10.4 인프라/배포

| 기술 | 용도 |
|------|------|
| Docker | 컨테이너 배포 |
| docker-compose | 멀티 서비스 관리 |
| nginx | 리버스 프록시 |
| LibreOffice | PPTX/PDF 변환 |
| Chromium | Puppeteer 렌더링 |
| PyInstaller | Python 앱 패키징 (Electron용) |

### 10.5 빌드 시스템

```
프론트엔드 빌드:
  Next.js -> npm run build -> .next/ 디렉토리

백엔드 빌드 (Electron용):
  PyInstaller -> server.spec -> 단일 실행 파일

Electron 빌드:
  electron-builder -> build.js -> 플랫폼별 패키지
  - Windows: NSIS 설치 프로그램 (installer.nsh)
  - macOS: DMG
  - Linux: AppImage/deb
```

### 10.6 데이터베이스

```python
# services/database.py
# SQLAlchemy 비동기 엔진 + SQLModel

# 지원 DB:
# - SQLite (기본, 로컬 실행)
# - PostgreSQL (Docker/프로덕션)
# - MySQL (선택적)

# 테이블:
# - presentations          # 프레젠테이션 메타데이터
# - slides                 # 슬라이드 데이터
# - presentation_layouts   # 레이아웃 코드 (커스텀 템플릿)
# - templates              # 템플릿 메타데이터
# - webhook_subscriptions  # 웹훅 구독
```

---

## 11. 제한사항 & 약점

### 11.1 알려진 이슈 (GitHub Issues 분석)

총 53개의 오픈 이슈 중 주요 카테고리:

**커스텀 템플릿 관련 (가장 빈번):**
```
#429 - 커스텀 템플릿 내보내기/공유 불가
#417 - AI에게 템플릿 변경 요청 시 이미지 플레이스홀더 파괴
#416 - 커스텀 템플릿에서 PPTX로 이미지 미내보내기 (PDF는 정상)
#408 - 생성된 커스텀 템플릿이 PPT 생성에서 사용 불가
#405 - 커스텀 템플릿 생성 자체가 작동하지 않음
```

**PPTX 내보내기 관련:**
```
#404 - 내보낸 PPTX에서 헤드라인 누락
#403 - 생성된 콘텐츠가 슬라이드에 정확히 맞지 않음
```

**LLM/이미지 관련:**
```
#434 - ComfyUI 이미지 생성 시 노이즈만 생성
#426 - Docker/Desktop에서 Custom LLM 작동 안 함
```

**배포 관련:**
```
#413 - Kubernetes/OpenShift용 Non-Root 컨테이너 미지원
#415 - 문서 오류
```

### 11.2 아키텍처 약점

**1. 이중 서버 아키텍처의 복잡성**
```
FastAPI (Python) + Next.js (Node.js) 두 서버를 동시에 실행해야 한다.
- 리소스 소비 증가
- 배포 복잡성 증가
- 두 언어 생태계 동시 관리 필요
- 통신 오버헤드 (HTTP IPC)
```

**2. Puppeteer/LibreOffice 의존성**
```
- 무거운 시스템 의존성
- Docker 이미지 크기 증가
- Chromium + LibreOffice = 수백 MB
- Electron 데스크톱 앱에서 별도 설치 필요
```

**3. PPTX 변환의 근본적 한계**
```
HTML/CSS -> PPTX 변환은 본질적으로 "손실 변환(lossy conversion)"이다.
- CSS 레이아웃과 PPTX 레이아웃의 모델이 다름
- 복잡한 CSS (flex, grid)를 PPTX의 좌표 기반 레이아웃으로 변환해야 함
- 폰트 렌더링 차이
- 차트/다이어그램은 이미지로 래스터화 (편집 불가)
```

**4. 커스텀 템플릿의 불안정성**
```
GitHub Issues에서 가장 많이 보고되는 문제.
LLM이 PPTX -> HTML -> React 변환을 수행하므로:
- 변환 품질이 LLM 성능에 의존
- 복잡한 레이아웃에서 실패 가능
- 반복 실행 시 결과가 달라질 수 있음
```

**5. 단일 테마 편향**
```
현재 기본으로 제공되는 테마가 neo-general 하나뿐이다.
커스텀 템플릿 기능이 불안정하므로, 사실상 디자인 다양성이 제한적이다.
```

### 11.3 성능 약점

```
1. LLM 호출 횟수: 프레젠테이션 생성에 최소 3-4번의 LLM 호출 필요
   (아웃라인 + 구조 + 슬라이드별 콘텐츠)
   -> 비용과 시간 모두 증가

2. 에셋 생성: 이미지/아이콘 생성이 별도 API 호출
   -> 슬라이드가 많을수록 시간 급증

3. PPTX 변환: Puppeteer DOM 캡처 -> python-pptx
   -> 두 번의 처리가 필요하여 느림

4. 메모리: Chromium + Node.js + Python + SQLite
   -> 동시에 4개 런타임 실행으로 메모리 사용량 높음
```

### 11.4 UX 약점

```
1. 초기 설정 복잡: Python 3.11 + Node.js + LibreOffice 필요
2. 에셋 생성 대기: 이미지 생성에 상당한 시간 소요
3. 편집 제한: 레이아웃 자체 변경은 불가 (콘텐츠만 편집)
4. 오프라인 제한: Ollama 외에는 인터넷 필요
5. 차트 편집: 차트 데이터 직접 수정 UI 부재 (추정)
```

---

## 12. PPT Agent 프로젝트 적용 인사이트

### 12.1 아키텍처 차용

**우리의 장점: 단일 스택 (Next.js/TypeScript)**

Presenton의 이중 서버 구조(Python + Node.js)는 복잡하다.
우리는 TypeScript 단일 스택이므로:

```
차용할 것:
- SSE 기반 실시간 진행 상황 전달 패턴
- 단계적 생성 파이프라인 (아웃라인 -> 구조 -> 콘텐츠)
- Redux Toolkit 기반 상태 관리

차용하지 않을 것:
- 이중 서버 아키텍처 (우리는 Next.js API Route로 통합)
- PyInstaller/Electron 복잡한 빌드 파이프라인
```

### 12.2 LLM 통합 패턴

**강력히 차용해야 할 패턴:**

```typescript
// 1. 프로바이더 추상화 레이어
// Presenton의 LLMClient처럼 여러 프로바이더를 통합

interface LLMClient {
  generate(messages: Message[]): Promise<string>;
  generateStructured<T>(messages: Message[], schema: ZodSchema<T>): Promise<T>;
  stream(messages: Message[]): AsyncGenerator<string>;
}

// 2. 환경변수 기반 프로바이더 전환
// LLM_PROVIDER=openai|anthropic|google
// LLM_MODEL=gpt-4o
// LLM_API_KEY=...

// 3. 구조화 출력 강제
// Zod 스키마 -> JSON Schema -> LLM response_format
// 이것이 품질 보장의 핵심
```

### 12.3 프롬프트 전략 차용

```
차용할 전략:

1. 단계적 생성 (Staged Generation)
   아웃라인 -> 구조 -> 콘텐츠로 3단계 분리
   각 단계에서 LLM의 인지 부하 감소

2. 스키마 기반 응답 강제
   각 레이아웃의 Zod 스키마를 LLM에 전달
   -> 타입 안전한 슬라이드 데이터 보장

3. 필드 조작 전략
   편집 시 URL 필드 제거 -> LLM이 URL을 만지지 못하게

4. 톤/장황도 시스템
   6가지 톤 + 장황도 수준으로 출력 스타일 제어

5. 이미지/아이콘 분리 프롬프트
   __image_prompt__, __icon_query__ 컨벤션
   콘텐츠 생성과 에셋 생성을 분리
```

### 12.4 PPTX 생성 방법

**Presenton 방식의 문제점과 대안:**

```
Presenton 방식:
  HTML DOM -> Puppeteer 캡처 -> python-pptx -> PPTX

  장점: 시각적 정확도 높음 (보이는 대로 변환)
  단점: Python 의존, 변환 손실, 차트 래스터화

우리 프로젝트를 위한 추천 방식:

방식 A: pptxgenjs (TypeScript 네이티브)
  장점: Python 불필요, TypeScript 생태계
  단점: CSS 레이아웃을 좌표로 수동 변환 필요

방식 B: officegen (Node.js)
  장점: 가벼움, Node.js 네이티브
  단점: 기능 제한적

방식 C: Presenton과 동일한 Puppeteer 기반
  장점: 시각적 정확도
  단점: 무거움, 복잡

추천: 방식 A (pptxgenjs)
  -> TypeScript 네이티브, 가장 넓은 기능 지원
  -> 차트를 네이티브 PPTX 차트로 생성 가능
  -> 텍스트 서식 완전 제어 가능
```

### 12.5 테마/템플릿 시스템 차용

```typescript
// Presenton의 설계를 TypeScript로 재구현

// 1. 테마 구조
interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layouts: LayoutComponent[];
}

// 2. 레이아웃 컴포넌트 구조
interface LayoutComponent {
  name: string;               // "BulletWithIcons"
  category: LayoutCategory;   // "text" | "chart" | "image" | "metric"
  schema: ZodSchema;          // Zod 스키마 (LLM용)
  render: React.FC<Props>;    // React 렌더러 (미리보기용)
  toPptx: (data: Props) => PptxSlide;  // PPTX 변환 함수
}

// 3. 레이아웃 카테고리
type LayoutCategory =
  | "text"      // 텍스트 중심
  | "chart"     // 차트 포함
  | "image"     // 이미지 포함
  | "metric"    // 지표/통계
  | "special";  // 목차, 타임라인, 감사 등
```

### 12.6 컴포넌트 구조 차용

```
Presenton에서 차용할 컴포넌트 패턴:

1. SlideScale (반응형 스케일링)
   - ResizeObserver + CSS transform
   - 1280x720 기준 비례 축소/확대
   -> 우리 프로젝트에도 동일하게 적용

2. EditableLayoutWrapper (인라인 편집)
   - DOM 순회로 편집 가능 요소 탐색
   - MutationObserver로 동적 변경 감지
   - URL 매칭으로 데이터-DOM 연결
   -> 복잡하지만 강력한 패턴

3. ImageEditor (이미지 관리)
   - AI 생성 / 업로드 / 편집 3탭 구조
   - focus point 조정
   - object-fit 옵션
   -> UX 참고하여 유사하게 구현

4. TipTap 기반 텍스트 편집
   - 인라인 리치 텍스트 편집
   - 마크다운 입출력
   -> TipTap은 우리도 그대로 사용 가능

5. ErrorBoundary
   - 슬라이드별 에러 격리
   -> React 베스트 프랙티스, 반드시 적용
```

### 12.7 데이터 흐름 패턴

```
Presenton의 데이터 흐름 (차용 추천):

사용자 입력
    |
    v
[Redux Store: outline 상태]
    |
    v
SSE로 아웃라인 수신 -> outline 업데이트
    |
    v
[Redux Store: structure 상태]
    |
    v
SSE로 구조 수신 -> structure 업데이트
    |
    v
[Redux Store: slides 상태]
    |
    v
SSE로 슬라이드 수신 -> 각 slide 업데이트
    |
    v
[React 컴포넌트 렌더링]
    |
    v
사용자 편집 -> Redux 액션 디스패치 -> 스토어 업데이트 -> 리렌더링
```

### 12.8 에셋 처리 전략

```
차용할 패턴:

1. 이중 키 컨벤션
   __image_prompt__ / __image_url__
   __icon_query__ / __icon_url__
   -> 콘텐츠와 에셋을 명확히 분리

2. 비동기 병렬 처리
   모든 에셋을 asyncio.gather()로 동시 fetch
   -> 우리는 Promise.all()로 동일하게 구현

3. 이전 URL 재사용
   편집 시 변경되지 않은 에셋의 URL 재사용
   -> API 비용 절감, 속도 향상

4. 플레이스홀더 폴백
   에셋 생성 실패 시 플레이스홀더 표시
   -> UX 연속성 보장

5. 이미지 프로바이더 추상화
   스톡 이미지(Pexels, Pixabay)와 AI 생성(DALL-E) 통합
   -> 환경변수로 전환 가능
```

### 12.9 구체적 구현 로드맵 제안

```
Phase 1: 기본 파이프라인 (2-3주)
  - LLM 추상화 레이어 (OpenAI 우선)
  - 3단계 생성 파이프라인 (아웃라인 -> 구조 -> 콘텐츠)
  - SSE 스트리밍
  - 기본 레이아웃 5종 (타이틀, 불릿, 이미지, 차트, 감사)
  - Zod 스키마 기반 구조화 출력

Phase 2: 렌더링 & 편집 (2-3주)
  - SlideScale 반응형 렌더링
  - TipTap 인라인 텍스트 편집
  - 이미지 편집기 (AI 생성 + 업로드)
  - Redux 상태 관리
  - 슬라이드 드래그 앤 드롭

Phase 3: 내보내기 (1-2주)
  - pptxgenjs 기반 PPTX 생성
  - 네이티브 차트 지원
  - 텍스트 서식 보존
  - PDF 내보내기 (Puppeteer 또는 jsPDF)

Phase 4: 테마 & 확장 (2-3주)
  - 다중 테마 시스템
  - 레이아웃 10종 추가
  - 아이콘 시스템
  - 다중 LLM 프로바이더 지원
  - 톤/장황도 설정
```

### 12.10 Presenton 대비 우리의 차별화 포인트

```
1. 단일 스택: TypeScript 단일 스택으로 배포/관리 단순화
   (Presenton: Python + Node.js + Electron)

2. 네이티브 PPTX: pptxgenjs로 네이티브 PPTX 생성
   (Presenton: DOM 캡처 -> python-pptx = 손실 변환)

3. 웹 우선: Next.js 웹 앱으로 즉시 접근 가능
   (Presenton: Electron 데스크톱 앱 또는 Docker)

4. 차트 편집: 네이티브 PPTX 차트로 편집 가능한 차트 내보내기
   (Presenton: 차트를 이미지로 래스터화)

5. 경량화: 시스템 의존성 최소화
   (Presenton: LibreOffice + Chromium + Python 필요)
```

### 12.11 핵심 코드 참조 파일 목록

우리 프로젝트 구현 시 참고할 Presenton 소스 코드:

| 파일 | 참고 포인트 |
|------|------------|
| `services/llm_client.py` | LLM 추상화 레이어 패턴 |
| `utils/schema_utils.py` | JSON Schema 정규화, strict 모드 변환 |
| `utils/llm_calls/generate_outline.py` | 아웃라인 생성 프롬프트 구조 |
| `utils/llm_calls/generate_structure.py` | 슬라이드 구조 결정 프롬프트 |
| `utils/llm_calls/generate_slide_content.py` | 콘텐츠 생성 프롬프트 |
| `utils/llm_calls/edit_slide.py` | 편집 프롬프트 + 필드 조작 전략 |
| `utils/process_slides.py` | 에셋 처리 파이프라인, URL 재사용 |
| `services/image_generation_service.py` | 이미지 프로바이더 추상화 |
| `services/icon_finder_service.py` | 벡터 검색 기반 아이콘 시스템 |
| `services/pptx_presentation_creator.py` | PPTX 생성 로직 |
| `services/html_to_text_runs_service.py` | HTML->PPTX 텍스트 변환 |
| `api/v1/ppt/endpoints/prompts.py` | HTML/React 변환 프롬프트 |
| `enums/tone.py` | 톤 열거형 |
| `enums/verbosity.py` | 장황도 열거형 |
| `models/generate_presentation_request.py` | 요청 모델 구조 |
| `PresentationRender.tsx` | 반응형 슬라이드 스케일링 |
| `EditableLayoutWrapper.tsx` | 인라인 편집 시스템 |
| `ImageEditor.tsx` | 이미지 편집 UI |
| `V1ContentRender.tsx` | 콘텐츠 렌더러 |
| `neo-general/settings.json` | 테마 설정 구조 |
| 각 레이아웃 TSX 파일 | Zod 스키마 + React 컴포넌트 패턴 |

### 12.12 경고 및 주의사항

```
1. 커스텀 템플릿 기능은 불안정함 (이슈 다수)
   -> 우리는 처음부터 안정적인 내장 테마에 집중할 것

2. python-pptx 기반 PPTX 생성은 복잡하고 Python 의존
   -> pptxgenjs (TypeScript 네이티브)로 대체

3. Puppeteer 의존은 서버리스 배포에 불리
   -> 가능하면 Puppeteer 없이 PPTX 생성하는 방향

4. 29개 레이아웃은 과도할 수 있음
   -> 핵심 10-15개로 시작, 점진적 확장

5. LLM 비용: 3-4회 호출은 비용이 누적됨
   -> 가능하면 1-2회로 줄이거나, 캐싱 전략 도입

6. 벡터 검색 아이콘 시스템은 15MB+ 데이터
   -> 가벼운 키워드 매칭 또는 외부 아이콘 API로 대체 가능
```

---

## 부록 A: Presenton 환경변수 전체 목록

```bash
# === LLM 설정 ===
LLM_PROVIDER=openai              # openai | google | anthropic | ollama | custom
LLM_MODEL=gpt-4o                 # 모델명
LLM_API_KEY=sk-...               # API 키
OLLAMA_BASE_URL=http://localhost:11434
CUSTOM_LLM_BASE_URL=http://...
CUSTOM_LLM_API_KEY=...

# === 이미지 설정 ===
IMAGE_PROVIDER=dalle3             # dalle3 | gpt_image_1_5 | gemini_flash |
                                  # pexels | pixabay | comfyui | nanobanana | disabled
IMAGE_API_KEY=...
PEXELS_API_KEY=...
PIXABAY_API_KEY=...
COMFYUI_BASE_URL=...

# === 앱 설정 ===
APP_DATA_DIRECTORY=/app_data
TEMP_DIRECTORY=/tmp/presenton
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# === 기능 토글 ===
DISABLE_TELEMETRY=true
RESTRICT_API_KEY_MODIFICATION=true
```

## 부록 B: Presenton API 엔드포인트 전체 목록

```
POST   /api/v1/ppt/presentation/generate     # 프레젠테이션 생성 (SSE)
POST   /api/v1/ppt/presentation/edit         # 슬라이드 편집
GET    /api/v1/ppt/slide/content             # 슬라이드 콘텐츠 조회
GET    /api/v1/ppt/slide/layout              # 레이아웃 정보
POST   /api/v1/ppt/pptx-slides/process       # PPTX 파일 분석
POST   /api/v1/ppt/pptx-fonts/process        # 폰트 추출
POST   /api/v1/ppt/slide-to-html             # 슬라이드->HTML
POST   /api/v1/ppt/html-to-react             # HTML->React
POST   /api/v1/ppt/html-edit                 # HTML 편집
GET    /api/v1/ppt/template/                  # 템플릿 목록
POST   /api/v1/ppt/template/                  # 템플릿 생성
GET    /api/v1/mock/...                       # 목업 데이터
POST   /api/v1/webhook/subscribe              # 웹훅 구독
DELETE /api/v1/webhook/unsubscribe            # 웹훅 해지
```

## 부록 C: 레이아웃 카테고리별 분류 (neo-general)

```
[텍스트 중심] 7종
  NumberedBulletsSlideLayout
  BulletWithIconsSlideLayout
  BulletIconsOnlySlideLayout
  IndexedThreeColumnList
  TextSplitWithEmphasisBlock
  HeadlineTextWithBulletsAndStats
  TitleWithGridBasedHeadingAndDescription

[차트/데이터] 6종
  ChartWithBulletsSlideLayout
  TitleWithFullWidthChart
  TitleMetricsWithChart
  MultiChartGridSlideLayout
  TitleDescriptionMultiChartGridWithBullets
  TitleDescriptionMultiChartGridWithMetrics

[이미지] 3종
  HeadlineDescriptionWithImage
  HeadlineDescriptionWithDoubleImage
  MetricsWithImageSlideLayout

[지표/통계] 4종
  GridBasedEightMetricsSnapshots
  LayoutTextBlockWithMetricCards
  ChallengeAndOutcomeWithOneStat
  TitleMetricValueMetricLabelFunnelStages

[특수] 9종
  TableOfContentWithoutPageNumber
  TitleDescriptionWithTable
  Timeline
  QuoteSlideLayout
  LeftAlignQuote
  TeamSlideLayout
  TitleTopDescriptionFourTeamMembersGrid
  ThankYouContactInfoFooterImageSlide
  TitleThreeColumnRiskConstraints
```

## 부록 D: 톤(Tone) 열거형

```python
class Tone(str, Enum):
    DEFAULT = "default"
    CASUAL = "casual"
    PROFESSIONAL = "professional"
    FUNNY = "funny"
    EDUCATIONAL = "educational"
    SALES_PITCH = "sales_pitch"
```

---

## 결론

Presenton은 오픈소스 AI 프레젠테이션 생성기로서 매우 완성도 높은 프로젝트이다.
특히 LLM 구조화 출력 기반의 슬라이드 생성 파이프라인, Zod 스키마 기반 레이아웃
시스템, 다중 LLM/이미지 프로바이더 추상화는 우리 프로젝트에서 직접 차용할 수 있는
검증된 패턴이다.

그러나 Python + Node.js 이중 서버 아키텍처, Puppeteer/LibreOffice 의존성,
불안정한 커스텀 템플릿 시스템은 명확한 약점이다. 우리 프로젝트(PPT Agent)는
TypeScript 단일 스택과 pptxgenjs 네이티브 PPTX 생성으로 이러한 약점을
해결하면서, Presenton의 검증된 패턴들을 차용하여 더 나은 제품을 만들 수 있다.

**핵심 3가지 차용 포인트:**
1. 3단계 생성 파이프라인 (아웃라인 -> 구조 -> 콘텐츠) + SSE 스트리밍
2. Zod 스키마 기반 레이아웃 컴포넌트 시스템 + LLM 구조화 출력
3. 에셋 분리 처리 패턴 (__image_prompt__/__icon_query__ 컨벤션)

---

> 본 문서는 PPT Agent 팀의 내부 참고용으로 작성되었습니다.
> Presenton 프로젝트는 Apache 2.0 라이선스이며, 코드 패턴 참조에 법적 제약이 없습니다.

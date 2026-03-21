# PPTAgent 경쟁사 심층 분석 보고서

> **분석 대상**: [icip-cas/PPTAgent](https://github.com/icip-cas/PPTAgent)
> **분석 일자**: 2026-03-11
> **분석 목적**: 우리 PPT Agent (Next.js/TypeScript) 프로젝트에 적용 가능한 인사이트 도출
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
8. [PPTEval 자동 평가 시스템](#8-ppteval-자동-평가-시스템)
9. [V2 DeepPresenter 심층 분석](#9-v2-deeppresenter-심층-분석)
10. [기술 스택](#10-기술-스택)
11. [제한사항 & 약점](#11-제한사항--약점)
12. [우리 프로젝트에 적용 가능한 인사이트](#12-우리-프로젝트에-적용-가능한-인사이트)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정의

PPTAgent는 중국 과학원(ICIP-CAS)에서 개발한 **에이전트 기반 프레젠테이션 자동 생성 프레임워크**이다.
단순한 "텍스트를 슬라이드로 변환"하는 수준을 넘어, 기존 프레젠테이션을 레퍼런스로 분석하고,
그 디자인 패턴을 학습하여 새로운 문서로부터 고품질 프레젠테이션을 생성한다.

- **리포지토리**: https://github.com/icip-cas/PPTAgent
- **라이선스**: MIT License
- **언어**: Python 3.11+
- **Stars**: 3,500+ (2026년 3월 기준)

### 1.2 두 가지 버전: V1 vs V2

PPTAgent는 두 개의 독립적인 시스템으로 구성되어 있다.

| 구분 | V1 (PPTAgent) | V2 (DeepPresenter) |
|------|--------------|-------------------|
| **패키지** | `pptagent/` | `deeppresenter/` |
| **접근법** | 레퍼런스 PPT 기반 템플릿 편집 | HTML/CSS 자유 형식 디자인 |
| **파이프라인** | 2-Stage (분석 -> 생성) | 3-Phase (Research -> Design -> Convert) |
| **에이전트 수** | 6개 역할 (planner, editor, coder 등) | 3개 역할 (Research, Design, PPTAgent) |
| **도구 체계** | 내장 Python API | MCP 프로토콜 기반 30+ 외부 도구 |
| **논문** | EMNLP 2025 | DeepPresenter (arXiv 2025) |
| **핵심 혁신** | 레퍼런스 기반 레이아웃 추출 + 자동 평가 | 환경 기반 리플렉션 + 딥리서치 |
| **입력** | 문서 + 레퍼런스 PPT | 토픽/키워드만으로 가능 |
| **출력** | .pptx 직접 생성 | HTML -> .pptx 변환 |

### 1.3 학술 배경

#### EMNLP 2025 논문 (V1)

**제목**: "PPTAgent: Generating and Evaluating Presentations Beyond Text-to-Slides"

핵심 기여:
1. **레퍼런스 기반 접근법**: 기존 PPT의 디자인 패턴을 자동 추출하여 새 PPT에 적용
2. **PPTEval**: Content, Design, Coherence 3차원 자동 평가 프레임워크
3. **Edit-based Generation**: LLM이 직접 PPTX XML을 생성하는 대신, 기존 슬라이드를 "편집"하는 방식

#### DeepPresenter 논문 (V2)

**제목**: "DeepPresenter: Environment-Grounded Reflection for Agentic Presentation Generation"

핵심 기여:
1. **환경 기반 리플렉션(Environment-Grounded Reflection)**: 렌더링된 슬라이드 이미지를 직접 관찰하여 품질 검증
2. **자율적 계획 및 수정**: 사전 정의된 워크플로우 없이 에이전트가 자율적으로 계획/실행/수정
3. **9B 파인튜닝 모델**: 대형 모델 대비 경쟁력 있는 성능을 소형 모델로 달성

### 1.4 프로젝트 구조 개관

```
PPTAgent/
├── pptagent/                    # V1: 레퍼런스 기반 PPT 생성
│   ├── agent.py                 # 핵심 Agent 클래스
│   ├── pptgen.py                # PPT 생성 파이프라인 (PPTGen, PPTAgent)
│   ├── ppteval.py               # 자동 평가 시스템
│   ├── induct.py                # 레퍼런스 PPT 분석 (SlideInducter)
│   ├── llms.py                  # LLM 인터페이스 (OpenAI 호환)
│   ├── apis.py                  # 슬라이드 편집 API + CodeExecutor
│   ├── multimodal.py            # 이미지 캡셔닝 (ImageLabler)
│   ├── model_utils.py           # 모델 관리, 이미지 임베딩, 클러스터링
│   ├── utils.py                 # 유틸리티 함수
│   ├── mcp_server.py            # MCP 서버 인터페이스
│   ├── prompts/                 # 프롬프트 템플릿 디렉터리
│   ├── roles/                   # 에이전트 역할 YAML 정의
│   │   ├── planner.yaml
│   │   ├── editor.yaml
│   │   ├── coder.yaml
│   │   ├── layout_selector.yaml
│   │   ├── content_organizer.yaml
│   │   └── schema_extractor.yaml
│   ├── presentation/            # 프레젠테이션 객체 모델
│   ├── document/                # 문서 파싱 모듈
│   ├── response/                # LLM 응답 파싱 모델
│   └── templates/               # 디자인 템플릿
│
├── deeppresenter/               # V2: 딥리서치 기반 자율 생성
│   ├── main.py                  # AgentLoop 메인 파이프라인
│   ├── cli.py                   # CLI 인터페이스
│   ├── agents/                  # 에이전트 모듈
│   │   ├── agent.py             # 기반 Agent 클래스
│   │   ├── env.py               # AgentEnv (MCP 도구 환경)
│   │   ├── research.py          # Research Agent
│   │   └── design.py            # Design Agent
│   ├── tools/                   # MCP 도구 모음
│   │   ├── research.py          # 학술 검색 (arXiv, Semantic Scholar)
│   │   ├── search.py            # 웹 검색 + URL 크롤링
│   │   ├── reflect.py           # 슬라이드 검수/리플렉션
│   │   ├── tool_agents.py       # 이미지 생성, 캡셔닝, 문서 요약
│   │   ├── any2markdown.py      # 파일 -> 마크다운 변환
│   │   └── task.py              # 작업 관리
│   ├── roles/                   # V2 에이전트 역할 정의
│   │   ├── Research.yaml
│   │   ├── Design.yaml
│   │   └── PPTAgent.yaml
│   ├── html2pptx/               # HTML -> PPTX 변환 모듈
│   ├── utils/                   # 유틸리티
│   │   ├── config.py            # 설정 관리
│   │   ├── constants.py         # 상수 및 프롬프트
│   │   ├── typings.py           # 타입 정의
│   │   ├── mcp_client.py        # MCP 클라이언트
│   │   └── log.py               # 로깅
│   └── docker/                  # Docker 샌드박스 설정
│
├── webui.py                     # 웹 UI (Gradio 기반)
├── pyproject.toml               # 프로젝트 설정 및 의존성
└── docker-compose.yml           # Docker Compose 설정
```

---

## 2. 아키텍처 & 파이프라인 구조

### 2.1 V1 파이프라인: 2-Stage 아키텍처

V1은 명확하게 **Stage I (분석)** 과 **Stage II (생성)** 으로 나뉜다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE I: 레퍼런스 PPT 분석                         │
│                    (SlideInducter - induct.py)                      │
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ Reference │───>│ category_    │───>│ layout_      │              │
│  │ .pptx     │    │ split()      │    │ split()      │              │
│  └──────────┘    │              │    │              │              │
│                   │ 기능슬라이드   │    │ 이미지 임베딩  │              │
│                   │ 분리(Opening, │    │ 코사인 유사도  │              │
│                   │ TOC, Ending) │    │ 클러스터링     │              │
│                   └──────────────┘    └──────┬───────┘              │
│                                              │                      │
│                                     ┌────────▼────────┐            │
│                                     │ content_induct() │            │
│                                     │                  │            │
│                                     │ LLM으로 각 레이아웃│            │
│                                     │ 의 콘텐츠 스키마   │            │
│                                     │ 추출             │            │
│                                     └────────┬────────┘            │
│                                              │                      │
│                                     ┌────────▼────────┐            │
│                                     │ slide_induction  │            │
│                                     │ .json            │            │
│                                     │                  │            │
│                                     │ - layouts{}      │            │
│                                     │ - functional_keys│            │
│                                     │ - language       │            │
│                                     └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE II: 프레젠테이션 생성                        │
│                    (PPTAgent - pptgen.py)                           │
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐      │
│  │ Source    │───>│ Planner      │───>│ Outline              │      │
│  │ Document  │    │ Agent        │    │ (주제별 슬라이드 계획) │      │
│  └──────────┘    └──────────────┘    └──────────┬───────────┘      │
│                                                  │                  │
│                    ┌─────────────────────────────┘                  │
│                    │ 각 슬라이드마다 (비동기 병렬):                    │
│                    ▼                                                │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                                                      │          │
│  │  ┌─────────────┐   ┌──────────────┐                  │          │
│  │  │ Content     │──>│ Layout       │                  │          │
│  │  │ Organizer   │   │ Selector     │                  │          │
│  │  │             │   │              │                  │          │
│  │  │ 원문에서     │   │ 레이아웃 매칭  │                  │          │
│  │  │ 핵심 포인트  │   │ (text/image  │                  │          │
│  │  │ 추출        │   │  분류)        │                  │          │
│  │  └─────────────┘   └──────┬───────┘                  │          │
│  │                           │                          │          │
│  │                  ┌────────▼────────┐                  │          │
│  │                  │ Editor Agent    │                  │          │
│  │                  │                 │                  │          │
│  │                  │ 스키마에 맞춰    │                  │          │
│  │                  │ 콘텐츠 생성     │                  │          │
│  │                  │ + 검증/재시도    │                  │          │
│  │                  └────────┬────────┘                  │          │
│  │                           │                          │          │
│  │                  ┌────────▼────────┐                  │          │
│  │                  │ Coder Agent     │                  │          │
│  │                  │                 │                  │          │
│  │                  │ 편집 명령을      │                  │          │
│  │                  │ Python 코드로   │                  │          │
│  │                  │ 변환 + 실행     │                  │          │
│  │                  └────────┬────────┘                  │          │
│  │                           │                          │          │
│  └──────────────────────────┘──────────────────────────┘          │
│                              │                                      │
│                     ┌────────▼────────┐                            │
│                     │ Generated       │                            │
│                     │ .pptx           │                            │
│                     └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 V1 에이전트 역할 체계

V1은 6개의 전문화된 에이전트 역할로 구성된다:

```
┌──────────────────────────────────────────────────┐
│                  Agent 기반 클래스                  │
│                  (agent.py)                        │
│                                                    │
│  - Jinja2 템플릿 기반 프롬프트 렌더링               │
│  - LLM 호출 (language_model / vision_model)       │
│  - 대화 히스토리 관리                               │
│  - 재시도 로직 (retry 메서드)                       │
│  - JSON 응답 파싱                                  │
└──────────────┬───────────────────────────────────┘
               │
    ┌──────────┴───────────────────────────────┐
    │                                          │
    ▼                                          ▼
┌─────────┐ ┌─────────────┐ ┌───────┐ ┌───────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Planner │ │ Content     │ │Layout │ │ Editor        │ │ Coder           │ │ Schema          │
│         │ │ Organizer   │ │Select.│ │               │ │                 │ │ Extractor       │
│         │ │             │ │       │ │               │ │                 │ │                 │
│ 전체     │ │ 원문에서    │ │레이아웃│ │ 스키마에 맞춰  │ │ 편집 명령을      │ │ 레이아웃에서     │
│ 아웃라인 │ │ 핵심 내용   │ │선택   │ │ 슬라이드 콘텐츠│ │ Python 코드로   │ │ 콘텐츠 스키마   │
│ 생성     │ │ 추출/요약   │ │       │ │ 생성 + 검증   │ │ 변환하여 실행   │ │ 자동 추출       │
│         │ │             │ │       │ │               │ │                 │ │                 │
│ vision  │ │ language    │ │lang.  │ │ language      │ │ language        │ │ vision          │
│ model   │ │ model       │ │model  │ │ model         │ │ model           │ │ model           │
└─────────┘ └─────────────┘ └───────┘ └───────────────┘ └─────────────────┘ └─────────────────┘
```

### 2.3 V1 Agent 기반 클래스 핵심 구조

`pptagent/agent.py`의 Agent 클래스는 모든 역할의 기반이다:

```python
class Agent:
    """V1의 핵심 Agent 클래스"""

    def __init__(self, role_name, record_cost, llm_mapping):
        # roles/ 디렉터리에서 YAML 설정 로드
        self.role = Role(role_name)           # YAML에서 system prompt, template 로드
        self.llm_mapping = llm_mapping        # {"language": AsyncLLM, "vision": AsyncLLM}
        self._history = []                    # 대화 히스토리

    async def __call__(self, response_format=None, **kwargs):
        """에이전트 실행 - Jinja2 템플릿 렌더링 후 LLM 호출"""
        # 1. kwargs로 Jinja2 템플릿 렌더링
        prompt = self.role.template.render(**kwargs)
        # 2. LLM 호출 (structured output 지원)
        response = await self.llm.chat(messages, response_format)
        # 3. JSON 파싱 후 반환
        return turn_id, parsed_response

    async def retry(self, error, traceback, turn_id, retry_count):
        """에러 발생시 피드백과 함께 재시도"""
        # 에러 메시지를 대화에 추가하고 LLM에게 수정 요청
```

### 2.4 V2 파이프라인: 3-Phase 아키텍처

V2 (DeepPresenter)는 완전히 다른 아키텍처를 사용한다:

```
┌─────────────────────────────────────────────────────────────────────┐
│                  입력: 사용자 요청 (토픽/키워드)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 1: RESEARCH (Research Agent)                     │
│                                                                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐          │
│  │ 웹 검색  │  │ arXiv    │  │ Semantic │  │ URL 크롤링  │          │
│  │ (Tavily) │  │ 검색     │  │ Scholar  │  │ (Firecrawl)│          │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘          │
│       │            │             │               │                  │
│       └────────────┴──────┬──────┴───────────────┘                  │
│                           │                                         │
│                  ┌────────▼────────┐                                │
│                  │ any2markdown    │                                │
│                  │ 변환            │                                │
│                  └────────┬────────┘                                │
│                           │                                         │
│                  ┌────────▼────────┐                                │
│                  │ document_       │                                │
│                  │ summary         │                                │
│                  │ (장문 요약)      │                                │
│                  └────────┬────────┘                                │
│                           │                                         │
│                  ┌────────▼────────┐                                │
│                  │ manuscript.md   │  <-- 리서치 결과물               │
│                  └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 2: DESIGN (Design Agent)                         │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐        │
│  │ manuscript  │──>│ design_plan  │──>│ 개별 HTML 슬라이드 │        │
│  │ .md 읽기    │   │ .md 작성     │   │ 생성             │        │
│  └─────────────┘   └──────────────┘   │                  │        │
│                                        │ slides/          │        │
│                     ┌─────────────────>│  slide_01.html   │        │
│                     │ 리플렉션 루프     │  slide_02.html   │        │
│                     │ (렌더링 후 검수)  │  ...             │        │
│                     │                  └──────────────────┘        │
│                     │                                              │
│                     │  ┌───────────────────┐                       │
│                     └──│ reflect 도구:     │                       │
│                        │ 스크린샷 촬영 후   │                       │
│                        │ 시각적 품질 검증   │                       │
│                        └───────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 3: CONVERT (html2pptx)                          │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ HTML slides  │───>│ Playwright   │───>│ .pptx 파일   │          │
│  │              │    │ PDF 렌더링   │    │ 최종 출력     │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.5 V2 AgentLoop 핵심 코드

`deeppresenter/main.py`의 AgentLoop은 전체 파이프라인을 조율한다:

```python
# deeppresenter/main.py (핵심 구조)
class AgentLoop:
    """V2의 메인 오케스트레이터"""

    async def run(self, req: InputRequest):
        workspace = WORKSPACE_BASE / req.workspace_id

        async with AgentEnv(workspace, self.config) as env:
            # Phase 1: Research
            research_agent = ResearchAgent(self.config, env, workspace, req.language)
            async for msg in research_agent.loop(req):
                yield msg  # 스트리밍 출력

            # Phase 2: Design
            design_agent = DesignAgent(self.config, env, workspace, req.language)
            async for msg in design_agent.loop(req):
                yield msg

            # Phase 3: Convert (HTML -> PPTX)
            # html2pptx 모듈로 최종 변환
```

### 2.6 V2 에이전트 환경 (AgentEnv) 구조

```
┌──────────────────────────────────────────────────────────┐
│                    AgentEnv (env.py)                      │
│                                                          │
│  ┌──────────────────────────────────────────────┐        │
│  │          MCP Client (mcp_client.py)           │        │
│  │                                               │        │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │        │
│  │  │ MCP     │ │ MCP     │ │ MCP     │ ...    │        │
│  │  │ Server 1│ │ Server 2│ │ Server 3│        │        │
│  │  │(search) │ │(files)  │ │(sandbox)│        │        │
│  │  └─────────┘ └─────────┘ └─────────┘        │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  ┌──────────────────────┐  ┌─────────────────────┐      │
│  │ Local Tools Registry │  │ Tool Timing/History │      │
│  │ (register_tool)      │  │ (성능 추적)          │      │
│  └──────────────────────┘  └─────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐        │
│  │          Docker Container (샌드박스)           │        │
│  │  - 코드 실행 격리                             │        │
│  │  - 파일시스템 마운트                           │        │
│  │  - 네트워크 제어                              │        │
│  └──────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

### 2.7 모듈 간 데이터 흐름 요약

**V1 데이터 흐름:**
```
Reference.pptx ──> SlideInducter ──> slide_induction.json
                                          │
Source Document ──> PPTAgent.set_reference(slide_induction.json)
                          │
                          ├──> Planner ──> Outline[OutlineItem]
                          │
                          ├──> ContentOrganizer ──> key_points (JSON)
                          │
                          ├──> LayoutSelector ──> Layout 선택
                          │
                          ├──> Editor ──> EditorOutput (스키마 기반 콘텐츠)
                          │
                          └──> Coder ──> edit_actions (Python 코드) ──> SlidePage
```

**V2 데이터 흐름:**
```
User Request ──> ResearchAgent ──> manuscript.md (마크다운 원고)
                                        │
                 DesignAgent ──> design_plan.md + slides/*.html
                                        │
                 html2pptx ──> final.pptx
```

---

## 3. 레퍼런스 분석 시스템

### 3.1 개요

V1의 가장 독창적인 부분은 **레퍼런스 PPT 분석 시스템**이다.
기존 프레젠테이션을 입력받아 그 디자인 패턴(레이아웃, 색상, 폰트, 요소 배치)을 자동으로 추출하고,
이를 새로운 콘텐츠에 적용한다. 이 작업은 `pptagent/induct.py`의 `SlideInducter` 클래스가 담당한다.

### 3.2 분석 파이프라인 3단계

```
┌────────────────────────────────────────────────────────────┐
│                  SlideInducter Pipeline                     │
│                                                            │
│  Step 1: category_split()                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │ 모든 슬라이드를 두 카테고리로 분류:             │          │
│  │                                               │          │
│  │ Functional Slides    Content Slides           │          │
│  │ (Opening, TOC,       (실제 내용이 있는         │          │
│  │  Section, Ending)     슬라이드들)              │          │
│  │                                               │          │
│  │ Vision Model이 각 슬라이드 스크린샷을 보고      │          │
│  │ 기능 유형을 판단                               │          │
│  └──────────────────────────────────────────────┘          │
│                      │                                      │
│                      ▼                                      │
│  Step 2: layout_split()                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │ Content Slides를 레이아웃별로 그룹화:          │          │
│  │                                               │          │
│  │ 1. 각 슬라이드의 이미지들에 대해               │          │
│  │    Vision Transformer 임베딩 추출             │          │
│  │ 2. 슬라이드 간 코사인 유사도 행렬 계산         │          │
│  │ 3. 유사도 기반 클러스터링                      │          │
│  │    (threshold: 0.85)                          │          │
│  │ 4. 같은 클러스터 = 같은 레이아웃               │          │
│  │                                               │          │
│  │ 추가로 text-only vs image+text 분류:          │          │
│  │ - 이미지 없는 슬라이드: "{cluster_name}:text"  │          │
│  │ - 이미지 있는 슬라이드: "{cluster_name}:image" │          │
│  └──────────────────────────────────────────────┘          │
│                      │                                      │
│                      ▼                                      │
│  Step 3: content_induct()                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │ 각 레이아웃의 콘텐츠 스키마 추출:              │          │
│  │                                               │          │
│  │ 1. 레이아웃 대표 슬라이드 선택                 │          │
│  │ 2. Schema Extractor (Vision Model)가          │          │
│  │    슬라이드 스크린샷을 분석                    │          │
│  │ 3. 각 텍스트/이미지 영역의 역할 식별:          │          │
│  │    - title, subtitle, body_text              │          │
│  │    - bullet_points, image_caption            │          │
│  │    - page_number, date, etc.                 │          │
│  │ 4. Element 모델로 구조화                      │          │
│  └──────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────┘
```

### 3.3 이미지 임베딩 & 클러스터링 상세

`model_utils.py`에서 Vision Transformer를 사용하여 슬라이드 이미지의 시각적 유사도를 계산한다:

```python
# model_utils.py - 이미지 임베딩 생성 (핵심 로직)

# ImageNet 정규화 파라미터
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

def get_image_embeddings(image_dir, model, processor, batch_size=16):
    """
    디렉터리 내 모든 이미지에 대해 ViT 임베딩 벡터를 추출한다.
    배치 처리로 효율성을 확보한다.
    """
    # 1. 이미지 로드 및 전처리
    # 2. ViT 모델로 feature 추출
    # 3. 코사인 유사도 행렬 계산
    return embeddings, similarity_matrix

def get_cluster(similarity_matrix, threshold=0.85):
    """
    유사도 행렬 기반 응집형(agglomerative) 클러스터링.

    알고리즘:
    1. 유사도가 threshold 이상인 쌍을 찾는다
    2. 가장 높은 유사도부터 병합 시작
    3. 이미 다른 클러스터에 속한 항목은 건너뜀
    4. 어떤 클러스터에도 속하지 않은 항목은 개별 클러스터로

    결과: {cluster_id: [slide_indices]}
    """
    clusters = {}
    assigned = set()

    # 유사도 높은 순으로 정렬
    pairs = sorted(all_pairs, key=lambda x: x[2], reverse=True)

    for i, j, sim in pairs:
        if sim < threshold:
            break
        if i not in assigned and j not in assigned:
            cluster_id = len(clusters)
            clusters[cluster_id] = [i, j]
            assigned.update([i, j])
        elif i in assigned and j not in assigned:
            # i가 속한 클러스터에 j 추가
            ...

    # 미할당 항목을 개별 클러스터로
    for idx in range(len(similarity_matrix)):
        if idx not in assigned:
            clusters[len(clusters)] = [idx]

    return clusters
```

### 3.4 레이아웃 & 요소(Element) 모델

분석 결과는 `Layout`과 `Element` 데이터 모델로 구조화된다:

```python
# presentation/layout.py - Layout 모델 (핵심 구조)

class Element(BaseModel):
    """슬라이드 내 개별 요소 (텍스트 블록, 이미지 영역 등)"""
    name: str              # 요소 이름 (예: "title", "body_text_1")
    type: str              # 요소 유형 ("text", "image", "table")
    description: str       # 요소의 역할 설명
    data: list             # 실제 콘텐츠 데이터
    # text인 경우: [{"paragraph": "...", "style": {...}}]
    # image인 경우: [{"path": "...", "caption": "..."}]

class Layout(BaseModel):
    """하나의 레이아웃 템플릿 정의"""
    title: str             # 레이아웃 이름 (예: "two_column:text")
    template_id: int       # 원본 PPT에서의 슬라이드 번호
    elements: list[Element]  # 이 레이아웃에 포함된 요소들
    content_schema: str    # LLM에게 전달할 콘텐츠 스키마 문자열

    def validate(self, editor_output, allowed_images):
        """Editor가 생성한 콘텐츠가 스키마에 맞는지 검증"""
        ...

    async def length_rewrite(self, editor_output, length_factor, llm):
        """텍스트 길이를 언어별 비율에 맞게 조정"""
        ...

    def index_template_slide(self, editor_output):
        """편집할 템플릿 슬라이드와 기존 데이터를 매핑"""
        ...
```

### 3.5 분석 결과 포맷 (slide_induction.json)

SlideInducter의 최종 출력은 다음과 같은 JSON 구조이다:

```json
{
  "language": {
    "lid": "en",
    "latin": true
  },
  "functional_keys": [
    "opening",
    "table of contents",
    "section outline",
    "ending"
  ],
  "layout_cluster_0:text": {
    "template_id": 3,
    "elements": [
      {
        "name": "title",
        "type": "text",
        "description": "슬라이드의 제목 영역. 간결한 제목을 표시한다.",
        "data": [{"paragraph": "Sample Title"}]
      },
      {
        "name": "body_text",
        "type": "text",
        "description": "본문 영역. 3-5개의 불릿 포인트를 포함한다.",
        "data": [
          {"paragraph": "First point"},
          {"paragraph": "Second point"},
          {"paragraph": "Third point"}
        ]
      }
    ],
    "content_schema": "title: 슬라이드 제목 (1줄)\nbody_text: 본문 내용 (3-5개 항목)"
  },
  "layout_cluster_1:image": {
    "template_id": 5,
    "elements": [
      {
        "name": "title",
        "type": "text",
        "description": "슬라이드 제목",
        "data": [{"paragraph": "Image Slide Title"}]
      },
      {
        "name": "image_1",
        "type": "image",
        "description": "메인 이미지 영역",
        "data": [{"path": "images/sample.png", "caption": "Sample image"}]
      },
      {
        "name": "caption",
        "type": "text",
        "description": "이미지 설명 텍스트",
        "data": [{"paragraph": "Image description here"}]
      }
    ],
    "content_schema": "title: 슬라이드 제목\nimage_1: 이미지 경로\ncaption: 이미지 설명"
  }
}
```

### 3.6 Functional Layout 감지

`category_split()` 단계에서 Vision Model이 각 슬라이드를 4가지 기능 유형으로 분류한다:

```python
class FunctionalLayouts(Enum):
    OPENING = "opening"                    # 표지 슬라이드
    TOC = "table of contents"              # 목차 슬라이드
    SECTION_OUTLINE = "section outline"    # 섹션 시작 슬라이드
    ENDING = "ending"                      # 마지막 감사 슬라이드
```

이 분류는 Vision Model(예: GPT-4V)이 슬라이드 스크린샷을 보고 판단한다.
기능 슬라이드는 콘텐츠 레이아웃 클러스터링에서 제외되고, 나중에 자동으로 적절한 위치에 삽입된다.

### 3.7 작은 이미지 필터링

레퍼런스 PPT에서 추출할 때, 면적이 슬라이드 전체의 일정 비율(기본 20%) 미만인 작은 이미지는
배경으로 이동시킨다. 이는 로고, 아이콘 등 장식적 요소를 콘텐츠 요소로 잘못 인식하는 것을 방지한다:

```python
def _hide_small_pics(self, area_ratio: float, keep_in_background: bool):
    """면적 비율이 작은 이미지를 배경으로 이동"""
    for layout in self.layouts.values():
        template_slide = self.presentation.slides[layout.template_id - 1]
        pictures = list(template_slide.shape_filter(Picture, return_father=True))

        for father, pic in pictures:
            if pic.area / pic.slide_area < area_ratio:
                father.shapes.remove(pic)
                if keep_in_background:
                    template_slide.backgrounds.append(pic)
                layout.remove_item(pic.caption)

        # 모든 이미지가 제거되면 text-only 레이아웃으로 전환
        if len(list(template_slide.shape_filter(Picture))) == 0:
            self.layouts[layout.title.replace(":image", ":text")] = (
                self.layouts.pop(layout.title)
            )
```

### 3.8 언어 감지 및 길이 조정

레퍼런스 PPT의 언어와 생성할 PPT의 언어가 다를 때, 텍스트 길이를 자동으로 조정한다:

```python
class Language(BaseModel):
    """언어 정보 모델"""
    lid: str       # 언어 코드 (예: "en", "zh", "ko")
    latin: bool    # 라틴 문자 여부 (True: 영어 등, False: CJK)

def get_length_factor(src_lan: Language, dst_lang: Language):
    """언어 간 텍스트 길이 변환 비율"""
    if src_lan.latin == dst_lang.latin:   # 같은 언어 계열
        return 1.2
    elif src_lan.latin:                    # 영어 -> CJK
        return 0.7                         # CJK가 더 짧음
    else:                                  # CJK -> 영어
        return 2.0                         # 영어가 더 길음
```

이 길이 비율은 Editor가 생성한 텍스트를 후처리할 때 적용된다.
예를 들어, 영어 레퍼런스 PPT에서 한국어 PPT를 생성할 때 텍스트 길이를 0.7배로 줄인다.

### 3.9 핵심 인사이트: 레퍼런스 분석의 가치

PPTAgent의 레퍼런스 분석 시스템이 주는 교훈:

1. **디자인 패턴 추출**: LLM에게 디자인을 처음부터 만들라고 하지 않고, 기존 좋은 디자인에서 패턴을 추출한다
2. **스키마 기반 생성**: 추출된 스키마가 LLM의 출력을 강하게 제약하여 일관성을 보장한다
3. **시각적 클러스터링**: ViT 임베딩을 사용한 시각적 유사도 기반 분류가 단순 규칙 기반보다 정확하다
4. **자동 기능 슬라이드 감지**: 표지/목차/섹션/엔딩을 자동으로 식별하여 구조적 완성도를 높인다


---

## 4. 프롬프트 전략

### 4.1 프롬프트 아키텍처 개관

PPTAgent V1은 **역할별 YAML 파일**로 프롬프트를 관리한다.
각 YAML 파일은 다음 구조를 따른다:

```yaml
# roles/{role_name}.yaml 공통 구조
system: |
  You are a professional {역할 설명}...
  {역할별 시스템 프롬프트}

template: |
  {Jinja2 템플릿}
  {{ variable_1 }}
  {{ variable_2 }}

use_model: language  # 또는 "vision"
response_format: json  # 또는 null
```

Agent 클래스가 이 YAML을 로드하고, Jinja2 템플릿에 런타임 변수를 주입하여 최종 프롬프트를 구성한다:

```python
# agent.py - 프롬프트 렌더링 핵심 로직
class Agent:
    def __init__(self, role_name, record_cost, llm_mapping):
        role_path = PACKAGE_DIR / "roles" / f"{role_name}.yaml"
        with open(role_path) as f:
            config = yaml.safe_load(f)

        self.system_prompt = config["system"]
        self.template = Template(config["template"])  # Jinja2
        self.use_model = config.get("use_model", "language")

    async def __call__(self, response_format=None, **kwargs):
        # Jinja2 템플릿에 kwargs 주입
        user_message = self.template.render(**kwargs)

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_message}
        ]

        # 이전 대화 히스토리가 있으면 포함
        if self._history:
            messages = [messages[0]] + self._history + [messages[-1]]

        response = await self.llm.chat(messages, response_format=response_format)
        parsed = get_json_from_response(response)
        return turn_id, parsed
```

### 4.2 Planner 프롬프트 (아웃라인 생성)

Planner는 **vision model**을 사용하며, 문서 개요(document_overview)를 받아 전체 프레젠테이션 아웃라인을 생성한다.

```
[System Prompt - Planner]
You are a professional presentation planner. Your task is to create
a well-structured outline for a presentation based on the provided
document overview.

Guidelines:
- Each slide should have a clear purpose and topic
- Group related content into logical sections
- Ensure smooth flow between slides
- Consider the target audience and presentation goals

[User Template - Jinja2]
Please create a presentation outline with {{ num_slides }} slides
based on the following document:

{{ document_overview }}

Output a JSON object with an "outline" array where each item has:
- "purpose": brief description of what this slide presents
- "topic": the section/topic this slide belongs to
- "indexes": list of document section indexes to reference
- "images": list of relevant image paths from the document
```

Planner의 응답은 `Outline` Pydantic 모델로 파싱된다:

```python
# response/ 모듈의 Outline 모델
class OutlineItem(BaseModel):
    purpose: str        # 슬라이드의 목적 설명
    topic: str          # 소속 섹션/주제
    indexes: list       # 참조할 문서 섹션 인덱스
    images: list[str]   # 사용할 이미지 경로

class Outline(BaseModel):
    outline: list[OutlineItem]

    @classmethod
    def response_model(cls, source_doc):
        """문서 구조에 맞는 동적 응답 모델 생성"""
        # source_doc의 섹션 수, 이미지 목록에 기반하여
        # 유효한 indexes, images 범위를 제약
        ...
```

핵심 포인트: Planner는 `response_model`을 **동적으로 생성**한다.
소스 문서의 실제 섹션 수와 이미지 목록에 기반하여 유효 범위를 제약하므로,
LLM이 존재하지 않는 섹션이나 이미지를 참조하는 할루시네이션을 구조적으로 방지한다.

### 4.3 Content Organizer 프롬프트 (핵심 포인트 추출)

Content Organizer는 원문 텍스트에서 슬라이드에 적합한 핵심 포인트를 추출한다:

```
[System Prompt - Content Organizer]
You are a content specialist who extracts key points from source
material for presentation slides. Your goal is to identify the most
important information and organize it in a clear, concise format
suitable for slide content.

[User Template]
Extract key points from the following source content for a
presentation slide:

{{ content_source }}

Return a JSON array of key points, each being a concise statement.
```

이 에이전트의 역할은 장문의 원문을 슬라이드에 적합한 짧은 포인트로 변환하는 것이다.
출력은 JSON 배열로, 이후 Layout Selector와 Editor에게 전달된다.

### 4.4 Layout Selector 프롬프트 (레이아웃 선택)

Layout Selector는 가용한 레이아웃 목록에서 현재 슬라이드에 가장 적합한 것을 선택한다:

```
[System Prompt - Layout Selector]
You are tasked with selecting the most suitable layout from a set
of predefined options based on the provided slide information.

Evaluation Criteria:
1. Content Fit: Match element count, text length, and theme alignment
   - Count the number of text elements and compare with layout slots
   - Estimate text length vs. available space
   - Check if the content theme matches the layout's intended purpose

2. Image Fit: Evaluate relevance to theme and content enhancement
   - If images are provided, prefer layouts with image slots
   - If no images, default to text-only layouts

3. Default Rule: When no images are provided, always select
   text-only layouts.

[User Template - Jinja2]
Presentation Outline:
{{ outline }}

Current Slide Description:
{{ slide_description }}

Slide Content:
{{ slide_content }}

Available Layouts:
{{ available_layouts }}

Select the most suitable layout and explain your reasoning.
Return JSON with:
- "layout": the selected layout name
- "reasoning": detailed justification for the selection
```

주목할 점은 `available_layouts`가 **셔플링**되어 전달된다는 것이다:

```python
# pptgen.py - 레이아웃 선택 시 셔플링
async def _select_layout(self, slide_idx, outline_item):
    layouts = self.text_layouts
    if len(images) > 0:
        layouts = self.multimodal_layouts

    shuffle(layouts)  # 순서 편향 방지를 위한 셔플링

    _, layout_selection = await self.staffs["layout_selector"](
        available_layouts=layouts,
        response_format=LayoutChoice.response_model(layouts),
        ...
    )
```

이 셔플링은 LLM이 항상 첫 번째 옵션을 선택하는 위치 편향(position bias)을 방지하기 위한 전략이다.

### 4.5 Editor 프롬프트 (콘텐츠 생성)

Editor는 가장 복잡한 프롬프트를 사용한다. 선택된 레이아웃의 스키마에 맞춰 실제 슬라이드 콘텐츠를 생성한다:

```
[System Prompt - Editor]
You are a professional slide content editor. Your task is to
generate content that precisely fills the provided schema
for a presentation slide.

Rules:
1. Follow the schema structure exactly
2. Match the number of elements specified
3. Keep text concise and suitable for slides
4. Use the specified language for all content
5. Ensure content is relevant to the slide purpose

[User Template - Jinja2]
Presentation Outline:
{{ outline }}

Current Slide Description:
{{ slide_description }}

Document Metadata:
{{ metadata }}

Source Content:
{{ slide_content }}

Content Schema:
{{ schema }}

Target Language: {{ language }}

Generate content following the schema exactly.
Return a JSON object matching the schema structure.
```

Editor의 응답은 `EditorOutput` 모델로 검증된다:

```python
# response/ 모듈의 EditorOutput
class EditorOutput(BaseModel):
    """스키마에 맞는 편집 결과"""

    @classmethod
    def response_model(cls, element_names: list[str]):
        """레이아웃의 요소 이름에 맞는 동적 모델 생성"""
        # element_names = ["title", "body_text", "image_1"] 등
        # 각 요소에 대한 필드를 동적으로 생성
        fields = {}
        for name in element_names:
            fields[name] = (ElementData, ...)
        return create_model("EditorOutput", **fields)
```

**핵심 설계**: Editor의 응답 모델이 레이아웃의 실제 요소 이름에 맞춰 **동적으로 생성**된다.
이로써 LLM이 스키마와 다른 필드명을 사용하거나 필드를 누락하는 문제를 구조적으로 방지한다.

### 4.6 Coder 프롬프트 (편집 코드 생성)

Coder는 Editor의 출력을 실제 PPTX 편집 명령(Python 코드)으로 변환한다:

```
[System Prompt - Coder]
You are a code generation specialist for PowerPoint editing.
Given an HTML representation of a slide template and a list of
edit commands, generate Python code to apply the changes.

Available API Functions:
{api_docs}

[User Template - Jinja2]
API Documentation:
{{ api_docs }}

Current Slide HTML:
{{ edit_target }}

Edit Commands:
{{ command_list }}

Generate Python code to apply all edit commands to the slide.
```

Coder에게 전달되는 `api_docs`는 `CodeExecutor`가 제공하는 편집 API 문서이다:

```python
# apis.py - 슬라이드 편집 API 종류 (API_TYPES.Agent)
class API_TYPES(Enum):
    Agent = "agent"

# 에이전트가 사용할 수 있는 API 함수들:
# - replace_paragraph(shape_id, para_idx, new_text)
# - clone_paragraph(shape_id, para_idx, new_text)
# - del_paragraph(shape_id, para_idx)
# - replace_image(shape_id, image_path)
# - set_font_size(shape_id, para_idx, size)
# - set_font_color(shape_id, para_idx, color)
# 등...
```

### 4.7 Schema Extractor 프롬프트 (스키마 추출)

Schema Extractor는 **vision model**을 사용하여 슬라이드 스크린샷에서 콘텐츠 스키마를 추출한다:

```
[System Prompt - Schema Extractor]
You are a presentation layout analyst. Given a screenshot of a
slide, identify all content elements (text blocks, images,
charts) and describe their roles and relationships.

For each element, determine:
- Name: descriptive identifier (e.g., "title", "body_text_1")
- Type: "text", "image", or "table"
- Description: what role this element plays in the slide
- Content pattern: typical content structure

[User Input]
[슬라이드 스크린샷 이미지]

Analyze this slide layout and extract its content schema.
Return a JSON object with an "elements" array.
```

이 프롬프트는 Stage I (분석 단계)에서만 사용된다.
Vision Model이 슬라이드를 "보고" 각 영역의 역할을 식별하는 핵심 프로세스이다.

### 4.8 V2 시스템 프롬프트: Design Agent

V2의 Design Agent는 훨씬 더 상세한 시스템 프롬프트를 사용한다:

```
[System Prompt - Design Agent (요약)]
당신은 전문 슬라이드 디자인 전문가입니다. HTML/CSS를 사용하여
"시각적으로 균형 잡히고, 겹침 없는, 고품질 슬라이드"를 만듭니다.

워크플로우 (4단계):
1. 원고(manuscript) 내용 이해 - 도구를 사용하여 파일 읽기
2. 디자인 계획 작성 - design_plan.md 생성
3. 개별 HTML 슬라이드 생성 - slides/slide_01.html, slide_02.html...
   각 슬라이드 생성 후 반드시 품질 검수
4. 완료 - finalize 도구로 slides 폴더 반환

디자인 제약 조건:
- body 크기 고정: 16:9 = 1280x720, A4 = 794x1123
- 텍스트는 시맨틱 요소(<p>, <li>, <span>)로만 감싸기
- 목록은 <ul>/<ol>만 사용
- 텍스트에 인라인 margin/border/shadow 금지
- 크로스 플랫폼 안전 폰트만 사용
- 이미지는 object-fit: contain으로 전체 표시 보장
```

### 4.9 V2 시스템 프롬프트: Research Agent

```
[System Prompt - Research Agent (핵심)]
당신은 전문 리서치 에이전트입니다.
사용자의 주제에 대해 깊이 있는 조사를 수행하고,
프레젠테이션 원고(manuscript.md)를 작성합니다.

사용 가능한 도구:
- web_search: 웹 검색
- fetch_url: URL 내용 가져오기
- arxiv_search: 학술 논문 검색
- semantic_scholar_search: 시맨틱 스칼라 검색
- document_summary: 장문 문서 요약
- any2markdown: 파일을 마크다운으로 변환
- read_file / write_file: 파일 읽기/쓰기
- execute_command: 명령어 실행

워크플로우:
1. 주제 분석 및 검색 계획 수립
2. 다양한 소스에서 정보 수집
3. 수집한 정보를 구조화
4. manuscript.md로 작성
5. finalize 도구로 결과 반환
```

### 4.10 재시도 프롬프트 전략

PPTAgent의 재시도(retry) 전략은 단순 반복이 아닌 **구조화된 에러 피드백**을 포함한다:

```python
# agent.py - retry 메서드
async def retry(self, error, traceback_str, turn_id, retry_count,
                response_format=None):
    """
    에러 정보를 LLM에게 전달하고 수정된 응답을 요청한다.

    피드백 구조:
    - error: 발생한 에러 메시지
    - traceback: 상세 스택 트레이스
    - turn_id: 원래 대화의 턴 ID (컨텍스트 유지)
    - retry_count: 현재 재시도 횟수
    """
    feedback_message = f"""
    Your previous response caused an error:

    Error: {error}
    Traceback: {traceback_str}

    This is retry attempt {retry_count}.
    Please fix the issue and provide a corrected response.
    """
    # 기존 대화 히스토리에 에러 피드백 추가
    self._history.append({"role": "user", "content": feedback_message})
    response = await self.llm.chat(messages, response_format)
    return parsed_response
```

V2에서는 `tenacity` 라이브러리의 데코레이터를 활용한 더 체계적인 재시도를 사용한다:

```python
# utils.py - tenacity 기반 재시도 데코레이터
from tenacity import retry, stop_after_attempt, wait_exponential

@tenacity_decorator  # retry(stop=stop_after_attempt(3), wait=wait_exponential)
async def _select_layout(self, slide_idx, outline_item):
    """레이아웃 선택 - 최대 3회 재시도, 지수 백오프"""
    ...
```

### 4.11 프롬프트 전략 핵심 인사이트 요약

| 전략 | 설명 | 효과 |
|------|------|------|
| 역할 분리 | 6개 전문 에이전트, 각자 좁은 범위의 작업 | 각 LLM 호출의 복잡도 감소 |
| 동적 응답 모델 | 런타임에 Pydantic 모델 동적 생성 | 스키마 불일치 구조적 방지 |
| Jinja2 템플릿 | 프롬프트와 데이터 분리 | 유지보수성, 재사용성 |
| 셔플링 | 레이아웃 목록 순서 랜덤화 | 위치 편향(position bias) 방지 |
| 구조화 피드백 | 에러+트레이스 전달 후 재시도 | 재시도 성공률 향상 |
| 스키마 제약 | 레이아웃 스키마로 출력 구조 강제 | 할루시네이션 감소 |
| 비전 모델 활용 | 스크린샷 기반 분석 (Planner, Schema Extractor) | 시각적 맥락 이해 |

---

## 5. 슬라이드 생성 로직

### 5.1 생성 파이프라인 전체 흐름

`PPTAgent.generate_pres()` 메서드가 전체 생성 과정을 조율한다:

```python
# pptgen.py - generate_pres() 전체 흐름
async def generate_pres(
    self,
    source_doc: Document,
    num_slides: int | None = None,
    outline: list[OutlineItem] | None = None,
    image_dir: str | None = None,
    dst_language: Language | None = None,
    length_factor: float | None = None,
    auto_length_factor: bool = True,
    max_at_once: int | None = None,
):
    # 1. 이미지 유효성 검증
    source_doc.validate_medias(image_dir)
    source_doc.metadata["presentation-date"] = datetime.now().strftime("%Y-%m-%d")

    # 2. 언어별 길이 조정 비율 계산
    self.dst_lang = dst_language or source_doc.language
    self.length_factor = get_length_factor(self.reference_lang, self.dst_lang)

    # 3. 아웃라인 생성 (또는 외부 제공)
    if outline is None:
        self.outline = await self.generate_outline(num_slides, source_doc)
    else:
        self.outline = outline

    # 4. 기능 슬라이드 자동 추가 (Opening, TOC, Section, Ending)
    # (generate_outline 내부에서 _add_functional_layouts 호출)

    # 5. 간략 아웃라인 문자열 구성 (다른 에이전트에게 컨텍스트로 제공)
    pre_section = None
    section_idx = 0
    self.simple_outline = ""
    for slide_idx, item in enumerate(self.outline):
        if item.topic != pre_section and item.topic != "Functional":
            section_idx += 1
            self.simple_outline += f"Section {section_idx}: {item.topic}\n"
            pre_section = item.topic
        self.simple_outline += f"Slide {slide_idx + 1}: {item.purpose}\n"

    # 6. 비동기 병렬 슬라이드 생성
    if max_at_once:
        semaphore = asyncio.Semaphore(max_at_once)
    else:
        semaphore = AsyncExitStack()  # 제한 없음

    slide_tasks = []
    for slide_idx, outline_item in enumerate(self.outline):
        slide_tasks.append(
            self.generate_slide(slide_idx, outline_item, semaphore=semaphore)
        )
    slide_results = await asyncio.gather(*slide_tasks, return_exceptions=True)

    # 7. 결과 수집
    generated_slides = []
    for result in slide_results:
        if isinstance(result, Exception):
            if self.error_exit:
                succ_flag = False
                break
            continue
        if result is not None:
            slide, code_executor = result
            generated_slides.append(slide)

    # 8. 최종 프레젠테이션 조립
    self.empty_prs.slides = generated_slides
    return self.empty_prs, history
```

### 5.2 Functional Layout 자동 추가 메커니즘

PPTAgent는 Opening, TOC, Section Outline, Ending 슬라이드를 자동으로 추가한다:

```python
def _add_functional_layouts(self, outline: list[OutlineItem]):
    """아웃라인에 기능 슬라이드를 자동 삽입"""

    # 1. 목차 데이터 수집
    toc = []
    for item in outline:
        if item.topic not in toc and item.topic != "Functional":
            toc.append(item.topic)
    self.toc = "\n".join(toc)

    # 2. 고정 위치 기능 슬라이드 삽입
    fixed_functional_slides = [
        (FunctionalLayouts.TOC.value, 0),       # 맨 앞 (Opening 앞)
        (FunctionalLayouts.OPENING.value, 0),    # 맨 앞 (TOC 앞으로 이동)
        (FunctionalLayouts.ENDING.value, 999999), # 맨 뒤
    ]

    for title, pos in fixed_functional_slides:
        # 레퍼런스 PPT에서 가장 유사한 기능 레이아웃을 찾음
        layout = max(
            self.functional_layouts,
            key=lambda x: edit_distance(x.lower(), title),
        )
        # 유사도가 0.7 이상이면 삽입
        if edit_distance(layout, title) > 0.7:
            outline.insert(pos, OutlineItem(
                purpose=layout, topic="Functional",
                indexes=[], images=[]
            ))

    # 3. 각 섹션 시작 전에 Section Outline 슬라이드 삽입
    section_outline = max(
        self.functional_layouts,
        key=lambda x: edit_distance(x, "section outline"),
    )
    if edit_distance(section_outline, "section outline") > 0.7:
        full_outline = []
        pre_section = None
        for item in outline:
            if item.topic == "Functional":
                full_outline.append(item)
                continue
            if item.topic != pre_section:
                # 새 섹션 시작 -> Section Outline 삽입
                new_item = OutlineItem(
                    purpose=section_outline,
                    topic="Functional",
                    indexes=[item.topic],
                    images=[],
                )
                full_outline.append(new_item)
            full_outline.append(item)
            pre_section = item.topic
        return full_outline

    return outline
```

### 5.3 Functional Content 자동 생성

각 기능 슬라이드의 콘텐츠는 사전 정의된 지시문으로 생성된다:

```python
FunctionalContent = {
    "opening":
        "This slide is a presentation opening, presenting available "
        "meta information, like title, author, date, etc.",

    "table of contents":
        "This slide is the Table of Contents, outlining the "
        "presentation's sections. Please use the Table of Contents "
        "given in the retrieved content, remove numbering and ensure "
        "completeness, and generate the final output with the "
        "language specified in the input.",

    "section outline":
        "This slide marks the beginning of a new section and should "
        "present the content from <title>{}</title> as the section "
        "title clearly, any existing prefix or numbering should be "
        "removed. If section number is provided in the schema, use "
        "<section_number>{}</section_number>.",

    "ending":
        "This slide is an *ending slide*, simply express your "
        "gratitude like 'Thank you!' or '谢谢' as the main title "
        "and *do not* include other meta information if not specified.",
}
```

### 5.4 개별 슬라이드 생성 흐름

각 슬라이드는 `generate_slide()` 메서드에서 3단계로 생성된다:

```
┌────────────────────────────────────────────────────────────┐
│              generate_slide(slide_idx, outline_item)        │
│                                                            │
│  [기능 슬라이드인 경우]                                      │
│  ├─ 해당 기능 레이아웃 직접 사용                              │
│  ├─ FunctionalContent에서 콘텐츠 지시문 가져오기             │
│  └─ 바로 Editor + Coder 단계로                              │
│                                                            │
│  [일반 콘텐츠 슬라이드인 경우]                                │
│  ├─ Step 1: _select_layout()                               │
│  │   ├─ outline_item.retrieve() -> header, content, images │
│  │   ├─ ContentOrganizer -> key_points 추출                │
│  │   ├─ LayoutSelector -> 최적 레이아웃 선택                │
│  │   └─ return (layout, header, slide_content)             │
│  │                                                         │
│  ├─ Step 2: _generate_content()                            │
│  │   ├─ Editor -> EditorOutput (스키마 기반 콘텐츠)          │
│  │   ├─ _validate_content() -> 검증 + 길이 조정             │
│  │   ├─ _generate_commands() -> 편집 명령 리스트             │
│  │   └─ return (command_list, template_id)                 │
│  │                                                         │
│  └─ Step 3: _edit_slide()                                  │
│      ├─ Coder -> Python 편집 코드 생성                      │
│      ├─ CodeExecutor.execute_actions() -> 코드 실행          │
│      ├─ 실패시 최대 retry_times 회 재시도                    │
│      │   └─ Coder.retry(error, traceback) 호출              │
│      └─ return (SlidePage, CodeExecutor)                   │
└────────────────────────────────────────────────────────────┘
```

### 5.5 편집 명령 생성 (_generate_commands)

Editor의 출력을 Coder가 이해할 수 있는 편집 명령 리스트로 변환한다:

```python
def _generate_commands(self, editor_output: EditorOutput, layout: Layout):
    command_list = []
    template_id, old_data = layout.index_template_slide(editor_output)

    for el_name, old_content in old_data.items():
        new_content = (
            editor_output[el_name].data if el_name in editor_output else []
        )
        quantity_change = len(new_content) - len(old_content)

        command_list.append((
            el_name,                              # 요소 이름
            layout[el_name].type,                 # 요소 타입 (text/image)
            f"quantity_change: {quantity_change}", # 항목 수 변화
            old_content,                          # 기존 콘텐츠
            new_content,                          # 새 콘텐츠
        ))

    return command_list, template_id
```

이 명령 리스트는 다음과 같은 형태이다:

```python
# 편집 명령 예시
[
    ("title", "text", "quantity_change: 0",
     [{"paragraph": "Old Title"}],
     [{"paragraph": "New Title"}]),

    ("body_text", "text", "quantity_change: +2",
     [{"paragraph": "Point 1"}, {"paragraph": "Point 2"}],
     [{"paragraph": "New Point A"}, {"paragraph": "New Point B"},
      {"paragraph": "New Point C"}, {"paragraph": "New Point D"}]),

    ("image_1", "image", "quantity_change: 0",
     [{"path": "old_image.png"}],
     [{"path": "document/figures/chart1.png"}]),
]
```

### 5.6 CodeExecutor: 편집 코드 실행

Coder가 생성한 Python 코드를 안전하게 실행하는 `CodeExecutor`:

```python
# apis.py - CodeExecutor 핵심 구조
class CodeExecutor:
    def __init__(self, retry_times: int):
        self.retry_times = retry_times
        self.command_history = []    # 편집 명령 히스토리
        self.code_history = []       # 생성된 코드 히스토리
        self.api_history = []        # API 호출 히스토리

    def execute_actions(self, edit_actions, slide, source_doc):
        """
        Coder가 생성한 편집 코드를 실행한다.

        edit_actions: Coder가 생성한 Python 코드 문자열
        slide: 편집할 SlidePage 객체 (deepcopy된 것)
        source_doc: 소스 문서 (이미지 경로 해석용)

        반환: None (성공) 또는 (에러_메시지, 트레이스백) 튜플 (실패)
        """
        try:
            # 사용 가능한 API 함수들을 로컬 네임스페이스에 주입
            local_ns = {
                "slide": slide,
                "source_doc": source_doc,
                "replace_paragraph": replace_paragraph,
                "clone_paragraph": clone_paragraph,
                "del_paragraph": del_paragraph,
                "replace_image": replace_image,
                # ... 기타 API 함수들
            }
            exec(edit_actions, {}, local_ns)
            self.code_history.append(edit_actions)
            return None  # 성공
        except Exception as e:
            return (str(e), traceback.format_exc())

    def get_apis_docs(self, api_type):
        """Coder에게 전달할 API 문서 생성"""
        # 각 API 함수의 docstring을 수집하여 문서화
        ...
```

### 5.7 비동기 병렬 처리 전략

PPTAgent는 `asyncio.gather`를 사용하여 모든 슬라이드를 **병렬로** 생성한다:

```python
# 병렬 처리 + Semaphore로 동시 요청 수 제한
if max_at_once:
    semaphore = asyncio.Semaphore(max_at_once)
else:
    semaphore = AsyncExitStack()  # 무제한

slide_tasks = []
for slide_idx, outline_item in enumerate(self.outline):
    slide_tasks.append(
        self.generate_slide(slide_idx, outline_item, semaphore=semaphore)
    )

# 모든 슬라이드를 동시에 생성 (예외 허용)
slide_results = await asyncio.gather(*slide_tasks, return_exceptions=True)
```

`max_at_once` 파라미터로 LLM API의 rate limit에 맞춰 동시 요청 수를 제한할 수 있다.
이는 특히 GPT-4V 등 비용이 높은 모델을 사용할 때 중요하다.

---

## 6. 디자인 시스템

### 6.1 V1: 레퍼런스 기반 편집 접근법

V1의 디자인 철학은 **"처음부터 디자인하지 않는다"** 이다.
기존 PPT의 디자인을 그대로 가져와서, 콘텐츠만 교체하는 방식이다.

```
┌─────────────────────────────────────────────────┐
│           V1 디자인 보존 메커니즘                  │
│                                                  │
│  원본 슬라이드 (template_id로 참조)               │
│  ┌──────────────────────────┐                    │
│  │ ┌──────┐  ┌───────────┐ │                    │
│  │ │Title │  │   Image   │ │  <-- 레이아웃 보존  │
│  │ │      │  │           │ │                    │
│  │ └──────┘  └───────────┘ │                    │
│  │ ┌──────────────────────┐│                    │
│  │ │  Body Text           ││  <-- 스타일 보존    │
│  │ │  - Point 1           ││      (폰트, 색상,   │
│  │ │  - Point 2           ││       크기, 정렬)   │
│  │ └──────────────────────┘│                    │
│  └──────────────────────────┘                    │
│              │                                    │
│              │ deepcopy + 편집 API                 │
│              ▼                                    │
│  새 슬라이드                                      │
│  ┌──────────────────────────┐                    │
│  │ ┌──────┐  ┌───────────┐ │                    │
│  │ │NEW   │  │ NEW Image │ │  <-- 콘텐츠만 교체  │
│  │ │Title │  │           │ │                    │
│  │ └──────┘  └───────────┘ │                    │
│  │ ┌──────────────────────┐│                    │
│  │ │  NEW Body Text       ││                    │
│  │ │  - New Point A       ││                    │
│  │ │  - New Point B       ││                    │
│  │ └──────────────────────┘│                    │
│  └──────────────────────────┘                    │
└─────────────────────────────────────────────────┘
```

### 6.2 StyleArg: 스타일 복사 제어

V1은 `StyleArg`로 어떤 스타일 속성을 원본에서 복사할지 제어한다:

```python
# presentation/ 모듈의 StyleArg
class StyleArg:
    font: bool       # 폰트 패밀리
    size: bool       # 폰트 크기
    color: bool      # 텍스트 색상
    bold: bool       # 볼드
    italic: bool     # 이탤릭
    underline: bool  # 밑줄
    alignment: bool  # 텍스트 정렬
    area: bool       # 영역 크기

    @classmethod
    def all_true(cls):
        """모든 스타일 속성을 복사"""
        return cls(font=True, size=True, color=True,
                   bold=True, italic=True, underline=True,
                   alignment=True, area=True)

# pptgen.py에서 사용 - area만 제외
style = StyleArg.all_true()
style.area = False  # 영역 크기는 복사하지 않음 (콘텐츠 양에 따라 조정)
```

### 6.3 V2: HTML/CSS 자유 형식 디자인

V2는 레퍼런스 PPT 없이 **HTML/CSS로 슬라이드를 직접 디자인**한다.
Design Agent의 시스템 프롬프트에 엄격한 디자인 규칙이 포함된다:

```
V2 디자인 제약 조건 (Design.yaml에서 발췌):

1. 고정 캔버스 크기:
   - 16:9 비율: 1280 x 720 px
   - A4 비율: 794 x 1123 px

2. 텍스트 규칙:
   - 반드시 시맨틱 요소로 감싸기: <p>, <li>, <span>
   - 목록은 <ul> 또는 <ol>만 사용
   - 텍스트 요소에 인라인 margin, border, shadow 금지
   - 크로스 플랫폼 안전 폰트만 사용:
     * 영문: Arial, Helvetica, sans-serif
     * 중문: "Microsoft YaHei", "PingFang SC"

3. 이미지 규칙:
   - object-fit: contain 사용 (이미지 전체 표시 보장)
   - 비율 유지

4. 레이아웃 규칙:
   - 요소 겹침(overlap) 금지
   - 충분한 여백(margin/padding) 확보
   - 투사(projection) 표시에 적합한 크기
```

### 6.4 V2 디자인 계획 (design_plan.md)

V2 Design Agent는 슬라이드를 만들기 전에 먼저 **디자인 계획**을 작성한다:

```markdown
# Design Plan (design_plan.md 예시 구조)

## 전체 테마
- 색상 팔레트: Primary #2563EB, Secondary #10B981, Background #F8FAFC
- 폰트: 제목 Arial Bold 36px, 본문 Arial Regular 18px
- 스타일: 깔끔한 비즈니스 스타일, 미니멀리즘

## 슬라이드 구성
### Slide 1: 표지
- 레이아웃: 중앙 정렬, 제목 + 부제목 + 날짜
- 배경: 그라디언트 (#2563EB -> #1E40AF)

### Slide 2: 목차
- 레이아웃: 2열 그리드
- 섹션별 아이콘 + 제목

### Slide 3-5: 본문
- 레이아웃: 좌측 텍스트 + 우측 이미지
- ...
```

이 계획을 먼저 작성한 후, 각 슬라이드 HTML을 순차적으로 생성하면서
매번 렌더링 결과를 검수(reflect)한다.

### 6.5 텍스트 길이 재조정 (length_rewrite)

V1에서 언어가 다른 경우 Editor가 생성한 텍스트의 길이를 자동으로 조정한다:

```python
# presentation/layout.py - 길이 재조정
async def length_rewrite(self, editor_output, length_factor, llm):
    """
    텍스트 길이를 언어별 비율에 맞게 조정한다.

    예: 영어 레퍼런스(latin) -> 한국어 생성(CJK)
        length_factor = 0.7
        원본 100자 슬롯 -> 70자로 줄이라는 지시

    예: 한국어 레퍼런스(CJK) -> 영어 생성(latin)
        length_factor = 2.0
        원본 50자 슬롯 -> 100자로 늘리라는 지시
    """
    for element in self.elements:
        if element.type == "text":
            target_length = int(len(element.data) * length_factor)
            # LLM에게 해당 길이로 텍스트 재작성 요청
            ...
```

### 6.6 디자인 시스템 비교 요약

| 측면 | V1 (레퍼런스 기반) | V2 (HTML/CSS) |
|------|------------------|--------------|
| **디자인 소스** | 기존 PPT 복제 | AI가 처음부터 설계 |
| **일관성** | 매우 높음 (원본 스타일 보존) | 디자인 계획에 의존 |
| **유연성** | 낮음 (레이아웃 제한적) | 매우 높음 (자유 형식) |
| **품질 보장** | 원본 품질에 의존 | 리플렉션 루프로 검증 |
| **색상/폰트** | 원본 그대로 복사 | LLM이 결정 |
| **레이아웃** | 클러스터링된 패턴 재사용 | 콘텐츠별 맞춤 설계 |
| **이미지 배치** | 원본 위치/크기 유지 | CSS로 자유 배치 |
| **장점** | 안정적, 예측 가능 | 창의적, 다양한 디자인 |
| **단점** | 레퍼런스 PPT 필수 | 품질 편차 큼 |


---

## 7. 차트/다이어그램/이미지 처리

### 7.1 이미지 처리 아키텍처 개관

PPTAgent는 이미지를 세 가지 경로로 처리한다:

```
┌─────────────────────────────────────────────────────────────┐
│                    이미지 처리 파이프라인                      │
│                                                             │
│  경로 1: 소스 문서의 기존 이미지                               │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ Document │──>│ ImageLabler  │──>│ 캡션 + 분류   │        │
│  │ 이미지    │   │ (Vision LLM) │   │ 메타데이터    │        │
│  └──────────┘   └──────────────┘   └──────────────┘        │
│                                                             │
│  경로 2: 테이블 데이터 -> 이미지 변환                          │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ HTML     │──>│ html2image   │──>│ PNG 이미지    │        │
│  │ 테이블    │   │ + crop       │   │              │        │
│  └──────────┘   └──────────────┘   └──────────────┘        │
│                                                             │
│  경로 3: AI 이미지 생성 (V2 전용)                             │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ 텍스트   │──>│ T2I Model    │──>│ 생성된 이미지  │        │
│  │ 프롬프트  │   │ (DALL-E 등)  │   │              │        │
│  └──────────┘   └──────────────┘   └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 ImageLabler: 이미지 캡셔닝 시스템

`pptagent/multimodal.py`의 `ImageLabler`는 Vision Model을 사용하여
소스 문서의 이미지에 대한 캡션과 분류를 생성한다:

```python
# multimodal.py - ImageLabler 핵심 구조
class ImageLabler:
    """Vision Model 기반 이미지 분석"""

    def __init__(self, vision_model: AsyncLLM):
        self.vision_model = vision_model

    async def label_image(self, image_path: str) -> dict:
        """
        이미지를 분석하여 캡션과 타입을 반환한다.

        반환값:
        {
            "caption": "분기별 매출 성장을 보여주는 막대 그래프...",
            "type": "Chart",  # Chart, Table, Diagram, Picture 등
            "relevance": 0.85  # 주제 관련성 점수
        }
        """
        # 이미지를 base64로 인코딩
        # Vision Model에 분석 요청
        ...
```

V2의 `tool_agents.py`에서는 더 구조화된 캡셔닝 시스템을 제공한다:

```python
# deeppresenter/tools/tool_agents.py - 이미지 캡셔닝 프롬프트
_CAPTION_SYSTEM = """
You are a helpful assistant that can describe the main content
of the image in less than 50 words, avoiding unnecessary details
or comments.

Additionally, classify the image as:
'Table', 'Chart', 'Landscape', 'Diagram', 'Banner',
'Background', 'Icon', 'Logo', etc.
or 'Picture' if it cannot be classified as one of the above.

Give your answer in the following format:
<type>:<description>

Example Output:
Chart: Bar graph showing quarterly revenue growth over five years.
Color-coded bars represent different product lines. Notable spike
in Q4 of the most recent year, with a dotted line indicating
industry average for comparison

Now give your answer in one sentence only, without line breaks:
"""

@mcp.tool()
async def image_caption(image_path: str) -> dict:
    """이미지 캡션 및 크기 정보 반환"""
    with Image.open(image_path) as img:
        img.verify()
        size = img.size

    with open(image_path, "rb") as f:
        image_b64 = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"

    response = await LLM_CONFIG.vision_model.run(
        messages=[
            {"role": "system", "content": _CAPTION_SYSTEM},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": image_b64}}
            ]},
        ],
    )
    return {
        "size": size,
        "caption": response.choices[0].message.content,
    }
```

### 7.3 AI 이미지 생성 (V2)

V2의 `tool_agents.py`는 T2I(Text-to-Image) 모델을 통한 이미지 생성 도구를 제공한다:

```python
# deeppresenter/tools/tool_agents.py - 이미지 생성
PIXEL_MULTIPLE = int(os.getenv("PIXEL_MULTIPLE", 16))

@mcp.tool(
    description=(
        "Generate an image and save it to the specified path.\n\n"
        "Args:\n"
        "    prompt: Text description of the image to generate. "
        "Should be detailed and specific, but do not include "
        "aspect ratio.\n"
        f"    width: Width in pixels, must be multiple of {PIXEL_MULTIPLE}\n"
        f"    height: Height in pixels, must be multiple of {PIXEL_MULTIPLE}\n"
        "    path: Full path where the image should be saved"
    )
)
async def image_generation(
    prompt: str, width: int, height: int, path: str
) -> str:
    response = await LLM_CONFIG.t2i_model.generate_image(
        prompt=prompt, width=width, height=height
    )

    image_b64 = response.data[0].b64_json
    image_url = response.data[0].url

    Path(path).parent.mkdir(parents=True, exist_ok=True)

    if image_b64:
        image_bytes = base64.b64decode(image_b64)
    elif image_url:
        async with httpx.AsyncClient() as client:
            resp = await client.get(image_url)
            image_bytes = resp.content
    else:
        raise ValueError("Empty Response")

    with open(path, "wb") as file:
        file.write(image_bytes)

    return "Image generated successfully, saved to " + path
```

주목할 점:
- `width`와 `height`는 반드시 `PIXEL_MULTIPLE`(기본 16)의 배수여야 한다
- b64_json과 url 두 가지 응답 형식을 모두 지원한다
- Design Agent가 이 도구를 호출하여 슬라이드에 삽입할 이미지를 자율적으로 생성한다

### 7.4 테이블 처리: HTML -> 이미지

V1은 복잡한 테이블을 HTML로 렌더링한 뒤 이미지로 캡처한다:

```python
# utils.py - 테이블 이미지 생성
TABLE_CSS = """
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #4472C4; color: white; }
tr:nth-child(even) { background-color: #f2f2f2; }
"""

def get_html_table_image(html_table: str, output_path: str):
    """
    HTML 테이블을 이미지로 변환한다.

    1. HTML 테이블 + CSS를 완전한 HTML 문서로 구성
    2. html2image 라이브러리로 스크린샷 촬영
    3. manual_scan_crop()으로 불필요한 여백 제거
    4. PNG로 저장
    """
    full_html = f"""
    <html><head><style>{TABLE_CSS}</style></head>
    <body>{html_table}</body></html>
    """

    hti = Html2Image(output_path=os.path.dirname(output_path))
    hti.screenshot(html_str=full_html, save_as=os.path.basename(output_path))

    # 여백 자동 크롭
    manual_scan_crop(output_path)

def manual_scan_crop(image_path: str):
    """
    이미지의 실제 콘텐츠 경계를 스캔하여 여백을 제거한다.
    상하좌우에서 픽셀을 스캔하여 비어있지 않은 첫 행/열을 찾는다.
    """
    ...
```

### 7.5 이미지 포맷 변환

V1은 다양한 이미지 포맷을 처리할 수 있다:

```python
# utils.py - 이미지 관련 유틸리티

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp',
                    '.tiff', '.webp', '.wmf', '.emf', '.svg'}

def is_image_path(path: str) -> bool:
    """파일 확장자로 이미지 여부 판별"""
    return Path(path).suffix.lower() in IMAGE_EXTENSIONS

def parsing_image(image_path: str) -> Image:
    """
    다양한 포맷의 이미지를 PIL Image로 변환한다.
    - WMF/EMF: wmf_to_images()로 PNG 변환 후 로드
    - WEBP: RGBA로 변환
    - 기타: 직접 로드
    """
    suffix = Path(image_path).suffix.lower()
    if suffix in ('.wmf', '.emf'):
        png_path = wmf_to_images(image_path)
        return Image.open(png_path)
    elif suffix == '.webp':
        img = Image.open(image_path)
        return img.convert('RGBA')
    else:
        return Image.open(image_path)

def wmf_to_images(wmf_path: str) -> str:
    """WMF/EMF 파일을 PNG로 변환 (LibreOffice 사용)"""
    # unoconvert 또는 soffice 명령어로 변환
    ...
```

### 7.6 이미지 크기 기반 필터링

V1은 슬라이드 면적 대비 이미지 크기를 기준으로 이미지를 분류한다:

```python
# pptgen.py - 이미지 크기 필터링 (3.7절에서 이미 다룸)
# 핵심 로직 요약:
#
# 면적 비율 < hide_small_pic_ratio (기본 0.2):
#   -> 장식적 요소(로고, 아이콘)로 판단
#   -> 배경으로 이동 (콘텐츠 요소에서 제외)
#
# 면적 비율 >= hide_small_pic_ratio:
#   -> 콘텐츠 이미지로 판단
#   -> 레이아웃의 이미지 슬롯에 포함
#
# 모든 이미지가 작은 경우:
#   -> 레이아웃을 :image에서 :text로 전환
```

### 7.7 V1 vs V2 이미지 처리 비교

| 기능 | V1 | V2 |
|------|-----|-----|
| 기존 이미지 사용 | 소스 문서에서 추출 | 소스 문서 + 웹 검색 |
| 이미지 생성 | 불가 | T2I 모델 (DALL-E 등) |
| 이미지 분석 | ImageLabler (캡셔닝) | image_caption 도구 |
| 테이블 이미지 | HTML -> html2image | HTML 슬라이드에 직접 포함 |
| 포맷 변환 | WMF, WEBP, EMF 지원 | 웹 표준 포맷만 |
| 크기 필터링 | 면적 비율 기반 | CSS로 직접 제어 |
| 배치 방식 | 원본 위치/크기 유지 | CSS position/flexbox |

---

## 8. PPTEval 자동 평가 시스템

### 8.1 개요

PPTEval은 PPTAgent의 가장 중요한 학술적 기여 중 하나이다.
생성된 프레젠테이션의 품질을 **3차원**으로 자동 평가하는 프레임워크이다.
이는 `pptagent/ppteval.py`에 구현되어 있다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PPTEval 3차원 평가 체계                        │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Dimension 1   │  │   Dimension 2   │  │   Dimension 3   │ │
│  │                 │  │                 │  │                 │ │
│  │   CONTENT       │  │   DESIGN        │  │   COHERENCE     │ │
│  │   (내용 품질)    │  │   (디자인 품질)  │  │   (논리적 일관성)│ │
│  │                 │  │                 │  │                 │ │
│  │ - 정보 정확성   │  │ - 시각적 균형   │  │ - 슬라이드 간   │ │
│  │ - 내용 완전성   │  │ - 가독성        │  │   논리적 흐름   │ │
│  │ - 원문 충실도   │  │ - 색상 조화     │  │ - 전체 구조     │ │
│  │ - 핵심 포인트   │  │ - 레이아웃 품질 │  │   완성도       │ │
│  │   포함 여부     │  │ - 요소 정렬     │  │ - 섹션 간      │ │
│  │                 │  │                 │  │   전환 자연스러움│ │
│  │ Score: 1-5      │  │ Score: 1-5      │  │ Score: 1-5      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  평가 입력:                                                       │
│  - Content: 소스 문서 텍스트 + 생성된 슬라이드 텍스트              │
│  - Design: 슬라이드 스크린샷 이미지 (Vision Model)                │
│  - Coherence: 전체 프레젠테이션 아웃라인 + 슬라이드 순서           │
│                                                                  │
│  최종 점수 = weighted_average(content, design, coherence)         │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Content 평가 (내용 품질)

Content 평가는 소스 문서와 생성된 슬라이드의 텍스트를 비교한다:

```
[PPTEval Content 평가 프롬프트 구조]

당신은 프레젠테이션 콘텐츠 품질 평가 전문가입니다.
소스 문서와 생성된 슬라이드의 텍스트를 비교하여 평가하세요.

평가 기준 (1-5점):
5점 (Excellent):
  - 소스 문서의 핵심 내용이 정확하게 반영됨
  - 불필요한 정보 없이 간결하게 요약됨
  - 슬라이드에 적합한 길이와 형식

4점 (Good):
  - 대부분의 핵심 내용이 포함됨
  - 사소한 누락이나 불필요한 내용이 있음

3점 (Average):
  - 핵심 내용의 일부만 포함됨
  - 일부 부정확한 내용이 있음

2점 (Below Average):
  - 핵심 내용 대부분이 누락됨
  - 부정확한 정보가 다수 포함됨

1점 (Poor):
  - 소스 문서와 거의 관련 없는 내용
  - 심각한 오류나 할루시네이션

소스 문서:
{source_text}

생성된 슬라이드 텍스트:
{slide_text}

JSON으로 평가 결과를 반환하세요:
{"score": <1-5>, "reasoning": "<상세 평가 근거>"}
```

### 8.3 Design 평가 (디자인/시각 품질)

Design 평가는 **Vision Model**을 사용하여 슬라이드 스크린샷을 직접 분석한다:

```
[PPTEval Design 평가 프롬프트 구조]

당신은 프레젠테이션 디자인 품질 평가 전문가입니다.
슬라이드 스크린샷을 보고 시각적 품질을 평가하세요.

평가 기준 (1-5점):
5점 (Excellent):
  - 전문적이고 세련된 디자인
  - 요소 배치가 균형 잡혀 있음
  - 텍스트 가독성이 뛰어남
  - 색상 조화가 우수함
  - 적절한 여백과 정렬

4점 (Good):
  - 전반적으로 깔끔한 디자인
  - 사소한 정렬 문제나 여백 불균형

3점 (Average):
  - 기본적인 디자인 원칙은 준수
  - 눈에 띄는 레이아웃 문제가 있음

2점 (Below Average):
  - 요소 겹침이나 잘림 현상
  - 가독성 문제

1점 (Poor):
  - 심각한 디자인 결함
  - 텍스트를 읽을 수 없거나 요소가 크게 어긋남

[슬라이드 스크린샷 이미지]

JSON으로 평가 결과를 반환하세요:
{"score": <1-5>, "reasoning": "<상세 평가 근거>"}
```

### 8.4 Coherence 평가 (논리적 일관성)

Coherence 평가는 프레젠테이션 전체의 논리적 흐름을 평가한다:

```
[PPTEval Coherence 평가 프롬프트 구조]

당신은 프레젠테이션 구조 및 일관성 평가 전문가입니다.
프레젠테이션의 전체 아웃라인과 슬라이드 순서를 보고
논리적 일관성을 평가하세요.

평가 기준 (1-5점):
5점 (Excellent):
  - 슬라이드 간 논리적 흐름이 자연스러움
  - 섹션 구조가 명확하고 일관적
  - 도입-본론-결론 구조가 완성됨
  - 각 슬라이드가 전체 스토리에 기여

4점 (Good):
  - 전반적으로 일관된 흐름
  - 일부 슬라이드 간 전환이 부자연스러움

3점 (Average):
  - 기본적인 구조는 있으나 흐름이 끊김
  - 일부 슬라이드의 위치가 부적절

2점 (Below Average):
  - 논리적 흐름이 거의 없음
  - 슬라이드 순서가 혼란스러움

1점 (Poor):
  - 전혀 일관성 없는 무작위 나열
  - 구조적 완성도 없음

프레젠테이션 아웃라인:
{outline}

슬라이드 순서 및 내용 요약:
{slides_summary}

JSON으로 평가 결과를 반환하세요:
{"score": <1-5>, "reasoning": "<상세 평가 근거>"}
```

### 8.5 PPTEval 파이프라인 구현

```python
# ppteval.py - 핵심 구조 (재구성)
class PPTEval:
    """프레젠테이션 자동 평가 시스템"""

    def __init__(self, language_model: AsyncLLM, vision_model: AsyncLLM):
        self.language_model = language_model
        self.vision_model = vision_model

    async def evaluate(
        self,
        presentation: Presentation,
        source_doc: Document,
        slide_images: list[str],  # 슬라이드 스크린샷 경로들
    ) -> dict:
        """
        프레젠테이션을 3차원으로 평가한다.

        반환값:
        {
            "content": {"score": 4.2, "per_slide": [...]},
            "design": {"score": 3.8, "per_slide": [...]},
            "coherence": {"score": 4.0, "details": "..."},
            "overall": 4.0
        }
        """
        # 1. Content 평가: 각 슬라이드별로 소스 텍스트와 비교
        content_scores = await self._evaluate_content(
            presentation, source_doc
        )

        # 2. Design 평가: 각 슬라이드 스크린샷을 Vision Model로 분석
        design_scores = await self._evaluate_design(slide_images)

        # 3. Coherence 평가: 전체 프레젠테이션 구조 분석
        coherence_score = await self._evaluate_coherence(presentation)

        # 4. 종합 점수 계산
        overall = (
            content_scores["avg"] +
            design_scores["avg"] +
            coherence_score["score"]
        ) / 3

        return {
            "content": content_scores,
            "design": design_scores,
            "coherence": coherence_score,
            "overall": round(overall, 2)
        }

    async def _evaluate_content(self, presentation, source_doc):
        """슬라이드별 Content 평가 (Language Model)"""
        tasks = []
        for slide in presentation.slides:
            slide_text = slide.extract_text()
            source_text = source_doc.get_relevant_text(slide)
            tasks.append(self._score_content(source_text, slide_text))
        scores = await asyncio.gather(*tasks)
        return {"avg": sum(s["score"] for s in scores) / len(scores),
                "per_slide": scores}

    async def _evaluate_design(self, slide_images):
        """슬라이드별 Design 평가 (Vision Model)"""
        tasks = []
        for img_path in slide_images:
            tasks.append(self._score_design(img_path))
        scores = await asyncio.gather(*tasks)
        return {"avg": sum(s["score"] for s in scores) / len(scores),
                "per_slide": scores}

    async def _evaluate_coherence(self, presentation):
        """프레젠테이션 전체 Coherence 평가 (Language Model)"""
        outline = presentation.get_outline_summary()
        return await self._score_coherence(outline)
```

### 8.6 PPTEval의 학술적 의의

PPTEval은 EMNLP 2025 논문의 핵심 기여 중 하나이다:

1. **최초의 다차원 자동 평가**: 기존에는 프레젠테이션 품질을 자동으로 평가하는 표준 방법이 없었다
2. **인간 평가와의 상관관계**: 논문에서 PPTEval 점수가 인간 평가자의 점수와 높은 상관관계를 보임을 검증
3. **재현 가능한 벤치마크**: 다른 프레젠테이션 생성 시스템과의 공정한 비교를 가능하게 함
4. **Vision Model 활용**: 디자인 평가에서 시각적 분석을 자동화한 최초의 시도 중 하나

### 8.7 PPTEval 핵심 인사이트

| 설계 결정 | 이유 | 우리 프로젝트 적용 |
|----------|------|------------------|
| 3차원 분리 | 각 측면을 독립적으로 개선 가능 | Content/Design/Structure 분리 평가 도입 |
| 슬라이드별 평가 | 약한 슬라이드를 특정하여 개선 | 슬라이드 단위 품질 점수 표시 |
| Vision Model | 디자인은 텍스트만으로 평가 불가 | 렌더링 후 스크린샷 기반 디자인 체크 |
| 5점 척도 | 세분화된 평가 + 해석 용이 | 동일한 1-5 척도 채택 |
| JSON 출력 | 프로그래밍적 처리 용이 | structured output 사용 |

---

## 9. V2 DeepPresenter 심층 분석

### 9.1 V2 탄생 배경

V1의 한계를 극복하기 위해 V2(DeepPresenter)가 개발되었다:

| V1의 한계 | V2의 해결 |
|----------|----------|
| 레퍼런스 PPT 필수 | 토픽/키워드만으로 생성 가능 |
| 고정된 파이프라인 | 자율적 에이전트 루프 |
| 소스 문서 필수 | 딥리서치로 자동 자료 수집 |
| 디자인 다양성 제한 | HTML/CSS 자유 형식 |
| 내부 상태 기반 검증 | 렌더링 결과 시각적 검증 |

### 9.2 AgentLoop 상세 구조

`deeppresenter/main.py`의 AgentLoop이 전체 V2 파이프라인을 관리한다:

```python
# deeppresenter/main.py - AgentLoop (재구성)
class AgentLoop:
    """
    V2의 메인 오케스트레이터.
    Research -> Design 순서로 에이전트를 실행한다.
    """

    def __init__(self, config: DeepPresenterConfig):
        self.config = config

    async def run(self, req: InputRequest) -> AsyncGenerator:
        workspace = WORKSPACE_BASE / req.workspace_id
        workspace.mkdir(parents=True, exist_ok=True)

        # AgentEnv: MCP 서버 연결, Docker 컨테이너 준비
        async with AgentEnv(workspace, self.config) as env:

            # Phase 1: Research Agent
            research = ResearchAgent(
                config=self.config,
                agent_env=env,
                workspace=workspace,
                language=req.language,
            )
            async for msg in research.loop(req):
                yield msg  # 진행 상황 스트리밍

            # Phase 2: Design Agent (또는 PPTAgent)
            # config에 따라 HTML 디자인 또는 V1 스타일 생성 선택
            design = DesignAgent(
                config=self.config,
                agent_env=env,
                workspace=workspace,
                language=req.language,
            )
            async for msg in design.loop(req):
                yield msg

            # Phase 3: HTML -> PPTX 변환
            # html2pptx 모듈로 최종 변환
            yield "Conversion complete"
```

### 9.3 MCP 기반 도구 시스템

V2의 가장 큰 아키텍처적 차이는 **MCP(Model Context Protocol)** 기반 도구 시스템이다.
여러 MCP 서버가 각각 특화된 도구 세트를 제공한다:

```
┌─────────────────────────────────────────────────────────────┐
│                   MCP 도구 생태계 (30+ 도구)                  │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Filesystem     │  │ Search Server  │  │ Research      │ │
│  │ Server         │  │                │  │ Server        │ │
│  │                │  │ - web_search   │  │               │ │
│  │ - read_file    │  │   (Tavily)     │  │ - arxiv_      │ │
│  │ - write_file   │  │ - fetch_url    │  │   search      │ │
│  │ - list_dir     │  │   (Firecrawl/  │  │ - semantic_   │ │
│  │ - create_dir   │  │    Trafilatura)│  │   scholar     │ │
│  │ - delete_file  │  │               │  │   _search     │ │
│  │ - move_file    │  │               │  │               │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Sandbox Server │  │ Tool Agents    │  │ Reflect       │ │
│  │ (Docker)       │  │ Server         │  │ Server        │ │
│  │                │  │                │  │               │ │
│  │ - execute_     │  │ - image_       │  │ - render_     │ │
│  │   command      │  │   generation   │  │   slide       │ │
│  │   (bash/python │  │ - image_       │  │ - take_       │ │
│  │    in sandbox) │  │   caption      │  │   screenshot  │ │
│  │                │  │ - document_    │  │ - inspect_    │ │
│  │                │  │   summary      │  │   quality     │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                              │
│  ┌────────────────┐                                         │
│  │ Any2Markdown   │                                         │
│  │ Server         │                                         │
│  │                │                                         │
│  │ - convert_file │                                         │
│  │   (PDF, DOCX,  │                                         │
│  │    PPTX ->     │                                         │
│  │    Markdown)   │                                         │
│  └────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 MCP 서버 연결 및 도구 등록

`AgentEnv`가 MCP 서버에 연결하고 도구를 등록하는 과정:

```python
# deeppresenter/agents/env.py - MCP 연결 (핵심)

class AgentEnv:
    async def __aenter__(self):
        """MCP 서버 연결 및 도구 등록"""
        # 중복 Docker 컨테이너 정리
        try:
            client = docker.from_env()
            container = client.containers.get(self.workspace.stem)
            container.remove(force=True)
        except NotFound:
            pass

        # 모든 MCP 서버에 병렬로 연결
        await asyncio.gather(
            *[self.connect_server(server) for server in self.mcp_configs]
        )
        return self

    async def connect_server(self, server: MCPServer):
        """단일 MCP 서버 연결 + 도구 등록"""
        name = server.name
        await self.client.connect_server(name, server)

        # keep_tools/exclude_tools 필터링
        keep_tools = server.keep_tools
        exclude_tools = set(server.exclude_tools)

        tools_dict = await self.client.list_tools(name)
        for tool_name, tool_info in tools_dict.items():
            if (keep_tools is None or tool_name in keep_tools) \
               and tool_name not in exclude_tools:
                tool = {
                    "type": "function",
                    "function": {
                        "name": tool_name,
                        "description": tool_info.description,
                        "parameters": tool_info.inputSchema,
                    },
                }
                self._tools_dict[tool_name] = tool
                self._server_tools[name].append(tool_name)
                self._tool_to_server[tool_name] = name
```

### 9.5 도구 실행 및 에러 처리

```python
# deeppresenter/agents/env.py - 도구 실행
async def tool_execute(self, tool_call: ToolCall):
    """도구 실행 + 타이밍 추적 + 에러 처리"""
    try:
        start_time = time.time()
        arguments = json.loads(tool_call.function.arguments)

        if tool_call.function.name in self._local_tools:
            result = await self._call_local_tool(
                tool_call.function.name, arguments
            )
        else:
            server_id = self._tool_to_server[tool_call.function.name]
            result = await self.client.tool_execute(
                server_id, tool_call.function.name, arguments
            )

    except KeyError:
        result = CallToolResult(
            content=[TextContent(text=f"Tool not found.", type="text")],
            isError=True,
        )
    except TimeoutError:
        result = CallToolResult(
            content=[TextContent(
                text=f"Timed out after {MCP_CALL_TIMEOUT}s.",
                type="text"
            )],
            isError=True,
        )
    finally:
        elapsed = time.time() - start_time
        self.timing_dict[tool_call.function.name].total_time += elapsed

    # 긴 출력 자동 잘라내기
    if len(block.text) > self.cutoff_len:
        truncated = block.text[:self.cutoff_len]
        truncated = truncated[:truncated.rfind("\n")]
        truncated += CUTOFF_WARNING.format(
            line=truncated.count("\n"),
            resource_id=str(local_file)
        )
        block.text = truncated

    return msg
```

### 9.6 환경 기반 리플렉션 (Environment-Grounded Reflection)

V2의 핵심 혁신은 **생성된 슬라이드를 실제로 렌더링하고 시각적으로 검증**하는 것이다:

```
┌─────────────────────────────────────────────────────┐
│          환경 기반 리플렉션 루프                       │
│                                                      │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐│
│  │ Design   │──>│ HTML 슬라이드 │──>│ Playwright   ││
│  │ Agent    │   │ 작성         │   │ 렌더링       ││
│  └──────────┘   └──────────────┘   └──────┬───────┘│
│       ▲                                    │        │
│       │                                    ▼        │
│       │                           ┌──────────────┐ │
│       │                           │ 스크린샷      │ │
│       │                           │ 캡처         │ │
│       │                           └──────┬───────┘ │
│       │                                  │         │
│       │         ┌──────────────┐         │         │
│       │         │ Vision Model │<────────┘         │
│       │         │ 품질 검수    │                    │
│       │         │              │                    │
│       │         │ "텍스트 잘림  │                    │
│       │         │  감지",      │                    │
│       │         │ "색상 대비   │                    │
│       │         │  부족" 등    │                    │
│       │         └──────┬───────┘                    │
│       │                │                            │
│       │         피드백  │                            │
│       └────────────────┘                            │
│                                                      │
│  이 루프를 각 슬라이드마다 반복하여 품질을 보장한다    │
└─────────────────────────────────────────────────────┘
```

이것이 논문 제목 "Environment-Grounded Reflection"의 핵심이다:
- 기존 시스템: LLM의 내부 추론(internal reasoning)에만 의존
- DeepPresenter: 실제 렌더링된 아티팩트(환경)를 관찰하고 피드백

### 9.7 컨텍스트 폴딩 (Context Folding)

V2 에이전트는 장시간 실행되면서 대화 히스토리가 길어지는 문제를 **컨텍스트 폴딩**으로 해결한다:

```python
# deeppresenter/agents/agent.py - 컨텍스트 폴딩
async def compact_history(self, keep_head: int = 10, keep_tail: int = 4):
    """
    대화 히스토리를 요약하여 압축한다.

    전략:
    1. 앞부분 keep_head개 메시지 유지 (시스템 프롬프트 + 초기 지시)
    2. 뒷부분 keep_tail개 메시지 유지 (최근 컨텍스트)
    3. 중간 부분을 LLM으로 요약
    4. 요약 결과를 중간에 삽입
    """
    if keep_head + keep_tail > len(self.chat_history):
        return

    if self.research_iter == self.max_context_turns:
        return  # 최대 폴딩 횟수 도달

    self.save_history(message_only=True)
    self.research_iter += 1

    head, tail = self._split_history(keep_head, keep_tail)

    # LLM에게 중간 히스토리 요약 요청
    summary_ask = ChatMessage(
        role=Role.USER,
        content=MEMORY_COMPACT_MSG.format(language=self.language)
    )
    response = await self.llm.run(
        self.chat_history + [summary_ask],
        tools=self.tools,
    )

    summary_message = ChatMessage(
        id=f"context_fold_{uuid.uuid4().hex[:8]}",
        role=response.choices[0].message.role,
        content=response.choices[0].message.content,
        tool_calls=response.choices[0].message.tool_calls,
    )

    # 압축된 히스토리로 교체
    self.chat_history = head + tail + [summary_ask, summary_message, ...]
```

컨텍스트 경고 시스템:
```python
# 컨텍스트 사용량 경고
if self.context_length > self.context_window * 0.5:
    # 50% 경고: "You have used over half of your context budget..."
    observations[0].content.insert(0, HALF_BUDGET_NOTICE_MSG)

elif self.context_length > self.context_window * 0.8:
    # 80% 긴급 경고: "URGENT: Context budget nearly exhausted..."
    observations[0].content.insert(0, URGENT_BUDGET_NOTICE_MSG)

if self.context_length > self.context_window:
    if self.context_warning == -1:
        # 컨텍스트 폴딩 모드: 자동 압축
        await self.compact_history()
    else:
        # 일반 모드: 에러 발생
        raise RuntimeError("Context window exceeded")
```

### 9.8 V2 Agent 기반 클래스 상세

V2의 Agent 클래스는 V1과 완전히 다른 구조이다:

```python
# deeppresenter/agents/agent.py - V2 Agent 핵심

class Agent:
    def __init__(self, config, agent_env, workspace, language):
        self.name = self.__class__.__name__
        self.cost = Cost()
        self.context_length = 0
        self.workspace = workspace
        self.agent_env = agent_env

        # YAML 역할 설정 로드
        config_file = PACKAGE_DIR / "roles" / f"{self.name}.yaml"
        with open(config_file) as f:
            config_data = yaml.safe_load(f)
        self.role_config = RoleConfig(**config_data)

        # 도구 세트 구성
        self._setup_toolset()

        # 시스템 프롬프트 구성
        self.system = self.role_config.system[language]
        self.prompt = Template(self.role_config.instruction)

        # execute_command 도구가 있으면 에이전트 프롬프트 추가
        if any(t["function"]["name"] == "execute_command"
               for t in self.tools):
            self.system += AGENT_PROMPT.format(
                workspace=self.workspace,
                cutoff_len=self.agent_env.cutoff_len,
                time=datetime.now().strftime("%Y-%m-%d"),
                max_toolcall_per_turn=MAX_TOOLCALL_PER_TURN,
            )

    async def action(self, **chat_kwargs):
        """도구 호출 인터페이스"""
        if len(self.chat_history) == 1:
            self.chat_history.append(ChatMessage(
                role=Role.USER,
                content=self.prompt.render(**chat_kwargs),
            ))

        response = await self.llm.run(
            messages=self.chat_history,
            tools=self.tools,  # 도구 목록 전달
        )
        # 토큰 사용량 추적
        if response.usage is not None:
            self.cost += response.usage
            self.context_length = response.usage.total_tokens

        self.chat_history.append(ChatMessage(
            role=Role.ASSISTANT,
            content=response.choices[0].message.content,
            tool_calls=response.choices[0].message.tool_calls,
        ))
        return self.chat_history[-1]

    async def execute(self, tool_calls: list[ToolCall]):
        """도구 호출 실행 + 결과 수집"""
        coros = []
        for t in tool_calls:
            arguments = get_json_from_response(t.function.arguments)

            # finalize 도구: 작업 완료 신호
            if t.function.name == "finalize":
                arguments["agent_name"] = self.name
                outcome = arguments["outcome"]

            coros.append(self.agent_env.tool_execute(t))

        observations = await asyncio.gather(*coros)

        # 이미지 응답 처리 (모델별 포맷 변환)
        for obs in observations:
            if obs.has_image:
                if "gemini" in self.model.lower():
                    obs.role = Role.USER  # Gemini는 USER 역할로
                if "claude" in self.model.lower():
                    # Claude 포맷으로 변환
                    oai_b64 = obs.content[0]["image_url"]["url"]
                    obs.content = [{
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": oai_b64.split(";")[0].split(":")[1],
                            "data": oai_b64.split(",")[1],
                        },
                    }]

        self.chat_history.extend(observations)
        return observations
```

### 9.9 V2 Toolset 구성 시스템

각 에이전트는 YAML에서 사용할 도구를 세밀하게 제어한다:

```yaml
# roles/Research.yaml - 도구 세트 예시
toolset:
  include_tool_servers:
    - filesystem     # 파일 읽기/쓰기
    - search         # 웹 검색
    - research       # 학술 검색
    - sandbox        # 명령어 실행
    - tool_agents    # 문서 요약
    - any2markdown   # 파일 변환
  exclude_tool_servers: []
  include_tools: []
  exclude_tools:
    - image_generation  # Research 단계에서는 이미지 생성 불필요

# roles/Design.yaml - 도구 세트 예시
toolset:
  include_tool_servers:
    - filesystem
    - sandbox
    - tool_agents    # 이미지 생성, 캡셔닝
    - reflect        # 슬라이드 검수
  exclude_tool_servers:
    - search         # Design 단계에서는 검색 불필요
    - research
  include_tools: []
  exclude_tools: []
```

### 9.10 Docker 샌드박스 환경

V2는 코드 실행을 Docker 컨테이너로 격리한다:

```python
# deeppresenter/agents/env.py - Docker 관리
async def __aenter__(self):
    """환경 초기화: Docker 컨테이너 준비"""
    try:
        client = docker.from_env()
        # 기존 컨테이너가 있으면 강제 제거
        container = client.containers.get(self.workspace.stem)
        container.remove(force=True)
    except NotFound:
        pass  # 정상: 컨테이너 없음
    except DockerException as e:
        error(f"Docker is not accessible: {e}.")
        sys.exit(1)

    # MCP 서버 병렬 연결
    await asyncio.gather(
        *[self.connect_server(server) for server in self.mcp_configs]
    )
    return self

async def __aexit__(self, exc_type, exc_val, exc_tb):
    """환경 정리: MCP 연결 해제 + 히스토리 저장"""
    for server_name in list(self._server_tools.keys()):
        await self.disconnect_server(server_name)

    # 도구 히스토리 저장
    with open(self.tool_history_file, "a") as f:
        for tool_call, msg in self.tool_history:
            f.write(json.dumps(
                [tool_call.model_dump(), msg.model_dump()]
            ) + "\n")

    # 도구 실행 시간 통계 저장
    with (self.workspace / ".history" / "tools_time_cost.json").open("w") as f:
        json.dump(timing_data, f, indent=2)
```

### 9.11 V2 문서 요약 도구

Research Agent가 긴 문서를 요약할 때 사용하는 도구:

```python
# deeppresenter/tools/tool_agents.py - 문서 요약
_SUMMARY_SYSTEM = """
You are a professional document analyst that generates reports
based on specific tasks

Instructions:
1. Thoroughly analyze the provided document and extract key
   information relevant to the specified task.
2. Create a comprehensive yet concise summary report,
   prioritizing presenting key methodologies, critical findings,
   and relevant data points.
3. Use clear Markdown formatting with logical headers.

Important: Only respond with content directly related to the
task and document analysis. Do not add external information.
"""

@mcp.tool()
async def document_summary(task: str, document_path: str) -> str:
    """장문 문서를 작업 목적에 맞게 요약"""
    with open(document_path) as f:
        document = f.read()
    response = await LLM_CONFIG.long_context_model.run(
        messages=[
            {"role": "system", "content": _SUMMARY_SYSTEM},
            {"role": "user", "content": f"Task: {task}\nDocument: {document}"},
        ],
    )
    return response.choices[0].message.content
```

### 9.12 V1 vs V2 종합 비교

```
┌──────────────────────────────────────────────────────────────┐
│                   V1 vs V2 아키텍처 비교                      │
│                                                              │
│  V1 (PPTAgent)              V2 (DeepPresenter)              │
│  ──────────────             ────────────────                 │
│                                                              │
│  고정 파이프라인             자율 에이전트 루프               │
│  ┌─>Planner                 ┌─>Research Agent                │
│  │  ─>ContentOrg.           │  (자율적 도구 사용)            │
│  │  ─>LayoutSel.            │  ─>Design Agent                │
│  │  ─>Editor                │  (자율적 도구 사용)            │
│  │  ─>Coder                 │  ─>html2pptx                   │
│  └──────────                └──────────                      │
│                                                              │
│  내장 Python API            MCP 프로토콜 (30+ 도구)          │
│  동기적 실행                비동기 + Docker 샌드박스          │
│  텍스트 기반 검증            시각적 리플렉션                  │
│  레퍼런스 PPT 필수           레퍼런스 불필요                  │
│  PPTX 직접 편집             HTML -> PPTX 변환               │
│  빠른 실행 (~분)            느린 실행 (~10-30분)             │
│  예측 가능한 품질           더 높은 품질 상한                │
│  낮은 비용                  높은 비용 (다수 LLM 호출)        │
└──────────────────────────────────────────────────────────────┘
```


---

## 10. 기술 스택

### 10.1 핵심 의존성 전체 목록

PPTAgent의 `pyproject.toml`에서 추출한 전체 의존성 분석이다.

#### 런타임 핵심 의존성

| 패키지 | 버전 요구 | 용도 | 카테고리 |
|--------|----------|------|---------|
| `python` | >=3.11 | 런타임 | 코어 |
| `openai` | >=1.108.2 | LLM API 클라이언트 (OpenAI 호환) | AI/LLM |
| `pydantic` | >=2.11.9 | 데이터 모델, 유효성 검증, JSON 스키마 | 코어 |
| `python-pptx` | >=0.6.21 | PPTX 파일 읽기/쓰기 | 프레젠테이션 |
| `pptagent-pptx` | >=0.0.1 | python-pptx 확장 (커스텀 포크) | 프레젠테이션 |
| `fastapi` | - | 웹 API 서버 | 웹 |
| `uvicorn` | - | ASGI 서버 | 웹 |
| `playwright` | - | 브라우저 자동화 (HTML 렌더링, 스크린샷) | 렌더링 |
| `html2image` | - | HTML -> 이미지 변환 | 렌더링 |
| `pdf2image` | - | PDF -> 이미지 변환 | 렌더링 |
| `pypdf` | - | PDF 파싱 | 문서 |
| `beautifulsoup4` | - | HTML 파싱 | 문서 |
| `Pillow` | - | 이미지 처리 | 이미지 |
| `opencv-python` | - | 이미지 처리 (고급) | 이미지 |
| `numpy` | <2.0.0 | 수치 계산, 배열 처리 | 코어 |
| `httpx` | - | 비동기 HTTP 클라이언트 | 네트워크 |
| `tenacity` | - | 재시도 로직 데코레이터 | 유틸리티 |
| `rich` | - | 터미널 출력 포매팅, 로깅 | 유틸리티 |
| `typer` | - | CLI 프레임워크 | CLI |
| `jinja2` | - | 프롬프트 템플릿 엔진 | 프롬프트 |
| `pyyaml` | - | YAML 파싱 (역할 설정) | 설정 |
| `json_repair` | - | 깨진 JSON 복구 | 유틸리티 |
| `python-Levenshtein` | - | 편집 거리 계산 | 유틸리티 |
| `docker` | - | Docker SDK (샌드박스 관리) | 인프라 |
| `mcp` | - | Model Context Protocol 클라이언트 | 도구 |
| `fastmcp` | - | MCP 서버 프레임워크 | 도구 |
| `langchain_mcp_adapters` | - | LangChain MCP 어댑터 | 도구 |
| `firecrawl` | - | 웹 크롤링 | 검색 |
| `trafilatura` | - | 웹 콘텐츠 추출 | 검색 |
| `jsonlines` | - | JSONL 파일 처리 | 유틸리티 |
| `binaryornot` | - | 바이너리 파일 감지 | 유틸리티 |

#### 선택적 의존성 (full 설치)

| 패키지 | 용도 |
|--------|------|
| `transformers` | Vision Transformer 모델 (이미지 임베딩) |
| `timm` | ViT 모델 라이브러리 |
| `peft` | 모델 파인튜닝 |
| `huggingface_hub` | 모델 다운로드 |
| `torch` | PyTorch (ML 연산) |

### 10.2 LLM 프로바이더 지원

PPTAgent는 **OpenAI 호환 API**를 사용하므로, 다양한 LLM 프로바이더를 지원한다:

```python
# llms.py - AsyncLLM 핵심 구조
class AsyncLLM:
    """OpenAI 호환 비동기 LLM 클라이언트"""

    def __init__(self, model_name: str, api_key: str, base_url: str):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = model_name

    async def chat(self, messages, response_format=None):
        return await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_format=response_format,
        )
```

지원되는 프로바이더:
- **OpenAI**: GPT-4o, GPT-4V, GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet (OpenAI 호환 프록시 통해)
- **Google**: Gemini Pro, Gemini Flash
- **Qwen**: Qwen-VL, Qwen2.5
- **로컬 모델**: vLLM, SGLang, Ollama (OpenAI 호환 API 제공)

V2의 `config.yaml.example`:

```yaml
# deeppresenter/config.yaml.example 구조
language_model:
  model_name: "gpt-4o"
  api_key: "sk-..."
  base_url: "https://api.openai.com/v1"
  context_window: 128000

vision_model:
  model_name: "gpt-4o"
  api_key: "sk-..."
  base_url: "https://api.openai.com/v1"

long_context_model:
  model_name: "gemini-2.0-flash"
  api_key: "..."
  base_url: "https://generativelanguage.googleapis.com/v1beta/openai"

t2i_model:  # Text-to-Image (선택적)
  model_name: "dall-e-3"
  api_key: "sk-..."
```

### 10.3 실행 환경 요구사항

```
┌──────────────────────────────────────────────────┐
│              실행 환경 요구사항                     │
│                                                   │
│  OS: Linux 또는 macOS (Windows 미지원)            │
│  Python: 3.11+                                    │
│  Docker: 필수 (V2 샌드박스용)                     │
│  LibreOffice: 선택적 (WMF 변환, PPT->PDF 변환)   │
│  Playwright: 브라우저 엔진 설치 필요               │
│                                                   │
│  외부 서비스:                                      │
│  - LLM API (OpenAI, Gemini 등): 필수             │
│  - MinerU API: PDF 파싱 (선택적)                  │
│  - Tavily API: 웹 검색 (V2, 선택적)              │
│  - Firecrawl API: 웹 크롤링 (V2, 선택적)         │
│                                                   │
│  하드웨어:                                        │
│  - RAM: 8GB+ (ViT 모델 사용 시 16GB+)            │
│  - GPU: 선택적 (로컬 ViT/LLM 사용 시 필요)       │
│  - 디스크: 2GB+ (모델 캐시, 임시 파일)            │
└──────────────────────────────────────────────────┘
```

### 10.4 빌드 시스템 및 패키지 구조

```toml
# pyproject.toml 핵심 설정
[build-system]
requires = ["setuptools", "wheel"]

[project]
name = "pptagent"
description = "An Agentic Framework for Reflective PowerPoint Generation"
requires-python = ">=3.11"
license = "MIT"

[project.scripts]
pptagent = "deeppresenter.__main__:main"      # CLI 진입점
pptagent-mcp = "pptagent.mcp_server:main"     # MCP 서버

[tool.setuptools.package-data]
pptagent = ["prompts/**/*", "roles/*.yaml"]
deeppresenter = [
    "roles/*.yaml",
    "html2pptx/**/*",
    "config.yaml.example",
    "mcp.json.example",
]
```

---

## 11. 제한사항 & 약점

### 11.1 플랫폼 제한

- **Windows 미지원**: Docker, LibreOffice, Playwright 등의 의존성이 Linux/macOS에 최적화
- **Docker 필수 (V2)**: V2는 코드 실행 샌드박스로 Docker를 요구하며, Docker가 없으면 V2를 사용할 수 없음
- **LibreOffice 의존**: WMF/EMF 이미지 변환과 PPT->PDF 변환에 LibreOffice가 필요

### 11.2 외부 서비스 의존성

```
┌──────────────────────────────────────────────────────────┐
│              외부 서비스 의존성 맵                         │
│                                                          │
│  [필수]                                                   │
│  └─ LLM API (GPT-4o 등)                                 │
│     ├─ 비용: $0.01-0.10/슬라이드 (모델에 따라)            │
│     └─ 가용성: API 장애 시 전체 시스템 중단               │
│                                                          │
│  [V2 선택적이지만 중요]                                   │
│  ├─ Tavily API (웹 검색)                                 │
│  │   └─ 없으면 Research Agent가 제한적                   │
│  ├─ Firecrawl API (웹 크롤링)                            │
│  │   └─ 없으면 URL 내용 가져오기 불가                    │
│  ├─ MinerU API (PDF 파싱)                                │
│  │   └─ 없으면 PDF 문서 입력 불가                        │
│  └─ DALL-E API (이미지 생성)                             │
│     └─ 없으면 이미지 자동 생성 불가                      │
│                                                          │
│  [V1 선택적]                                              │
│  └─ ViT 모델 (HuggingFace)                              │
│     └─ 없으면 기본 규칙 기반 레이아웃 분류               │
└──────────────────────────────────────────────────────────┘
```

### 11.3 LLM 비용 문제

PPTAgent의 가장 큰 실용적 약점은 **높은 LLM API 비용**이다:

| 단계 | V1 LLM 호출 횟수 | V2 LLM 호출 횟수 |
|------|------------------|------------------|
| 분석/리서치 | 5-15회 (스키마 추출, 분류) | 20-50회 (검색, 요약, 분석) |
| 아웃라인 생성 | 1회 | 에이전트 자율 결정 |
| 슬라이드당 | 3-5회 (ContentOrg + LayoutSel + Editor + Coder + 재시도) | 5-15회 (디자인 + 리플렉션 루프) |
| 평가 | 3회/슬라이드 (Content + Design + Coherence) | - |
| **총 (10슬라이드)** | **~40-70회** | **~100-250회** |
| **예상 비용** | **$0.50-2.00** | **$2.00-10.00** |

### 11.4 한국어 지원 한계

PPTAgent의 한국어 관련 제한사항:

1. **언어 감지**: fastText 기반으로 한국어 감지는 가능하지만, 한/영 혼용 문서에서 정확도 저하
2. **길이 조정**: `get_length_factor()`에서 한국어는 CJK로 분류되어 `latin=False`이지만, 한국어는 중국어/일본어와 텍스트 밀도가 다름
3. **폰트**: V2의 Design Agent 시스템 프롬프트에 한국어 안전 폰트가 명시되어 있지 않음 (중국어 폰트만 "Microsoft YaHei", "PingFang SC"로 지정)
4. **프롬프트**: 역할 YAML의 시스템 프롬프트가 영어와 중국어만 지원 (`system.en`, `system.zh`)
5. **평가**: PPTEval 프롬프트가 영어/중국어에 최적화

### 11.5 V2 HTML -> PPTX 변환 품질 문제

V2는 HTML로 슬라이드를 디자인한 후 PPTX로 변환하는데, 이 과정에서 품질 손실이 발생한다:

- HTML의 복잡한 CSS (그라디언트, 그림자, 애니메이션)가 PPTX에서 지원되지 않음
- 폰트 렌더링 차이 (브라우저 vs PowerPoint)
- 이미지 해상도 손실 가능성
- 편집 불가능한 요소 (래스터화된 텍스트 등)

### 11.6 실행 시간 문제

- **V1**: 10슬라이드 기준 5-15분 (LLM 호출 대기 시간 포함)
- **V2**: 10슬라이드 기준 15-30분 (리서치 + 디자인 + 리플렉션 루프)
- 실시간 대화형 생성에는 부적합
- 비동기 병렬 처리로 일부 최적화되어 있으나, LLM API 응답 시간이 병목

### 11.7 레퍼런스 PPT 의존성 (V1)

V1은 반드시 레퍼런스 PPT가 필요하다:

- 레퍼런스 PPT의 품질이 곧 출력 품질의 상한선
- 레퍼런스에 없는 레이아웃은 생성 불가
- 레퍼런스 PPT를 직접 제공해야 하므로 사용자 부담 증가
- 레퍼런스 PPT의 라이선스/저작권 문제 가능성

### 11.8 설치 복잡도

V2의 설치는 상당히 복잡하다:

```bash
# V2 설치 과정 (간략화)
pip install pptagent[full]          # 기본 패키지
playwright install chromium         # 브라우저 엔진
# Docker 설치 및 설정
# config.yaml 설정 (4개 이상의 LLM API 키)
# mcp.json 설정 (7개 MCP 서버)
# Tavily, Firecrawl, MinerU API 키 설정
```

일반 사용자에게는 진입 장벽이 높다.

### 11.9 에러 복구 한계

- 재시도(retry) 메커니즘이 있지만, 기본 3회로 제한
- 특정 레이아웃이 반복적으로 실패하면 해당 슬라이드가 누락됨
- V1에서 `error_exit=False`가 기본이므로 실패한 슬라이드가 조용히 건너뛰어짐
- 사용자에게 품질 문제가 투명하게 전달되지 않을 수 있음

---

## 12. 우리 프로젝트에 적용 가능한 인사이트

### 12.1 프롬프트 전략 차용 포인트

#### 12.1.1 역할 분리 패턴

PPTAgent의 6-역할 에이전트 시스템은 우리 프로젝트에 직접 적용할 수 있다:

```typescript
// 우리 프로젝트 적용 예시: 역할별 프롬프트 분리

// prompts/planner.ts
export const PLANNER_SYSTEM = `
You are a presentation planner. Given a document or topic,
create a structured outline with slide-by-slide plan.
Each slide should have: purpose, section, content references.
`;

// prompts/contentOrganizer.ts
export const CONTENT_ORGANIZER_SYSTEM = `
You are a content specialist. Extract key points from source
material, making them concise and suitable for slide format.
Return JSON array of key points.
`;

// prompts/editor.ts
export const EDITOR_SYSTEM = `
You are a slide content editor. Generate content that precisely
fills the provided layout schema. Follow the schema structure
exactly. Match element counts. Use the specified language.
`;

// prompts/designer.ts (V2 스타일)
export const DESIGNER_SYSTEM = `
You are a professional slide designer using HTML/CSS.
Create visually balanced, overlap-free, high-quality slides.
Fixed canvas: 1280x720px (16:9).
Text in semantic elements only (<p>, <li>, <span>).
Cross-platform safe fonts. No inline margins on text.
`;
```

#### 12.1.2 동적 응답 모델 (Structured Output)

PPTAgent의 가장 강력한 전략은 런타임에 응답 스키마를 동적으로 생성하는 것이다:

```typescript
// 우리 프로젝트 적용: Zod 기반 동적 스키마 생성

import { z } from 'zod';

function createSlideContentSchema(layoutElements: LayoutElement[]) {
  const shape: Record<string, z.ZodType> = {};

  for (const el of layoutElements) {
    if (el.type === 'text') {
      shape[el.name] = z.object({
        content: z.array(z.string()).describe(el.description),
      });
    } else if (el.type === 'image') {
      shape[el.name] = z.object({
        prompt: z.string().describe('Image generation prompt'),
        alt: z.string().describe('Alt text for the image'),
      });
    }
  }

  return z.object(shape);
}

// 사용 예시
const layout = { elements: [
  { name: 'title', type: 'text', description: '슬라이드 제목 (1줄)' },
  { name: 'body', type: 'text', description: '본문 (3-5 포인트)' },
  { name: 'image', type: 'image', description: '관련 이미지' },
]};

const schema = createSlideContentSchema(layout.elements);
// -> LLM에 structured output으로 전달
```

#### 12.1.3 에러 피드백 재시도 전략

PPTAgent의 구조화된 에러 피드백 재시도는 LLM 출력 안정성을 크게 높인다:

```typescript
// 우리 프로젝트 적용: 구조화된 재시도

async function generateWithRetry<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const messages = [
        { role: 'system', content: EDITOR_SYSTEM },
        { role: 'user', content: prompt },
      ];

      // 이전 에러가 있으면 피드백으로 추가
      if (lastError) {
        messages.push({
          role: 'user',
          content: `Your previous response caused an error:\n${lastError}\n\nThis is retry attempt ${attempt + 1}. Please fix the issue.`
        });
      }

      const result = await llm.generate(messages, { schema });
      return schema.parse(result);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`Attempt ${attempt + 1} failed: ${lastError}`);
    }
  }
  throw new Error(`Failed after ${maxRetries} retries: ${lastError}`);
}
```

#### 12.1.4 레이아웃 목록 셔플링

위치 편향 방지를 위한 간단하지만 효과적인 전략:

```typescript
// 우리 프로젝트 적용: 레이아웃 선택 시 셔플링
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const availableLayouts = shuffleArray(getLayoutsForContent(slideContent));
// LLM에게 셔플된 순서로 제공하여 위치 편향 방지
```

### 12.2 파이프라인 설계 참고 사항

#### 12.2.1 비동기 병렬 슬라이드 생성

PPTAgent의 `asyncio.gather` + `Semaphore` 패턴을 우리 프로젝트에 적용:

```typescript
// 우리 프로젝트 적용: 병렬 슬라이드 생성

async function generateAllSlides(
  outline: OutlineItem[],
  maxConcurrent: number = 5
): Promise<SlideResult[]> {
  const semaphore = new Semaphore(maxConcurrent);

  const tasks = outline.map((item, idx) =>
    semaphore.acquire().then(async (release) => {
      try {
        return await generateSlide(idx, item);
      } finally {
        release();
      }
    })
  );

  const results = await Promise.allSettled(tasks);

  return results
    .filter((r): r is PromiseFulfilledResult<SlideResult> =>
      r.status === 'fulfilled'
    )
    .map(r => r.value);
}

class Semaphore {
  private queue: (() => void)[] = [];
  private running = 0;

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<() => void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return () => { this.running--; this.dequeue(); };
    }
    return new Promise(resolve => {
      this.queue.push(() => {
        this.running++;
        resolve(() => { this.running--; this.dequeue(); });
      });
    });
  }

  private dequeue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      this.queue.shift()!();
    }
  }
}
```

#### 12.2.2 Functional Layout 자동 삽입

표지, 목차, 섹션 시작, 엔딩 슬라이드를 자동으로 삽입하는 패턴:

```typescript
// 우리 프로젝트 적용: 기능 슬라이드 자동 삽입

interface OutlineItem {
  purpose: string;
  topic: string;
  indexes: number[];
  isFunctional: boolean;
}

function addFunctionalSlides(outline: OutlineItem[]): OutlineItem[] {
  const result: OutlineItem[] = [];

  // 1. Opening 슬라이드 삽입
  result.push({
    purpose: 'opening',
    topic: 'Functional',
    indexes: [],
    isFunctional: true,
  });

  // 2. TOC 슬라이드 삽입
  const sections = [...new Set(outline.map(i => i.topic))];
  result.push({
    purpose: 'table_of_contents',
    topic: 'Functional',
    indexes: [],
    isFunctional: true,
  });

  // 3. 각 섹션 시작 전에 Section Outline 삽입
  let prevTopic: string | null = null;
  for (const item of outline) {
    if (item.topic !== prevTopic) {
      result.push({
        purpose: `section_outline: ${item.topic}`,
        topic: 'Functional',
        indexes: [],
        isFunctional: true,
      });
      prevTopic = item.topic;
    }
    result.push(item);
  }

  // 4. Ending 슬라이드 삽입
  result.push({
    purpose: 'ending',
    topic: 'Functional',
    indexes: [],
    isFunctional: true,
  });

  return result;
}
```

#### 12.2.3 단계별 검증 게이트

PPTAgent의 `_validate_content()` 패턴을 우리 프로젝트에 적용:

```typescript
// 우리 프로젝트 적용: 생성 후 검증 게이트

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateSlideContent(
  content: SlideContent,
  layout: LayoutSchema
): ValidationResult {
  const errors: string[] = [];

  // 1. 필수 요소 존재 확인
  for (const el of layout.elements) {
    if (!(el.name in content)) {
      errors.push(`Missing required element: ${el.name}`);
    }
  }

  // 2. 텍스트 길이 검증
  for (const el of layout.elements) {
    if (el.type === 'text' && el.name in content) {
      const text = content[el.name];
      if (el.maxLength && text.length > el.maxLength) {
        errors.push(`${el.name} exceeds max length: ${text.length}/${el.maxLength}`);
      }
    }
  }

  // 3. 이미지 경로 검증
  for (const el of layout.elements) {
    if (el.type === 'image' && el.name in content) {
      const imgPath = content[el.name].path;
      if (imgPath && !isValidImagePath(imgPath)) {
        errors.push(`Invalid image path for ${el.name}: ${imgPath}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 12.3 레퍼런스 분석 방법론 차용

#### 12.3.1 업로드된 PPT에서 디자인 패턴 추출

PPTAgent의 SlideInducter를 TypeScript로 구현하는 방안:

```typescript
// 우리 프로젝트 적용: 레퍼런스 PPT 분석 (개념적)

interface ExtractedLayout {
  name: string;
  templateSlideIndex: number;
  elements: {
    name: string;
    type: 'text' | 'image' | 'shape';
    bounds: { x: number; y: number; width: number; height: number };
    style: Record<string, string>;
    role: string;  // 'title' | 'body' | 'image' | 'caption' 등
  }[];
  contentSchema: string;
}

async function analyzeReferencePPT(
  pptxBuffer: Buffer
): Promise<{
  layouts: ExtractedLayout[];
  functionalSlides: string[];
  language: string;
}> {
  // 1. PPTX 파싱 (PptxGenJS 또는 서버사이드 python-pptx)
  const slides = await parsePPTX(pptxBuffer);

  // 2. 기능 슬라이드 분류 (Vision Model)
  const functional = await classifyFunctionalSlides(slides);

  // 3. 콘텐츠 슬라이드 레이아웃 분류
  // PPTAgent처럼 이미지 임베딩 대신, 요소 구조 기반 분류 가능:
  const contentSlides = slides.filter(s => !functional.includes(s.index));
  const layouts = groupByStructure(contentSlides);

  // 4. 각 레이아웃의 콘텐츠 스키마 추출 (Vision Model)
  for (const layout of layouts) {
    layout.contentSchema = await extractSchema(layout);
  }

  return { layouts, functionalSlides: functional, language: detectLanguage(slides) };
}
```

#### 12.3.2 구조 기반 레이아웃 분류 (ViT 대안)

PPTAgent는 ViT 임베딩 + 코사인 유사도를 사용하지만,
우리 TypeScript 프로젝트에서는 **요소 구조 기반 분류**가 더 실용적이다:

```typescript
// 구조 기반 레이아웃 유사도 계산

interface SlideStructure {
  textBoxCount: number;
  imageCount: number;
  shapeCount: number;
  hasTitle: boolean;
  hasSubtitle: boolean;
  textAreaRatio: number;   // 텍스트 영역 / 전체 면적
  imageAreaRatio: number;  // 이미지 영역 / 전체 면적
  layout: 'single_column' | 'two_column' | 'title_only' | 'mixed';
}

function structuralSimilarity(a: SlideStructure, b: SlideStructure): number {
  let score = 0;
  const totalWeight = 7;

  if (a.textBoxCount === b.textBoxCount) score += 1;
  if (a.imageCount === b.imageCount) score += 1;
  if (a.hasTitle === b.hasTitle) score += 1;
  if (a.layout === b.layout) score += 2;
  if (Math.abs(a.textAreaRatio - b.textAreaRatio) < 0.15) score += 1;
  if (Math.abs(a.imageAreaRatio - b.imageAreaRatio) < 0.15) score += 1;

  return score / totalWeight;
}
```

### 12.4 PPTEval 기반 품질 평가 도입

PPTEval의 3차원 평가를 우리 시스템의 자동 품질 체크에 적용:

```typescript
// 우리 프로젝트 적용: 3차원 품질 평가

interface SlideEvaluation {
  content: { score: number; reasoning: string };
  design: { score: number; reasoning: string };
  coherence: { score: number; reasoning: string };
  overall: number;
}

async function evaluatePresentation(
  slides: GeneratedSlide[],
  sourceDocument: string,
  outline: OutlineItem[]
): Promise<SlideEvaluation> {

  // 1. Content 평가 (Language Model)
  const contentScore = await evaluateContent(slides, sourceDocument);

  // 2. Design 평가 (슬라이드 HTML 스크린샷 -> Vision Model)
  const screenshots = await captureSlideScreenshots(slides);
  const designScore = await evaluateDesign(screenshots);

  // 3. Coherence 평가 (전체 구조 분석)
  const coherenceScore = await evaluateCoherence(outline, slides);

  return {
    content: contentScore,
    design: designScore,
    coherence: coherenceScore,
    overall: (contentScore.score + designScore.score + coherenceScore.score) / 3,
  };
}

// 이 평가 결과를 사용자에게 표시하거나,
// 점수가 낮은 슬라이드를 자동으로 재생성하는 데 활용할 수 있다.
```

### 12.5 V2 리플렉션 패턴 적용

PPTAgent V2의 "렌더링 -> 스크린샷 -> Vision Model 검수" 루프:

```typescript
// 우리 프로젝트 적용: 시각적 리플렉션 루프

async function generateSlideWithReflection(
  content: SlideContent,
  layout: LayoutSchema,
  maxReflections: number = 2
): Promise<{ html: string; score: number }> {

  let html = await generateSlideHTML(content, layout);

  for (let i = 0; i < maxReflections; i++) {
    // 1. HTML을 Puppeteer/Playwright로 렌더링
    const screenshot = await renderAndCapture(html);

    // 2. Vision Model로 품질 검수
    const feedback = await inspectSlideQuality(screenshot);

    if (feedback.score >= 4) {
      return { html, score: feedback.score };
    }

    // 3. 피드백 기반 수정
    html = await fixSlideHTML(html, feedback.issues);
  }

  return { html, score: 0 };
}

async function inspectSlideQuality(
  screenshotBase64: string
): Promise<{ score: number; issues: string[] }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Rate this slide design 1-5. List issues like text overlap, poor contrast, misalignment. Return JSON: {"score": N, "issues": [...]}' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
      ],
    }],
  });
  return JSON.parse(response.choices[0].message.content!);
}
```

### 12.6 TypeScript/Next.js 환경 기술 매핑

PPTAgent의 Python 기술 스택을 우리 TypeScript 환경으로 매핑:

| PPTAgent (Python) | 우리 프로젝트 (TypeScript) | 비고 |
|-------------------|--------------------------|------|
| `python-pptx` | `pptxgenjs` / `@anthropic/pptx` | PPTX 생성 |
| `openai` (Python) | `openai` (npm) / Vercel AI SDK | LLM 호출 |
| `pydantic` | `zod` | 스키마 검증, structured output |
| `jinja2` | Template literals / Handlebars | 프롬프트 템플릿 |
| `asyncio.gather` | `Promise.allSettled` | 병렬 처리 |
| `Pillow` / `opencv` | `sharp` / `canvas` | 이미지 처리 |
| `playwright` (Python) | `playwright` (npm) / `puppeteer` | 브라우저 자동화 |
| `fastapi` | Next.js API Routes | 웹 API |
| `beautifulsoup4` | `cheerio` | HTML 파싱 |
| `PyYAML` | 직접 JSON/TS 설정 | 설정 파일 |
| `tenacity` | 커스텀 retry 유틸리티 | 재시도 |
| `MCP Protocol` | 직접 API 통합 | 도구 시스템 |
| `Docker` (sandbox) | Vercel Edge / 서버리스 | 실행 격리 |
| `html2image` | Playwright screenshot | HTML -> 이미지 |

### 12.7 구체적 구현 우선순위 제안

PPTAgent 분석에서 도출한 우리 프로젝트의 구현 우선순위:

```
┌─────────────────────────────────────────────────────────┐
│          구현 우선순위 (영향도 x 구현 난이도)              │
│                                                          │
│  [P0 - 즉시 적용]                                        │
│  ├─ 역할 분리 프롬프트 시스템                             │
│  │   (planner/editor/designer 분리)                      │
│  ├─ Zod 기반 동적 응답 스키마 생성                        │
│  ├─ 구조화된 에러 피드백 재시도                            │
│  └─ 레이아웃 옵션 셔플링                                  │
│                                                          │
│  [P1 - 단기 적용 (1-2주)]                                │
│  ├─ Functional Layout 자동 삽입                           │
│  │   (표지/목차/섹션/엔딩)                                │
│  ├─ Promise.allSettled 기반 병렬 슬라이드 생성             │
│  ├─ 단계별 검증 게이트                                    │
│  └─ 3차원 품질 평가 (Content/Design/Coherence)            │
│                                                          │
│  [P2 - 중기 적용 (3-4주)]                                │
│  ├─ 레퍼런스 PPT 분석 (업로드 -> 패턴 추출)               │
│  ├─ 시각적 리플렉션 루프                                  │
│  │   (Playwright 렌더링 -> Vision Model 검수)             │
│  └─ 언어별 텍스트 길이 자동 조정                           │
│                                                          │
│  [P3 - 장기 적용 (1-2개월)]                               │
│  ├─ 딥리서치 파이프라인 (V2 스타일)                        │
│  ├─ AI 이미지 생성 통합                                   │
│  └─ 컨텍스트 폴딩 (장문 대화 압축)                        │
└─────────────────────────────────────────────────────────┘
```

### 12.8 PPTAgent 대비 우리 프로젝트의 차별화 기회

PPTAgent의 약점을 우리 프로젝트의 강점으로 전환할 수 있는 영역:

| PPTAgent 약점 | 우리의 차별화 기회 |
|--------------|------------------|
| 설치 복잡도 높음 | **웹 기반 SaaS** - 설치 불필요 |
| 실시간 생성 불가 | **스트리밍 생성** - 슬라이드별 점진적 표시 |
| 한국어 지원 미흡 | **한국어 우선 지원** - 프롬프트/폰트/길이 최적화 |
| 레퍼런스 PPT 필수 (V1) | **내장 템플릿 라이브러리** + 선택적 업로드 |
| 높은 LLM 비용 | **경량 모델 최적화** + 캐싱 전략 |
| CLI 중심 | **직관적 웹 UI** + 실시간 프리뷰 |
| 편집 불가능한 출력 (V2) | **편집 가능한 슬라이드** - 인라인 편집 지원 |
| Windows 미지원 | **브라우저 기반** - 크로스 플랫폼 |

### 12.9 최종 요약: PPTAgent에서 배워야 할 핵심 5가지

1. **스키마 기반 제약은 할루시네이션의 최고의 적이다**
   - 동적 Pydantic/Zod 모델로 LLM 출력을 구조적으로 제약하라
   - "자유 형식 텍스트 생성" 대신 "스키마 채우기"로 접근하라

2. **편집 > 생성**
   - 빈 캔버스에서 시작하지 말고, 기존 템플릿을 편집하는 방식이 안정적이다
   - 레퍼런스 분석 -> 패턴 추출 -> 패턴 적용 파이프라인

3. **시각적 검증은 필수다**
   - 텍스트 기반 검증만으로는 디자인 품질을 보장할 수 없다
   - 렌더링 -> 스크린샷 -> Vision Model 검수 루프를 도입하라

4. **병렬화가 속도의 핵심이다**
   - 슬라이드는 독립적이므로 병렬 생성이 가능하다
   - Semaphore로 API rate limit을 관리하며 최대 병렬도를 활용하라

5. **평가 시스템이 개선의 기반이다**
   - PPTEval의 3차원 평가를 도입하여 품질을 정량화하라
   - 평가 점수가 낮은 슬라이드를 자동 재생성하는 피드백 루프를 구축하라

---

## 부록 A: PPTAgent 소스코드 참조 경로

| 파일 | 설명 |
|------|------|
| `pptagent/pptgen.py` | V1 생성 파이프라인 핵심 (PPTGen, PPTAgent 클래스) |
| `pptagent/agent.py` | V1 Agent 기반 클래스 (Jinja2 + LLM 호출) |
| `pptagent/induct.py` | 레퍼런스 PPT 분석 (SlideInducter) |
| `pptagent/ppteval.py` | 3차원 자동 평가 (PPTEval) |
| `pptagent/apis.py` | 슬라이드 편집 API + CodeExecutor |
| `pptagent/llms.py` | LLM 클라이언트 (OpenAI 호환) |
| `pptagent/multimodal.py` | 이미지 캡셔닝 (ImageLabler) |
| `pptagent/model_utils.py` | ViT 임베딩, 클러스터링 |
| `pptagent/utils.py` | 유틸리티 (언어감지, 이미지변환, JSON추출) |
| `pptagent/roles/*.yaml` | 6개 에이전트 역할 정의 |
| `pptagent/presentation/layout.py` | Layout/Element 데이터 모델 |
| `pptagent/response/` | LLM 응답 파싱 모델 (Outline, EditorOutput 등) |
| `deeppresenter/main.py` | V2 AgentLoop 오케스트레이터 |
| `deeppresenter/agents/agent.py` | V2 Agent 기반 클래스 (MCP 도구 호출) |
| `deeppresenter/agents/env.py` | V2 AgentEnv (MCP + Docker 환경) |
| `deeppresenter/tools/tool_agents.py` | 이미지생성, 캡셔닝, 문서요약 도구 |
| `deeppresenter/tools/research.py` | 학술 검색 도구 (arXiv, Semantic Scholar) |
| `deeppresenter/tools/search.py` | 웹 검색/크롤링 도구 |
| `deeppresenter/tools/reflect.py` | 슬라이드 렌더링/검수 도구 |
| `deeppresenter/roles/*.yaml` | V2 3개 에이전트 역할 정의 |
| `deeppresenter/utils/constants.py` | 상수, 프롬프트 템플릿, 설정 |
| `deeppresenter/utils/config.py` | 설정 관리 (LLM 모델 설정) |

---

## 부록 B: 용어 사전

| 용어 | 설명 |
|------|------|
| **SlideInducter** | V1의 레퍼런스 PPT 분석 모듈 |
| **PPTEval** | 3차원 자동 평가 프레임워크 (Content/Design/Coherence) |
| **FunctionalLayout** | 기능 슬라이드 유형 (Opening, TOC, Section Outline, Ending) |
| **EditorOutput** | Editor Agent의 구조화된 출력 (레이아웃 스키마에 맞는 콘텐츠) |
| **CodeExecutor** | Coder Agent가 생성한 Python 코드를 안전하게 실행하는 모듈 |
| **AgentEnv** | V2의 에이전트 실행 환경 (MCP 서버 + Docker 컨테이너) |
| **MCP** | Model Context Protocol - 도구 통합 프로토콜 |
| **Context Folding** | V2의 대화 히스토리 압축 메커니즘 |
| **Environment-Grounded Reflection** | 렌더링 결과를 관찰하여 피드백하는 V2 핵심 메커니즘 |
| **length_factor** | 언어 간 텍스트 길이 변환 비율 (영어->CJK: 0.7, CJK->영어: 2.0) |
| **StyleArg** | V1에서 원본 스타일 복사 범위를 제어하는 설정 객체 |

---

> **문서 끝**
>
> 이 분석 보고서는 PPTAgent GitHub 리포지토리의 실제 소스코드를 직접 분석하여 작성되었습니다.
> 모든 코드 예시는 실제 소스코드에서 발췌하거나, 그에 기반한 우리 프로젝트용 TypeScript 적용 예시입니다.
>
> 분석 대상 커밋: main 브랜치 (2026년 3월 기준)
> 분석 도구: GitHub Raw 파일 직접 접근 + gh API

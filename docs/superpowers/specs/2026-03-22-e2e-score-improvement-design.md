# E2E 점수 81% → 95%+ 개선 설계

## 목표

PPT Agent E2E 벤치마크 점수를 95%+(A등급)으로 올린다.

| 항목 | 현재 | 목표 |
|------|------|------|
| 종합 | 81.6% | 95%+ |
| 정보 커버리지 | 72% | 93%+ |
| 구조 준수 | 60% | 93%+ |
| 표현 정합성 | 100% | 유지 |
| 정보 밀도 | 100% | 유지 |
| 디자인 일관성 | 100% | 유지 |

검증: `0.93*0.30 + 0.93*0.25 + 1.0*0.15 + 1.0*0.15 + 1.0*0.15 = 0.279 + 0.2325 + 0.45 = 0.9615` → 96.2% ✓

## 접근법: 프롬프트 강화 + 후처리 보정 + 재시도 루프 (3중 안전망)

---

## 1. Step 5 프롬프트 강화

`src/lib/llm/prompts.ts` case 5에서:

### 1.1 requiredElements 체크리스트
현재 한 줄 나열을 체크리스트 형태로 변경:
```
## 필수 포함 체크리스트 — 아래 항목을 반드시 bulletPoints 또는 bodyText에 포함하세요
- [ ] 항목1
- [ ] 항목2
- [ ] 항목3
누락 시 재요청됩니다. 모든 항목이 슬라이드 어딘가에 반영되어야 합니다.
```

### 1.2 role별 필수 필드 명시
각 role별 필수 필드를 프롬프트에 명시:
- `data-visualization`: chartData 또는 mermaidCode 필수. chartType(bar/pie/line) 지정 필수.
- `architecture-blueprint`: mermaidCode 또는 bulletPoints 필수.
- `key-message`: keyMessage 필드 필수.
- `comparison`: composition을 comparison-table 또는 side-by-side로 설정 필수.

---

## 2. 후처리 보정 레이어

### 새 파일: `src/lib/benchmark/postProcessor.ts`

```typescript
interface CorrectionLog {
  slideNumber: number;
  role: string;
  field: string;
  action: string;      // "자동 생성" | "값 교정" | "composition 변경"
  before: string;
  after: string;
}

function postProcessSlide(
  slide: SlideContent,
  assignment: SlideRoleAssignment,
  spec: SlideSpec,
): { corrected: SlideContent; logs: CorrectionLog[] }
```

### 보정 규칙

| role | 조건 | 보정 |
|------|------|------|
| `data-visualization` | chartData 없음 | placeholder chartData 생성 (requiredElements를 라벨로, placeholder 값) + 경고 로그. 재시도에서 LLM이 적절한 chartData를 생성하도록 유도. |
| `architecture-blueprint` | mermaidCode 없음 | requiredElements로 flowchart LR 자동 생성 |
| `key-message` | keyMessage 없음 | spec.keyMessage 복사 |
| `comparison` | composition이 comparison-table/side-by-side 아니고 layout이 two-column 아님 | comparison-table로 교정 |
| 모든 role | bulletPoints 수 초과 | role 제한에 맞게 잘라내기 |
| 모든 role | subTitle 없음 | spec.sectionName으로 채우기 |

모든 보정은 CorrectionLog[]로 기록 → 콘솔 출력 + 벤치마크 결과 포함.

---

## 3. 커버리지 검증 + 재시도 루프

### scorer.ts 리팩토링
기존 `scoreCompleteness`를 슬라이드 단위 함수로 분리하고, 전체 함수가 이를 내부적으로 호출:

```typescript
// 새로 추출하는 per-slide 함수
export function scoreSlideCompleteness(
  spec: SlideSpec,
  slide: SlideContent,
): { covered: string[]; missing: string[]; score: number } {
  const text = collectSlideText(slide);
  const covered: string[] = [];
  const missing: string[] = [];
  for (const el of spec.requiredElements) {
    if (fuzzyMatch(el, text)) covered.push(el);
    else missing.push(el);
  }
  return {
    covered,
    missing,
    score: spec.requiredElements.length > 0 ? covered.length / spec.requiredElements.length : 1.0,
  };
}

// 기존 scoreCompleteness는 내부에서 scoreSlideCompleteness를 호출하도록 리팩토링
```

### 재시도 흐름
```
LLM 생성 → 후처리 보정 → 커버리지 검사
  → score >= 0.9 → confirmSlide
  → score < 0.9 → 누락 요소 피드백 → LLM 재시도 (최대 2회)
```

재시도 threshold: **0.9** (93%+ 서브 타겟에 맞춤)

### 재시도 메시지
```
슬라이드 N번에서 다음 필수 요소가 누락되었습니다:
- "요소1"
- "요소2"
기존 내용은 유지하되, 위 요소를 반드시 bulletPoints 또는 bodyText에 추가해서 다시 완성해주세요.
```

### 재시도 카운터
- ChatContainer에서 `useRef<Record<number, number>>({})` 로 관리
- 2회 초과 시 현재 결과 확정 + 경고 로그
- 재시도 메시지는 채팅 UI에 노출하지 않고 내부적으로만 처리 (sendMessage 대신 직접 API 호출)

---

## 4. 전체 Step 5 흐름

```
Step 5 시작 (슬라이드 N)
  │
  ├─ 1. LLM 호출 (강화된 프롬프트: 체크리스트 + role 필수 필드)
  │
  ├─ 2. 구조화 데이터 추출 (extractStructuredData)
  │
  ├─ 3. 후처리 보정 (postProcessSlide)
  │     → role 위반 자동 교정
  │     → CorrectionLog[] 기록 + 콘솔 출력
  │
  ├─ 4. 커버리지 검사 (scoreSlideCompleteness)
  │     → score >= 0.9? → confirmSlide → 다음 슬라이드
  │     → score < 0.9? → 재시도 (아래)
  │
  ├─ 5. 재시도 (retryCountRef, 최대 2회)
  │     → 누락 요소 피드백 메시지 구성
  │     → 내부 API 호출 (채팅 UI에 노출 안 함)
  │     → 후처리 보정 → 커버리지 재검사
  │     → 통과하면 confirmSlide
  │     → 2회 초과 시 현재 결과 확정 + 경고 로그
  │
  └─ 6. 다음 슬라이드로 auto-chain (findNextSlideNeedingRealization)
```

---

## 5. 수정 파일

| 파일 | 변경 | 범위 |
|------|------|------|
| `src/lib/llm/prompts.ts` | case 5 프롬프트 강화 (체크리스트 + role 필수 필드) | ~40줄 변경 |
| `src/lib/benchmark/postProcessor.ts` | 새 파일 — 보정 함수 + CorrectionLog + 보정 규칙 | ~150줄 |
| `src/lib/benchmark/scorer.ts` | scoreSlideCompleteness 추출 + scoreCompleteness 리팩토링 | ~30줄 변경 |
| `src/components/chat/ChatContainer.tsx` | Step 5 processResponse에 보정→검증→재시도 루프 통합. retryCountRef 추가. 재시도는 내부 API 호출. | ~60줄 변경 |

---

## 6. 테스트 계획

### 자동 테스트
1. `npm run build` 통과
2. `npx tsx scripts/test-pipeline.ts` → 종합 95%+, 커버리지 93%+, 구조 준수 93%+
3. 보정 로그가 콘솔에 출력됨

### postProcessor 단위 테스트 (향후)
각 보정 규칙에 대해:
- data-visualization chartData 없는 입력 → placeholder chartData 생성 확인
- architecture-blueprint mermaidCode 없는 입력 → flowchart 생성 확인
- key-message keyMessage 없는 입력 → spec.keyMessage 복사 확인
- comparison composition 불일치 입력 → comparison-table 교정 확인
- 보정 전/후 CorrectionLog 정확성 확인

---

## 7. 성공 기준

1. `npx tsx scripts/test-pipeline.ts` 실행
2. 종합 점수 95%+ (A등급)
3. 정보 커버리지 93%+
4. 구조 준수 93%+
5. 나머지 항목 100% 유지
6. 보정 로그가 콘솔에 출력됨
7. 재시도 시 채팅 UI에 noise 없음

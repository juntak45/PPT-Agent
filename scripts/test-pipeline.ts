/**
 * PPT Agent E2E Pipeline Test
 *
 * 서버가 돌고 있는 상태에서 전체 파이프라인을 자동으로 검증합니다.
 *
 * Usage:
 *   1. npm run dev (다른 터미널에서)
 *   2. npx tsx scripts/test-pipeline.ts
 *
 * 옵션:
 *   --provider openai|claude   (기본: openai)
 *   --base-url http://...      (기본: http://localhost:3000)
 *   --skip-ppt                 PPT 생성 단계 스킵
 *   --save                     결과를 benchmark-results/에 저장
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractStructuredData } from '../src/lib/pipeline/parser';
import { validateStructuredData } from '../src/lib/pipeline/validator';
import { runStructuralBenchmark, scoreSlideCompleteness } from '../src/lib/benchmark/scorer';
import { generateStructuralReport } from '../src/lib/benchmark/report';
import { postProcessSlide, printCorrectionLogs } from '../src/lib/benchmark/postProcessor';
import type {
  PipelineState,
  StepId,
  LlmMessage,
  AutoPlanningResult,
  ContentSpecification,
  DeckDesignPlan,
  ExpressionCandidatesPayload,
  SlideCandidate,
  FinalDeckPlan,
  SlideContent,
  SlideRoleAssignment,
  SlideSpec,
  SlideGenerationStrategy,
  ExpressionCandidate,
} from '../src/lib/types';

// ─── Config ───

const args = process.argv.slice(2);
const PROVIDER = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : 'openai';
const BASE_URL = args.includes('--base-url') ? args[args.indexOf('--base-url') + 1] : 'http://localhost:3000';
const SKIP_PPT = args.includes('--skip-ppt');
const SAVE = args.includes('--save');

// ─── Helpers ───

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function log(step: string, msg: string) {
  console.log(`${colors.cyan(`[${step}]`)} ${msg}`);
}
function pass(step: string, msg: string) {
  console.log(`${colors.green(`  ✓ ${step}`)} ${msg}`);
}
function fail(step: string, msg: string) {
  console.error(`${colors.red(`  ✗ ${step}`)} ${msg}`);
}
function warn(step: string, msg: string) {
  console.log(`${colors.yellow(`  ⚠ ${step}`)} ${msg}`);
}

async function callChat(
  messages: LlmMessage[],
  stepId: StepId,
  pipelineState: PipelineState,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: PROVIDER,
      messages,
      stepId,
      pipelineState,
    }),
  });

  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status} ${await res.text()}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }
  return fullText;
}

function createBaselineSlide(spec: SlideSpec, assignment: SlideRoleAssignment): SlideContent {
  return {
    slideNumber: spec.slideNumber,
    title: spec.keyMessage,
    subTitle: `${spec.sectionName} · ${assignment.role}`,
    layout: assignment.preferredLayout,
    contentType: 'bullets',
    bulletPoints: spec.requiredElements.slice(0, 4).map((el) => el.includes(':') ? el : `${el}: ${spec.purpose}`),
    bodyText: spec.purpose,
    speakerNotes: spec.purpose,
    composition: assignment.preferredComposition,
    keyMessage: spec.keyMessage,
    iconHints: spec.requiredElements.slice(0, 4).map((_, i) => ['🎯', '📊', '🧩', '⚙️'][i % 4]),
  };
}

// ─── Main Test Flow ───

async function main() {
  console.log('');
  console.log(colors.cyan('═══════════════════════════════════════════'));
  console.log(colors.cyan('  PPT Agent E2E Pipeline Test'));
  console.log(colors.cyan(`  Provider: ${PROVIDER} | Server: ${BASE_URL}`));
  console.log(colors.cyan('═══════════════════════════════════════════'));
  console.log('');

  let errors = 0;
  let warnings = 0;

  // Check server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}`);
    if (!healthCheck.ok) throw new Error();
    pass('Server', '서버 접속 확인');
  } catch {
    fail('Server', `서버에 접속할 수 없습니다 (${BASE_URL}). npm run dev를 먼저 실행하세요.`);
    process.exit(1);
  }

  const state: PipelineState = {
    currentStep: 1,
    currentSlideIndex: 0,
    completedSlides: [],
    selectedExpressions: {},
  };

  // ─── Step 1: Auto Planning ───
  log('Step 1', '자동 기획 요청...');
  const step1Messages: LlmMessage[] = [
    { role: 'user', content: 'AI 기반 고객 서비스 센터(AICC) 도입 제안서를 만들어주세요. 대상은 경영진이고, 슬라이드는 5장으로 해주세요. 현재 콜센터 비용이 연 12억이고 불만이 35% 증가했습니다.' },
  ];

  const step1Text = await callChat(step1Messages, 1, state);
  const step1Data = extractStructuredData(step1Text);

  if (!step1Data) { fail('Step 1', '구조화 데이터 추출 실패'); errors++; }
  else if (step1Data.type !== 'auto_planning') { fail('Step 1', `잘못된 타입: ${step1Data.type}`); errors++; }
  else if (!validateStructuredData(step1Data)) { fail('Step 1', '유효성 검증 실패'); errors++; }
  else {
    const ap = step1Data.data as AutoPlanningResult;
    pass('Step 1', `자동 기획 완료 — ${ap.confirmedSlideCount}장, ${ap.structure.sections.length}섹션`);
    state.autoPlanning = ap;
    state.context = ap.context;
    state.selectedDirection = ap.direction;
    state.architectureBlueprintDecision = ap.blueprintDecision;
    state.confirmedSlideCount = ap.confirmedSlideCount;
    state.selectedStructure = ap.structure;
    state.currentStep = 2;
  }

  if (errors > 0) { console.log(colors.red(`\nStep 1에서 실패. 중단합니다.`)); process.exit(1); }

  // ─── Step 2: Content Specification ───
  log('Step 2', '콘텐츠 명세 요청...');
  step1Messages.push({ role: 'assistant', content: step1Text });
  const step2Messages: LlmMessage[] = [
    ...step1Messages,
    { role: 'user', content: '확정된 슬라이드 구조를 기반으로 콘텐츠 명세서를 작성해주세요.' },
  ];

  const step2Text = await callChat(step2Messages, 2, state);
  const step2Data = extractStructuredData(step2Text);

  if (!step2Data) { fail('Step 2', '구조화 데이터 추출 실패'); errors++; }
  else if (step2Data.type !== 'content_spec') { fail('Step 2', `잘못된 타입: ${step2Data.type}`); errors++; }
  else if (!validateStructuredData(step2Data)) { fail('Step 2', '유효성 검증 실패'); errors++; }
  else {
    const cs = step2Data.data as ContentSpecification;
    pass('Step 2', `콘텐츠 명세 완료 — ${cs.slideSpecs.length}개 슬라이드 명세`);
    state.contentSpec = cs;
    state.currentStep = 3;
  }

  if (errors > 0) { console.log(colors.red(`\nStep 2에서 실패. 중단합니다.`)); process.exit(1); }

  // ─── Step 3: Design Plan ───
  log('Step 3', '디자인 플랜 요청...');
  step2Messages.push({ role: 'assistant', content: step2Text });
  const step3Messages: LlmMessage[] = [
    ...step2Messages,
    { role: 'user', content: '콘텐츠 명세서를 바탕으로 Deck Design Plan을 생성해주세요.' },
  ];

  const step3Text = await callChat(step3Messages, 3, state);
  const step3Data = extractStructuredData(step3Text);

  if (!step3Data) { fail('Step 3', '구조화 데이터 추출 실패'); errors++; }
  else if (step3Data.type !== 'deck_design_plan') { fail('Step 3', `잘못된 타입: ${step3Data.type}`); errors++; }
  else if (!validateStructuredData(step3Data)) { fail('Step 3', '유효성 검증 실패'); errors++; }
  else {
    const dp = step3Data.data as DeckDesignPlan;
    pass('Step 3', `디자인 플랜 완료 — tone:${dp.tone}, motif:${dp.visualMotif}, ${dp.roleAssignments.length}개 역할 배정`);
    state.deckDesignPlan = dp;
    state.currentStep = 4;

    // Build baseline finalPlan
    if (state.contentSpec && state.autoPlanning) {
      const slides = state.contentSpec.slideSpecs.map((spec) => {
        const assignment = dp.roleAssignments.find((ra) => ra.slideNumber === spec.slideNumber);
        const plan = state.autoPlanning!.slidePlans.find((p) => p.slideNumber === spec.slideNumber);
        if (!assignment) return null;
        return {
          slideNumber: spec.slideNumber,
          sectionName: spec.sectionName,
          strategy: (plan?.strategy || 'generate') as SlideGenerationStrategy,
          referenceSlideNumber: plan?.referenceSlideNumber,
          approved: createBaselineSlide(spec, assignment),
          status: 'approved' as const,
          roleAssignment: assignment,
        };
      }).filter((s): s is NonNullable<typeof s> => s !== null);

      state.finalPlan = {
        meta: { title: state.contentSpec.title, subtitle: state.contentSpec.subtitle },
        confirmedSlideCount: state.autoPlanning.confirmedSlideCount,
        selectedDirection: state.autoPlanning.direction,
        selectedStructure: state.autoPlanning.structure,
        contentSpec: state.contentSpec,
        deckDesignPlan: dp,
        slides,
      };
      state.completedSlides = slides.map((s) => s.approved!);
    }
  }

  if (errors > 0) { console.log(colors.red(`\nStep 3에서 실패. 중단합니다.`)); process.exit(1); }

  // ─── Step 4: Expression Candidates (first slide only as smoke test) ───
  log('Step 4', '표현 방식 후보 요청 (슬라이드 1번)...');
  state.currentSlideIndex = 0;
  const step4Messages: LlmMessage[] = [
    { role: 'user', content: '슬라이드 1번의 시각 표현 방식 후보를 생성해주세요.' },
  ];

  const step4Text = await callChat(step4Messages, 4, state);
  const step4Data = extractStructuredData(step4Text);

  if (!step4Data) {
    warn('Step 4', '구조화 데이터 추출 실패 — 프롬프트 튜닝 필요할 수 있음');
    warnings++;
  } else if (step4Data.type !== 'expression_candidates') {
    warn('Step 4', `예상과 다른 타입: ${step4Data.type}`);
    warnings++;
  } else if (!validateStructuredData(step4Data)) {
    warn('Step 4', '유효성 검증 실패 (anti-collapse 위반 가능)');
    warnings++;
  } else {
    const ec = step4Data.data as ExpressionCandidatesPayload;
    const families = ec.candidates.map((c) => c.expressionFamily);
    const uniqueFamilies = new Set(families);
    pass('Step 4', `표현 후보 ${ec.candidates.length}개 생성 — families: ${[...uniqueFamilies].join(', ')}`);

    if (uniqueFamilies.size < ec.candidates.length) {
      warn('Step 4', 'expressionFamily 중복 있음 — anti-collapse 개선 필요');
      warnings++;
    }

    // Select first candidate
    const selected = ec.candidates[0];
    state.selectedExpressions = { [selected.slideNumber]: selected };
    pass('Step 4', `"${selected.label}" (${selected.expressionFamily}) 선택됨`);
  }

  // ─── Step 5: Slide Realization (ALL slides with post-processing + retry) ───
  state.currentStep = 5;
  const totalSlides = state.finalPlan?.slides.length || 0;
  const retryCount: Record<number, number> = {};

  for (let slideIdx = 0; slideIdx < totalSlides; slideIdx++) {
    const slideNum = slideIdx + 1;
    state.currentSlideIndex = slideIdx;
    log('Step 5', `슬라이드 ${slideNum}/${totalSlides} 완성 요청...`);

    const step5Text = await callChat(
      [{ role: 'user', content: `슬라이드 ${slideNum}번을 선택된 표현 방식으로 완성해주세요.` }],
      5,
      state
    );
    const step5Data = extractStructuredData(step5Text);

    if (!step5Data || step5Data.type !== 'slide_candidates') {
      warn('Step 5', `슬라이드 ${slideNum} 구조화 데이터 추출 실패`);
      warnings++;
      continue;
    }

    const sc = step5Data.data as { slideNumber: number; candidates: SlideCandidate[] };
    if (sc.candidates.length < 1) { warn('Step 5', `슬라이드 ${slideNum} 후보 없음`); warnings++; continue; }

    let slide = sc.candidates[0].slide;
    const spec = state.contentSpec?.slideSpecs.find((s) => s.slideNumber === slideNum);
    const assignment = state.deckDesignPlan?.roleAssignments.find((ra) => ra.slideNumber === slideNum);

    // Post-process
    if (spec && assignment) {
      const { corrected, logs } = postProcessSlide(slide, assignment, spec);
      slide = corrected;
      if (logs.length > 0) printCorrectionLogs(logs);

      // Coverage check + retry
      let coverage = scoreSlideCompleteness(spec, slide);
      let retries = 0;
      while (coverage.score < 0.9 && retries < 2) {
        retries++;
        retryCount[slideNum] = retries;
        const missingList = coverage.missing.map((m) => `- "${m}"`).join('\n');
        warn('Step 5', `슬라이드 ${slideNum} 커버리지 ${(coverage.score * 100).toFixed(0)}% — 재시도 ${retries}/2`);

        const retryText = await callChat(
          [{ role: 'user', content: `슬라이드 ${slideNum}번에서 다음 필수 요소가 누락되었습니다:\n${missingList}\n\n기존 내용은 유지하되, 위 요소를 반드시 bulletPoints 또는 bodyText에 추가해서 다시 완성해주세요.` }],
          5,
          state
        );
        const retryData = extractStructuredData(retryText);
        if (retryData?.type === 'slide_candidates') {
          const retrySc = retryData.data as { candidates: SlideCandidate[] };
          if (retrySc.candidates.length >= 1) {
            slide = retrySc.candidates[0].slide;
            const { corrected: c2, logs: l2 } = postProcessSlide(slide, assignment, spec);
            slide = c2;
            if (l2.length > 0) printCorrectionLogs(l2);
            coverage = scoreSlideCompleteness(spec, slide);
          }
        }
      }

      if (coverage.score < 0.9 && retries >= 2) {
        warn('Step 5', `슬라이드 ${slideNum} 2회 재시도 후에도 커버리지 ${(coverage.score * 100).toFixed(0)}% — 현재 결과로 확정`);
      }
    }

    pass('Step 5', `슬라이드 ${slideNum} 완성 — "${slide.title}"`);

    // Update state
    state.completedSlides = state.completedSlides.map((s) =>
      s.slideNumber === slideNum ? slide : s
    );
    if (state.finalPlan) {
      state.finalPlan.slides = state.finalPlan.slides.map((s) =>
        s.slideNumber === slideNum ? { ...s, approved: slide, status: 'approved' as const } : s
      );
    }
  }

  // ─── PPT Generation ───
  if (!SKIP_PPT && state.finalPlan) {
    log('PPT', 'PPT 생성 요청...');
    try {
      const pptRes = await fetch(`${BASE_URL}/api/generate-ppt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.finalPlan),
      });
      if (!pptRes.ok) {
        fail('PPT', `생성 실패: ${pptRes.status}`);
        errors++;
      } else {
        const buffer = await pptRes.arrayBuffer();
        const size = (buffer.byteLength / 1024).toFixed(1);
        pass('PPT', `생성 완료 — ${size}KB`);
      }
    } catch (err) {
      fail('PPT', `요청 실패: ${err}`);
      errors++;
    }
  }

  // ─── Structural Benchmark ───
  if (state.finalPlan) {
    log('Benchmark', '구조적 벤치마크 실행...');
    const result = runStructuralBenchmark(state.finalPlan);
    pass('Benchmark', `종합 점수: ${(result.overallScore * 100).toFixed(1)}% (${result.grade})`);
    console.log(colors.dim(generateStructuralReport(result)));

    if (SAVE) {
      const resultsDir = path.join(process.cwd(), 'benchmark-results');
      if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = path.join(resultsDir, `e2e-${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify({
        structural: result,
        finalPlan: state.finalPlan,
        provider: PROVIDER,
      }, null, 2));
      log('Save', `결과 저장: ${outputFile}`);
    }
  }

  // ─── Summary ───
  console.log('');
  console.log(colors.cyan('═══════════════════════════════════════════'));
  if (errors === 0 && warnings === 0) {
    console.log(colors.green('  ✓ 모든 테스트 통과!'));
  } else if (errors === 0) {
    console.log(colors.yellow(`  ⚠ 통과 (경고 ${warnings}건)`));
  } else {
    console.log(colors.red(`  ✗ 실패 ${errors}건, 경고 ${warnings}건`));
  }
  console.log(colors.cyan('═══════════════════════════════════════════'));
  console.log('');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(colors.red(`\n치명적 오류: ${err.message || err}`));
  process.exit(1);
});

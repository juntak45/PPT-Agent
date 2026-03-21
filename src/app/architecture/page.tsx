'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useReferences } from '@/hooks/useReferences';
import { ArchitectureExtractionResult, ArchitectureOverlayPlan, ArchitectureSlideModel, ArchitectureVariation } from '@/lib/architecture/types';
import ArchitectureCanvas from '@/components/architecture/ArchitectureCanvas';
import { SLIDE_THEMES } from '@/lib/slideThemes';

type ScopeTarget = 'layout' | string;

async function parseRfiFile(file: File, provider: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('provider', provider);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'RFI 업로드 실패');
  return data.text as string;
}

export default function ArchitecturePage() {
  const { references, isLoading: referencesLoading } = useReferences();
  const { showToast } = useToast();
  const [provider] = useState<'claude' | 'openai'>('claude');
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);
  const [rfiText, setRfiText] = useState('');
  const [rfiFileName, setRfiFileName] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState('');
  const [themeId, setThemeId] = useState('corporate-blue');
  const [status, setStatus] = useState('레퍼런스를 선택하고 RFI를 업로드하세요.');
  const [isBusy, setIsBusy] = useState(false);

  const [extraction, setExtraction] = useState<ArchitectureExtractionResult | null>(null);
  const [overlayPlan, setOverlayPlan] = useState<ArchitectureOverlayPlan | null>(null);
  const [slideModel, setSlideModel] = useState<ArchitectureSlideModel | null>(null);
  const [variations, setVariations] = useState<ArchitectureVariation[]>([]);
  const [selectedScope, setSelectedScope] = useState<ScopeTarget>('layout');

  useEffect(() => {
    if (references.length > 0 && selectedReferenceIds.length === 0) {
      setSelectedReferenceIds([references[0].id]);
    }
  }, [references, selectedReferenceIds.length]);

  const canExtract = selectedReferenceIds.length > 0 && rfiText.trim().length > 0;
  const selectedReferenceNames = useMemo(
    () => references.filter((reference) => selectedReferenceIds.includes(reference.id)).map((reference) => reference.name),
    [references, selectedReferenceIds],
  );

  async function handleRfiUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsBusy(true);
    setStatus('RFI 문서를 열고 텍스트를 추출하고 있습니다...');
    try {
      const text = await parseRfiFile(file, provider);
      setRfiText(text);
      setRfiFileName(file.name);
      showToast('RFI 텍스트 추출이 완료되었습니다.', 'success');
      setStatus('기술 추출을 실행해 고객사 컴포넌트를 확인하세요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'RFI 처리 중 오류가 발생했습니다.', 'error');
      setStatus('RFI 처리에 실패했습니다.');
    } finally {
      setIsBusy(false);
      event.target.value = '';
    }
  }

  async function runExtract() {
    setIsBusy(true);
    setStatus('고객사 기술 구조와 요구사항을 추출하고 있습니다...');
    try {
      const response = await fetch('/api/architecture/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfiText,
          referenceIds: selectedReferenceIds,
          manualNotes,
          provider,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '기술 추출 실패');
      setExtraction(data);
      setOverlayPlan(null);
      setSlideModel(null);
      setVariations([]);
      setStatus('추출 완료. 컴포넌트를 검토하고 Wrtn 매핑을 생성하세요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '추출 실패', 'error');
      setStatus('기술 추출에 실패했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function runOverlay(nextExtraction = extraction) {
    if (!nextExtraction) return;
    setIsBusy(true);
    setStatus('고객사 기술 위에 Wrtn 모듈을 매핑하고 있습니다...');
    try {
      const response = await fetch('/api/architecture/overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction: nextExtraction,
          referenceIds: selectedReferenceIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Wrtn 매핑 실패');
      setOverlayPlan(data);
      setSlideModel(null);
      setVariations([]);
      setStatus('Wrtn 매핑 완료. 슬라이드를 생성하세요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Wrtn 매핑 실패', 'error');
      setStatus('Wrtn 매핑에 실패했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function runRender(nextOverlay = overlayPlan, nextThemeId = themeId) {
    if (!nextOverlay) return;
    setIsBusy(true);
    setStatus('reference style profile을 반영한 아키텍처 슬라이드를 만들고 있습니다...');
    try {
      const response = await fetch('/api/architecture/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlayPlan: nextOverlay, themeId: nextThemeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '슬라이드 생성 실패');
      setSlideModel(data);
      setVariations([]);
      setStatus('슬라이드 생성 완료. 필요한 블록만 수정하거나 변주를 생성하세요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '슬라이드 생성 실패', 'error');
      setStatus('슬라이드 생성에 실패했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function runRefine() {
    if (!overlayPlan) return;
    setIsBusy(true);
    setStatus('선택한 영역의 대안 레이아웃을 만들고 있습니다...');
    try {
      const response = await fetch('/api/architecture/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overlayPlan,
          targetScope: selectedScope,
          instruction: '같은 reference 스타일 안에서 더 설득력 있는 구조로 조정',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '변주 생성 실패');
      setVariations(data.variations || []);
      setStatus('변주 후보가 생성되었습니다. 마음에 드는 안을 적용하세요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '변주 생성 실패', 'error');
      setStatus('변주 생성에 실패했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function downloadPpt() {
    if (!slideModel) return;
    setIsBusy(true);
    setStatus('편집 가능한 PPTX로 내보내고 있습니다...');
    try {
      const response = await fetch('/api/architecture/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slideModel),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'PPTX export 실패');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slideModel.title || 'architecture-slide'}.pptx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus('PPTX 다운로드가 완료되었습니다.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'PPTX export 실패', 'error');
      setStatus('PPTX export에 실패했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  function updateGroupTitle(groupId: string, value: string) {
    if (!slideModel) return;
    setSlideModel({
      ...slideModel,
      groups: slideModel.groups.map((group) => group.id === groupId ? { ...group, title: value } : group),
    });
  }

  function updateComponentLabel(componentId: string, value: string) {
    if (!slideModel) return;
    setSlideModel({
      ...slideModel,
      components: slideModel.components.map((component) => component.id === componentId ? { ...component, label: value } : component),
    });
  }

  function updateConnectionLabel(connectionId: string, value: string) {
    if (!slideModel) return;
    setSlideModel({
      ...slideModel,
      connections: slideModel.connections.map((connection) => connection.id === connectionId ? { ...connection, label: value } : connection),
    });
  }

  async function toggleWrtnModule(moduleId: string) {
    if (!overlayPlan) return;
    const nextOverlay = {
      ...overlayPlan,
      wrtnModules: overlayPlan.wrtnModules.map((module) =>
        module.id === moduleId ? { ...module, enabled: !module.enabled } : module
      ),
    };
    setOverlayPlan(nextOverlay);
    await runRender(nextOverlay, themeId);
  }

  async function handleThemeChange(nextThemeId: string) {
    setThemeId(nextThemeId);
    if (overlayPlan) {
      await runRender(overlayPlan, nextThemeId);
    }
  }

  async function runQuickGenerate() {
    if (!canExtract) return;
    setIsBusy(true);
    setStatus('고객사 기술 구조를 빠르게 추출하고 있습니다...');
    try {
      const extractResponse = await fetch('/api/architecture/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfiText,
          referenceIds: selectedReferenceIds,
          manualNotes,
          provider,
        }),
      });
      const extractData = await extractResponse.json();
      if (!extractResponse.ok) throw new Error(extractData.error || '기술 추출 실패');
      setExtraction(extractData);

      setStatus('Wrtn 모듈을 고객사 구조에 매핑하고 있습니다...');
      const overlayResponse = await fetch('/api/architecture/overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction: extractData,
          referenceIds: selectedReferenceIds,
        }),
      });
      const overlayData = await overlayResponse.json();
      if (!overlayResponse.ok) throw new Error(overlayData.error || 'Wrtn 매핑 실패');
      setOverlayPlan(overlayData);

      setStatus('reference 스타일을 반영한 아키텍처 슬라이드를 만들고 있습니다...');
      const renderResponse = await fetch('/api/architecture/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlayPlan: overlayData, themeId }),
      });
      const renderData = await renderResponse.json();
      if (!renderResponse.ok) throw new Error(renderData.error || '슬라이드 생성 실패');
      setSlideModel(renderData);
      setVariations([]);
      setStatus('단일 아키텍처 슬라이드 생성이 완료되었습니다. 필요한 텍스트만 손보면 됩니다.');
      showToast('빠른 생성이 완료되었습니다.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '빠른 생성 실패', 'error');
      setStatus('빠른 생성에 실패했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f3f4f6_0%,#e0e7ff_100%)] text-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Wrtn Architecture Mapper</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Reference-first Architecture Slide Generator</h1>
            <p className="mt-2 max-w-4xl text-sm text-gray-600">
              고객사 기술을 컴포넌트 단위로 분해하고, Wrtn 기술을 덧씌운 편집 가능한 단일 아키텍처 슬라이드를 생성합니다.
            </p>
          </div>
          <div className="text-right">
            <a href="/legacy" className="text-sm text-blue-600 hover:text-blue-700">legacy deck generator</a>
            <div className="mt-2 rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5">
              <p className="text-xs font-semibold text-gray-500">현재 상태</p>
              <p className="mt-1 text-sm text-gray-700">{status}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Step 1. 입력</h2>
                <a href="/references" className="text-sm text-blue-600 hover:text-blue-700">
                  reference 관리
                </a>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</p>
                {referencesLoading ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> 불러오는 중...</div>
                ) : references.length === 0 ? (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                    reference가 없습니다. 먼저 <a href="/references" className="font-semibold underline">reference 업로드</a>가 필요합니다.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {references.map((reference) => {
                      const checked = selectedReferenceIds.includes(reference.id);
                      return (
                        <label key={reference.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedReferenceIds((prev) => checked ? prev.filter((id) => id !== reference.id) : [...prev, reference.id]);
                            }}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{reference.name}</p>
                            <p className="text-xs text-gray-500">{reference.analysis.structuralNotes || reference.analysis.sectionFlow.join(' → ')}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">RFI 업로드</p>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-6 text-center">
                  <span className="text-sm font-semibold text-blue-700">{rfiFileName || 'RFI / PDF / DOCX / PPTX 업로드'}</span>
                  <span className="mt-1 text-xs text-blue-500">텍스트 추출 후 아키텍처 분석에 사용합니다.</span>
                  <input type="file" accept=".pdf,.docx,.pptx" className="hidden" onChange={handleRfiUpload} />
                </label>
                <textarea
                  value={rfiText}
                  onChange={(event) => setRfiText(event.target.value)}
                  placeholder="또는 RFI 원문/요약을 직접 붙여넣으세요. 업로드 후에도 여기서 텍스트를 바로 수정할 수 있습니다."
                  className="mt-3 h-40 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400"
                />
                <textarea
                  value={manualNotes}
                  onChange={(event) => setManualNotes(event.target.value)}
                  placeholder="누락된 고객사 기술, 연동 시스템, 운영 요구를 보완 입력하세요. 예) Genesys, CRM, TIBERO, 관리자 포털"
                  className="mt-3 h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-blue-400"
                />
                <Button onClick={runExtract} disabled={!canExtract || isBusy || references.length === 0} className="mt-3 w-full">
                  {isBusy ? <span className="flex items-center gap-2"><Spinner size="sm" /> 처리 중...</span> : '기술 추출'}
                </Button>
                <Button
                  onClick={runQuickGenerate}
                  disabled={!canExtract || isBusy || references.length === 0}
                  className="mt-2 w-full"
                  variant="secondary"
                >
                  {isBusy ? <span className="flex items-center gap-2"><Spinner size="sm" /> 처리 중...</span> : '빠르게 1장 만들기'}
                </Button>
              </div>
            </section>

            <section className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5">
              <h2 className="text-lg font-bold">Step 2. 추출 검토</h2>
              {!extraction ? (
                <p className="mt-3 text-sm text-gray-500">RFI를 추출하면 고객사 기술 컴포넌트, 의사결정 포인트, current/target state를 보여줍니다.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl bg-gray-50 px-3 py-3">
                    <p className="text-sm font-semibold">{extraction.projectTitle}</p>
                    <p className="mt-1 text-xs text-gray-600">{extraction.executiveSummary}</p>
                  </div>
                  {extraction.customerProblems.length > 0 && (
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Problems</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {extraction.customerProblems.map((item) => (
                          <span key={item} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {extraction.decisionDrivers.length > 0 && (
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Decision Drivers</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {extraction.decisionDrivers.map((item) => (
                          <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current State</p>
                      <p className="mt-1 text-sm text-gray-700">{extraction.currentState}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target State</p>
                      <p className="mt-1 text-sm text-gray-700">{extraction.targetState}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Components</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {extraction.customerComponents.map((component) => (
                        <span key={component.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {component.label} · {component.type}
                        </span>
                      ))}
                    </div>
                  </div>
                  {extraction.integrationPoints.length > 0 && (
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Integration Points</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {extraction.integrationPoints.map((item) => (
                          <span key={item} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {extraction.missingInformation.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Missing Information</p>
                      <ul className="mt-2 space-y-1 text-xs text-amber-800">
                        {extraction.missingInformation.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button onClick={() => runOverlay(extraction)} disabled={isBusy}>
                    {isBusy ? <span className="flex items-center gap-2"><Spinner size="sm" /> 처리 중...</span> : 'Wrtn 매핑 생성'}
                  </Button>
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5">
              <h2 className="text-lg font-bold">Step 3. Wrtn Overlay</h2>
              {!overlayPlan ? (
                <p className="mt-3 text-sm text-gray-500">고객사 컴포넌트에 연결될 Wrtn 모듈이 여기 표시됩니다.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {overlayPlan.wrtnModules.map((module) => (
                    <div key={module.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{module.label}</p>
                          <p className="mt-1 text-xs text-gray-500">{module.rationale}</p>
                        </div>
                        <button
                          onClick={() => toggleWrtnModule(module.id)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${module.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {module.enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SLIDE_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`rounded-xl border px-3 py-2 text-left ${themeId === theme.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <p className="text-sm font-semibold">{theme.name}</p>
                        <p className="text-xs text-gray-500">{theme.description}</p>
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => runRender(overlayPlan, themeId)} disabled={isBusy}>
                    {isBusy ? <span className="flex items-center gap-2"><Spinner size="sm" /> 처리 중...</span> : '아키텍처 슬라이드 만들기'}
                  </Button>
                </div>
              )}
            </section>

            {slideModel && (
              <section className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5">
                <h2 className="text-lg font-bold">Step 5. 블록 편집 & Export</h2>
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Refine Scope</p>
                    <select
                      value={selectedScope}
                      onChange={(event) => setSelectedScope(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="layout">전체 레이아웃</option>
                      {slideModel.groups.map((group) => (
                        <option key={group.id} value={`group:${group.id}`}>{group.title}</option>
                      ))}
                    </select>
                    <Button onClick={runRefine} disabled={isBusy} className="mt-3 w-full" variant="secondary">
                      {isBusy ? <span className="flex items-center gap-2"><Spinner size="sm" /> 처리 중...</span> : '이 영역만 다시'}
                    </Button>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Group Labels</p>
                    <div className="mt-2 space-y-2">
                      {slideModel.groups.map((group) => (
                        <input
                          key={group.id}
                          value={group.title}
                          onChange={(event) => updateGroupTitle(group.id, event.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Component Labels</p>
                    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                      {slideModel.components.map((component) => (
                        <input
                          key={component.id}
                          value={component.label}
                          onChange={(event) => updateComponentLabel(component.id, event.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Connection Labels</p>
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                      {slideModel.connections.map((connection) => (
                        <input
                          key={connection.id}
                          value={connection.label || ''}
                          onChange={(event) => updateConnectionLabel(connection.id, event.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          placeholder={`${connection.from} -> ${connection.to}`}
                        />
                      ))}
                    </div>
                  </div>

                  <Button onClick={downloadPpt} disabled={isBusy} className="w-full">
                    {isBusy ? <span className="flex items-center gap-2"><Spinner size="sm" /> 처리 중...</span> : 'PPT 다운로드'}
                  </Button>
                </div>
              </section>
            )}
          </div>

          <div className="rounded-[28px] bg-white/75 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Preview</p>
                <h2 className="mt-1 text-xl font-black">Architecture Slide</h2>
                {selectedReferenceNames.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">reference: {selectedReferenceNames.join(', ')}</p>
                )}
              </div>
              {slideModel && variations.length === 0 && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">editable native PPT</span>
              )}
            </div>

            <div className="mt-4">
              {variations.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    {variations.map((variation) => (
                      <button
                        key={variation.id}
                        onClick={() => {
                          setSlideModel(variation.slide);
                          setVariations([]);
                          setStatus(`${variation.label}을 적용했습니다.`);
                        }}
                        className="rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-400"
                      >
                        <p className="text-sm font-bold">{variation.label}</p>
                        <p className="mt-1 text-xs text-gray-500">{variation.description}</p>
                        <ArchitectureCanvas slide={variation.slide} className="mt-3" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : slideModel ? (
                <ArchitectureCanvas slide={slideModel} />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-500">
                  {references.length === 0
                    ? 'reference를 먼저 등록해야 생성이 가능합니다.'
                    : 'RFI를 업로드하고 Wrtn 매핑을 생성하면 편집 가능한 단일 아키텍처 슬라이드가 여기에 표시됩니다.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

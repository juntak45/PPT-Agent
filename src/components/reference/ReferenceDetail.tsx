'use client';

import { ReferenceProposal } from '@/lib/types';

interface ReferenceDetailProps {
  reference: ReferenceProposal;
  onClose: () => void;
}

export default function ReferenceDetail({ reference, onClose }: ReferenceDetailProps) {
  const { analysis } = reference;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{reference.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Meta info */}
          <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>유형: {reference.sourceType.toUpperCase()}</span>
            <span>등록: {new Date(reference.createdAt).toLocaleDateString('ko-KR')}</span>
            <span>슬라이드: {analysis.totalSlideCount}장</span>
          </div>

          {/* Section Flow */}
          {analysis.sectionFlow.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">섹션 흐름</h3>
              <div className="flex flex-wrap gap-1 items-center">
                {analysis.sectionFlow.map((section, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                      {section}
                    </span>
                    {i < analysis.sectionFlow.length - 1 && (
                      <span className="text-gray-400">&rarr;</span>
                    )}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Writing Style */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">작성 스타일</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {analysis.writingStyle.tone && <p><strong>톤:</strong> {analysis.writingStyle.tone}</p>}
              {analysis.writingStyle.bulletStyle && <p><strong>불릿:</strong> {analysis.writingStyle.bulletStyle}</p>}
              {analysis.writingStyle.commonPhrases.length > 0 && (
                <div>
                  <strong>자주 쓰는 표현:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.writingStyle.commonPhrases.map((phrase, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        &ldquo;{phrase}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.writingStyle.sentencePatterns.length > 0 && (
                <div>
                  <strong>예시 문장:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    {analysis.writingStyle.sentencePatterns.map((s, i) => (
                      <li key={i} className="text-xs italic">&ldquo;{s}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Slide Patterns */}
          {analysis.slidePatterns.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">슬라이드 패턴</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
                      <th className="py-1 pr-2">#</th>
                      <th className="py-1 pr-2">섹션</th>
                      <th className="py-1 pr-2">레이아웃</th>
                      <th className="py-1 pr-2">밀도</th>
                      <th className="py-1">시각 요소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.slidePatterns.map((p, i) => (
                      <tr key={i} className="border-b dark:border-gray-700 text-gray-600 dark:text-gray-400">
                        <td className="py-1 pr-2">{p.slideNumber}</td>
                        <td className="py-1 pr-2">{p.sectionName}</td>
                        <td className="py-1 pr-2">{p.layoutType}</td>
                        <td className="py-1 pr-2">{p.contentDensity}</td>
                        <td className="py-1">
                          {[p.hasChart && '차트', p.hasDiagram && '다이어그램'].filter(Boolean).join(', ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Layout Blueprints */}
          {analysis.layoutBlueprints && analysis.layoutBlueprints.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                레이아웃 청사진 (컴포넌트 배치)
              </h3>
              <div className="space-y-3">
                {analysis.layoutBlueprints.filter((bp) => bp.shapes.length > 0).map((bp) => (
                  <div key={bp.slideNumber} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        슬라이드 {bp.slideNumber}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {bp.compositionSummary}
                      </span>
                    </div>
                    {/* Mini layout visualization */}
                    <div className="relative bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600" style={{ paddingBottom: '56.25%' }}>
                      {bp.shapes
                        .filter((s) => s.position.w > 3 && s.position.h > 3)
                        .map((shape, si) => {
                          const colors: Record<string, string> = {
                            textbox: 'bg-blue-200/60 dark:bg-blue-800/40 border-blue-400',
                            image: 'bg-green-200/60 dark:bg-green-800/40 border-green-400',
                            chart: 'bg-orange-200/60 dark:bg-orange-800/40 border-orange-400',
                            table: 'bg-purple-200/60 dark:bg-purple-800/40 border-purple-400',
                            diagram: 'bg-pink-200/60 dark:bg-pink-800/40 border-pink-400',
                            shape: 'bg-gray-200/60 dark:bg-gray-600/40 border-gray-400',
                            group: 'bg-yellow-200/60 dark:bg-yellow-800/40 border-yellow-400',
                            other: 'bg-gray-200/40 dark:bg-gray-600/30 border-gray-300',
                          };
                          const typeLabels: Record<string, string> = {
                            textbox: 'T', image: 'IMG', chart: 'CHT',
                            table: 'TBL', diagram: 'DGM', shape: 'S',
                            group: 'GRP', other: '?',
                          };
                          return (
                            <div
                              key={si}
                              className={`absolute border rounded-sm flex items-center justify-center overflow-hidden ${colors[shape.type] || colors.other}`}
                              style={{
                                left: `${shape.position.x}%`,
                                top: `${shape.position.y}%`,
                                width: `${shape.position.w}%`,
                                height: `${shape.position.h}%`,
                              }}
                              title={`${shape.type}${shape.subType ? `(${shape.subType})` : ''} ${shape.text || shape.name || ''}`}
                            >
                              <span className="text-[8px] font-bold text-gray-600 dark:text-gray-300 leading-none">
                                {typeLabels[shape.type] || '?'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    {/* Legend for shapes */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {bp.shapes.filter((s) => s.position.w > 3 && s.position.h > 3).map((s, si) => (
                        <span key={si} className="text-[10px] text-gray-500 dark:text-gray-400">
                          {s.type}{s.subType ? `(${s.subType})` : ''}{s.text ? `: "${s.text.slice(0, 20)}"` : ''}
                          {si < bp.shapes.length - 1 ? ' /' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Structural Notes */}
          {analysis.structuralNotes && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">구조적 특징</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.structuralNotes}</p>
            </section>
          )}

          {/* Slide Detailed Analyses */}
          {analysis.slideDetailedAnalyses && analysis.slideDetailedAnalyses.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                슬라이드별 디테일 분석
              </h3>
              <div className="space-y-4">
                {analysis.slideDetailedAnalyses.map((sa) => (
                  <div
                    key={sa.slideNumber}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                        {sa.slideNumber}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {sa.keyMessage}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">목적: </span>
                        {sa.purpose}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">콘텐츠 전략: </span>
                        {sa.contentStrategy}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">디자인 의도: </span>
                        {sa.designIntent}
                      </div>

                      {sa.visualElements.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">시각 요소:</span>
                          <ul className="mt-1 space-y-1 ml-4">
                            {sa.visualElements.map((ve, vi) => (
                              <li key={vi} className="text-xs">
                                <span className="font-medium">{ve.element}</span>
                                {' '}&mdash; {ve.role}
                                {ve.placementReason && (
                                  <span className="text-gray-400"> ({ve.placementReason})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">문체 패턴: </span>
                        {sa.writingPattern}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">스토리 연결: </span>
                        {sa.narrativeConnection}
                      </div>

                      {sa.notableTechniques.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">참고 기법:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sa.notableTechniques.map((tech, ti) => (
                              <span
                                key={ti}
                                className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded text-xs"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

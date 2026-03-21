'use client';

import { useState } from 'react';
import { useReferences } from '@/hooks/useReferences';
import { ReferenceProposal } from '@/lib/types';
import ReferenceUploadForm from './ReferenceUploadForm';
import ReferenceDetail from './ReferenceDetail';

interface ReferencePanelProps {
  open: boolean;
  onClose: () => void;
  provider: string;
}

export default function ReferencePanel({ open, onClose, provider }: ReferencePanelProps) {
  const {
    references,
    isLoading,
    progressDetail,
    error,
    addReferenceFromFile,
    addReferenceFromText,
    removeReference,
  } = useReferences();
  const [selectedRef, setSelectedRef] = useState<ReferenceProposal | null>(null);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            참고 제안서 관리
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            잘 만든 제안서를 등록하면 새 제안서 생성 시 스타일/구조/톤을 자동으로 참고합니다.
          </p>

          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          {/* Upload form */}
          <ReferenceUploadForm
            onUploadFile={async (file, name, prov) => {
              await addReferenceFromFile(file, name, prov);
            }}
            onUploadText={async (name, text, prov) => {
              await addReferenceFromText(name, text, prov);
            }}
            isLoading={isLoading}
            progressDetail={progressDetail}
            provider={provider}
          />

          {/* Reference list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              등록된 레퍼런스 ({references.length}건)
            </h3>
            {references.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                등록된 레퍼런스가 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {references.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <button
                      onClick={() => setSelectedRef(ref)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {ref.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
                          {ref.sourceType.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{ref.analysis.totalSlideCount}장</span>
                        <span className="truncate">
                          {ref.analysis.sectionFlow.slice(0, 3).join(' → ')}
                          {ref.analysis.sectionFlow.length > 3 ? ' ...' : ''}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${ref.name}" 레퍼런스를 삭제할까요?`)) {
                          removeReference(ref.id);
                        }
                      }}
                      className="ml-2 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedRef && (
        <ReferenceDetail
          reference={selectedRef}
          onClose={() => setSelectedRef(null)}
        />
      )}
    </>
  );
}

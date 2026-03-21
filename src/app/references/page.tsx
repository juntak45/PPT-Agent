'use client';

import { useState } from 'react';
import { useReferences } from '@/hooks/useReferences';
import { ReferenceProposal } from '@/lib/types';
import ReferenceList from '@/components/reference/ReferenceList';
import ReferenceUploadForm from '@/components/reference/ReferenceUploadForm';
import ReferenceDetail from '@/components/reference/ReferenceDetail';
import { DEFAULT_PROVIDER } from '@/lib/constants';

export default function ReferencesPage() {
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
  const [provider] = useState(DEFAULT_PROVIDER);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              참고 제안서 관리
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              PM들이 잘 만든 제안서를 등록하면, 새 제안서 생성 시 스타일/구조/톤을 자동으로 참고합니다.
            </p>
          </div>
          <a
            href="/"
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded transition-colors"
          >
            &larr; 돌아가기
          </a>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
            {error}
          </div>
        )}

        {/* Upload form */}
        <div className="mb-6">
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
        </div>

        {/* Reference list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            등록된 레퍼런스 ({references.length}건)
          </h2>
          <ReferenceList
            references={references}
            onSelect={setSelectedRef}
            onDelete={removeReference}
          />
        </div>
      </div>

      {/* Detail modal */}
      {selectedRef && (
        <ReferenceDetail
          reference={selectedRef}
          onClose={() => setSelectedRef(null)}
        />
      )}
    </div>
  );
}

'use client';

import { ReferenceProposal } from '@/lib/types';

interface ReferenceListProps {
  references: ReferenceProposal[];
  onSelect: (ref: ReferenceProposal) => void;
  onDelete: (id: string) => void;
}

export default function ReferenceList({ references, onSelect, onDelete }: ReferenceListProps) {
  if (references.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
        등록된 레퍼런스가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {references.map((ref) => (
        <div
          key={ref.id}
          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <button
            onClick={() => onSelect(ref)}
            className="flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {ref.name}
              </span>
              <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                {ref.sourceType === 'pptx' ? 'PPTX' : 'TEXT'}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{ref.analysis.totalSlideCount}장</span>
              <span>{ref.analysis.sectionFlow.slice(0, 4).join(' → ')}{ref.analysis.sectionFlow.length > 4 ? ' ...' : ''}</span>
              <span>{new Date(ref.createdAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`"${ref.name}" 레퍼런스를 삭제할까요?`)) {
                onDelete(ref.id);
              }
            }}
            className="ml-2 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

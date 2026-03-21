'use client';

import { useState, useRef } from 'react';

interface ReferenceUploadFormProps {
  onUploadFile: (file: File, name: string, provider: string) => Promise<void>;
  onUploadText: (name: string, text: string, provider: string) => Promise<void>;
  isLoading: boolean;
  progressDetail?: string | null;
  provider: string;
}

export default function ReferenceUploadForm({
  onUploadFile,
  onUploadText,
  isLoading,
  progressDetail,
  provider,
}: ReferenceUploadFormProps) {
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tab === 'file' && selectedFile) {
        await onUploadFile(selectedFile, name || selectedFile.name, provider);
      } else if (tab === 'text' && text.trim()) {
        await onUploadText(name, text, provider);
      }
      // Reset form
      setName('');
      setText('');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      // error handled by parent
    }
  };

  const canSubmit =
    !isLoading &&
    name.trim() !== '' &&
    ((tab === 'file' && selectedFile !== null) || (tab === 'text' && text.trim() !== ''));

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">레퍼런스 등록</h3>

      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('file')}
          className={`px-3 py-1.5 text-sm rounded ${
            tab === 'file'
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          파일 업로드
        </button>
        <button
          type="button"
          onClick={() => setTab('text')}
          className={`px-3 py-1.5 text-sm rounded ${
            tab === 'text'
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          텍스트 입력
        </button>
      </div>

      {/* Name */}
      <input
        type="text"
        placeholder="레퍼런스 이름 (예: 클라우드 전환 제안서)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />

      {/* File tab */}
      {tab === 'file' && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pptx,.pdf,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setSelectedFile(f);
              if (f && !name) setName(f.name.replace(/\.(pptx|pdf|docx)$/i, ''));
            }}
            className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 file:cursor-pointer"
          />
          {selectedFile && (
            <p className="mt-1 text-xs text-gray-500">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</p>
          )}
        </div>
      )}

      {/* Text tab */}
      {tab === 'text' && (
        <textarea
          placeholder="제안서 내용을 붙여넣기 하세요. 슬라이드 구분은 빈 줄로 합니다."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-2 px-4 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? '분석 중...' : '레퍼런스 등록'}
      </button>
      {isLoading && progressDetail && (
        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{progressDetail}</span>
        </div>
      )}
    </form>
  );
}

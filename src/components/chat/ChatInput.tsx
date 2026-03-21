'use client';

import { useState, useId, KeyboardEvent } from 'react';
import Button from '@/components/ui/Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileUpload?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
  hasMessages?: boolean;
  uploadingFileName?: string | null;
  uploadingStatusText?: string | null;
}

export default function ChatInput({
  onSend,
  onFileUpload,
  disabled,
  placeholder = '메시지를 입력하세요...',
  hasMessages = false,
  uploadingFileName,
  uploadingStatusText,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const fileId = useId();

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) onFileUpload(file);
    e.target.value = '';
  };

  const isUploading = !!uploadingFileName;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      {/* 파일 업로드 중 표시 */}
      {isUploading && (
        <div className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
              {uploadingFileName}
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400">
              {uploadingStatusText || '문서를 분석하고 있습니다...'}
            </p>
          </div>
        </div>
      )}

      {/* 초기 상태: 큰 파일 업로드 영역 */}
      {!hasMessages && !isUploading && onFileUpload && !disabled && (
        <div className="mb-3">
          <label
            htmlFor={fileId + '-big'}
            className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
          >
            <svg className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              제안요청서(RFP) 문서를 첨부해주세요
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              .pdf, .docx, .pptx 파일 지원
            </span>
            <input
              id={fileId + '-big'}
              type="file"
              accept=".pdf,.docx,.pptx"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* 작은 클립 아이콘 (메시지가 있을 때) */}
        {onFileUpload && hasMessages && (
          <div className={`relative ${disabled || isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              id={fileId}
              type="file"
              accept=".pdf,.docx,.pptx"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="파일 업로드 (.pdf, .docx, .pptx)"
            />
            <div
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 pointer-events-none"
              aria-hidden="true"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isUploading}
          placeholder={hasMessages ? placeholder : '또는 발표 주제를 직접 입력하세요...'}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          style={{ maxHeight: '120px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isUploading}
          size="md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

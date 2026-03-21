'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReferenceProposal } from '@/lib/types';

export function useReferences() {
  const [references, setReferences] = useState<ReferenceProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/references');
      if (!res.ok) throw new Error('목록 불러오기 실패');
      const data = await res.json();
      setReferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  const [progressDetail, setProgressDetail] = useState<string | null>(null);

  const addReferenceFromFile = useCallback(
    async (file: File, name: string, provider: string = 'claude') => {
      setIsLoading(true);
      setError(null);
      setProgressDetail(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('provider', provider);

        const res = await fetch('/api/references', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '등록 실패');
        }

        // Consume SSE stream
        const reader = res.body?.getReader();
        if (!reader) throw new Error('스트림을 읽을 수 없습니다');

        const decoder = new TextDecoder();
        let buffer = '';
        let result: unknown = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'progress') {
                setProgressDetail(event.detail);
              } else if (event.type === 'error') {
                throw new Error(event.error);
              } else if (event.type === 'result') {
                result = event.data;
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }

        if (!result) throw new Error('결과를 받지 못했습니다');
        setReferences((prev) => [...prev, result as ReferenceProposal]);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
        setProgressDetail(null);
      }
    },
    []
  );

  const addReferenceFromText = useCallback(
    async (name: string, text: string, provider: string = 'claude') => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, text, provider }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '등록 실패');
        }
        const newRef = await res.json();
        setReferences((prev) => [...prev, newRef]);
        return newRef;
      } catch (err) {
        const message = err instanceof Error ? err.message : '오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const removeReference = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/references/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setReferences((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다';
      setError(message);
      throw err;
    }
  }, []);

  return {
    references,
    isLoading,
    progressDetail,
    error,
    fetchReferences,
    addReferenceFromFile,
    addReferenceFromText,
    removeReference,
  };
}

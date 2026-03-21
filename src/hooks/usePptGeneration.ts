'use client';

import { useState, useCallback } from 'react';
import { FinalDeckPlan } from '@/lib/types';

interface UsePptGenerationReturn {
  isGenerating: boolean;
  error: string | null;
  generateAndDownload: (plan: FinalDeckPlan) => Promise<void>;
}

export function usePptGeneration(): UsePptGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAndDownload = useCallback(async (plan: FinalDeckPlan) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PPT 생성 실패');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plan.meta?.title || 'presentation'}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PPT 생성 중 오류 발생');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { isGenerating, error, generateAndDownload };
}

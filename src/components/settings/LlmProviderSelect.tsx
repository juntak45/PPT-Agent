'use client';

import { LlmProviderType } from '@/lib/types';

interface LlmProviderSelectProps {
  value: LlmProviderType;
  onChange: (provider: LlmProviderType) => void;
}

export default function LlmProviderSelect({ value, onChange }: LlmProviderSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LlmProviderType)}
      className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="claude">Claude</option>
      <option value="openai">OpenAI</option>
    </select>
  );
}

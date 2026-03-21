'use client';

import { OptionCandidate } from '@/lib/types';
import Card from '@/components/ui/Card';

interface OptionCardProps {
  option: OptionCandidate;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function OptionCard({ option, selected, onSelect }: OptionCardProps) {
  return (
    <Card
      selected={selected}
      hoverable={!selected}
      onClick={() => onSelect(option.id)}
      className="p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
            {option.label}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
            {option.summary}
          </p>
        </div>
        <div
          className={`ml-3 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selected
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </Card>
  );
}

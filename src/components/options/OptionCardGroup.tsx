'use client';

import { useState } from 'react';
import { OptionCandidate } from '@/lib/types';
import OptionCard from './OptionCard';
import Button from '@/components/ui/Button';

interface OptionCardGroupProps {
  options: OptionCandidate[];
  onSelect: (optionId: string) => void;
  onConfirm: () => void;
}

export default function OptionCardGroup({
  options,
  onSelect,
  onConfirm,
}: OptionCardGroupProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  return (
    <div className="space-y-3 my-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        옵션을 선택하세요
      </p>
      <div className="grid gap-3">
        {options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            selected={selectedId === option.id}
            onSelect={handleSelect}
          />
        ))}
      </div>
      {selectedId && (
        <div className="flex gap-2 pt-2">
          <Button onClick={onConfirm} size="sm">
            선택 확정
          </Button>
        </div>
      )}
    </div>
  );
}

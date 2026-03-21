'use client';

import { STEPS } from '@/lib/constants';
import { StepId } from '@/lib/types';

interface StepIndicatorProps {
  currentStep: StepId;
  completedSteps: StepId[];
  onStepClick?: (stepId: StepId) => void;
  showDocStep: boolean;
}

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  showDocStep,
}: StepIndicatorProps) {
  const steps = showDocStep ? STEPS : STEPS.filter((s) => s.id !== 0);

  return (
    <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isClickable = isCompleted && onStepClick;

        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <div
                className={`w-6 h-0.5 mx-1 ${
                  isCompleted ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isCurrent
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500/30'
                  : isCompleted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
              }`}
              title={step.description}
            >
              <span
                className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                  isCurrent
                    ? 'bg-blue-500 text-white animate-pulse'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : step.id}
              </span>
              <span className="hidden sm:inline">{step.name}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

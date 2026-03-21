'use client';

import { SLIDE_THEMES } from '@/lib/slideThemes';

interface ThemeSelectorProps {
  selectedThemeId: string;
  onSelect: (themeId: string) => void;
}

export default function ThemeSelector({ selectedThemeId, onSelect }: ThemeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {SLIDE_THEMES.map((theme) => {
        const isActive = theme.id === selectedThemeId;
        // Extract accent color for swatch
        const accentColor = theme.accent;
        const bgColor = theme.titleColor;

        return (
          <button
            key={theme.id}
            title={theme.name}
            onClick={() => onSelect(theme.id)}
            className={`relative w-6 h-6 rounded-full border-2 transition-all ${
              isActive
                ? 'border-blue-500 scale-110 shadow-sm'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            style={{
              background: `linear-gradient(135deg, ${accentColor} 50%, ${bgColor} 50%)`,
            }}
          >
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-3 h-3 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

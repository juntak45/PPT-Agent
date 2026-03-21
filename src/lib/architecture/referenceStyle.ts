import { ReferenceAnalysis } from '../types';
import { DiagramStyleProfile } from './types';

function normalizeHex(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  return color.startsWith('#') ? color : `#${color}`;
}

export function buildDiagramStyleProfile(analyses: ReferenceAnalysis[]): DiagramStyleProfile {
  const primary = analyses[0]?.themeInfo?.primaryColor;
  const secondary = analyses[0]?.themeInfo?.secondaryColor;
  const accent = analyses[0]?.themeInfo?.accentColors?.[0];
  const backgroundStyle = analyses[0]?.themeInfo?.backgroundStyle || 'light';
  const totalSlides = analyses[0]?.totalSlideCount || 0;

  return {
    id: analyses[0] ? 'reference-profile' : 'default-profile',
    titleColor: normalizeHex(primary, '#111827'),
    subtitleColor: normalizeHex(secondary, '#4b5563'),
    backgroundColor: backgroundStyle.includes('dark') ? '#111827' : '#f8fafc',
    groupFillColor: backgroundStyle.includes('dark') ? '#1f2937' : '#eef2ff',
    groupStrokeColor: normalizeHex(primary, '#cbd5e1'),
    customerFillColor: '#f3f4f6',
    wrtnFillColor: normalizeHex(accent, '#d1fae5'),
    sharedFillColor: normalizeHex(secondary, '#dbeafe'),
    connectionColor: normalizeHex(primary, '#6b7280'),
    legendStyle: 'dots',
    density: totalSlides > 15 ? 'compact' : totalSlides > 8 ? 'balanced' : 'spacious',
  };
}

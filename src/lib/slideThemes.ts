// ─── Slide Design Themes ───

export interface SlideTheme {
  id: string;
  name: string;
  description: string;
  // Background
  bg: string;           // CSS background (gradient or solid)
  bgAlt: string;        // Alternative bg for section dividers / title slides
  // Text colors
  titleColor: string;
  bodyColor: string;
  mutedColor: string;
  // Accent
  accent: string;
  accentLight: string;
  // Decorative elements
  decorBar: string;     // Top/bottom accent bar color
  bulletColor: string;
  // Slide number
  slideNumColor: string;
  // Card shadows / borders for the preview
  cardBorder: string;
}

export const SLIDE_THEMES: SlideTheme[] = [
  {
    id: 'corporate-blue',
    name: '코퍼레이트 블루',
    description: '깔끔하고 전문적인 네이비 블루 테마',
    bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    bgAlt: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
    titleColor: '#1e293b',
    bodyColor: '#475569',
    mutedColor: '#94a3b8',
    accent: '#2563eb',
    accentLight: '#dbeafe',
    decorBar: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
    bulletColor: '#2563eb',
    slideNumColor: '#94a3b8',
    cardBorder: '#e2e8f0',
  },
  {
    id: 'dark-premium',
    name: '다크 프리미엄',
    description: '고급스러운 다크 테마, 골드 액센트',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    bgAlt: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
    titleColor: '#f1f5f9',
    bodyColor: '#cbd5e1',
    mutedColor: '#64748b',
    accent: '#f59e0b',
    accentLight: 'rgba(245, 158, 11, 0.15)',
    decorBar: 'linear-gradient(90deg, #f59e0b, #d97706)',
    bulletColor: '#f59e0b',
    slideNumColor: '#475569',
    cardBorder: '#334155',
  },
  {
    id: 'modern-gradient',
    name: '모던 그라데이션',
    description: '트렌디한 퍼플-블루 그라데이션',
    bg: 'linear-gradient(135deg, #fafafa 0%, #f0f0ff 100%)',
    bgAlt: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    titleColor: '#1e1b4b',
    bodyColor: '#4c1d95',
    mutedColor: '#a78bfa',
    accent: '#7c3aed',
    accentLight: '#ede9fe',
    decorBar: 'linear-gradient(90deg, #667eea, #764ba2)',
    bulletColor: '#7c3aed',
    slideNumColor: '#a78bfa',
    cardBorder: '#e9e5ff',
  },
];

export function getThemeById(id: string): SlideTheme {
  return SLIDE_THEMES.find((t) => t.id === id) || SLIDE_THEMES[0];
}

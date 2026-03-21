'use client';

import { SlideContent, CompositionVariant } from '@/lib/types';
import { SlideTheme, SLIDE_THEMES } from '@/lib/slideThemes';

interface SlideRendererProps {
  slide: SlideContent;
  isActive?: boolean;
  scale?: number;
  theme?: SlideTheme;
}

export default function SlideRenderer({
  slide,
  isActive,
  scale = 1,
  theme = SLIDE_THEMES[0],
}: SlideRendererProps) {
  const w = 640 * scale;
  const h = 360 * scale;
  const s = scale; // shorthand
  const isInverted = slide.layout === 'title-slide' || slide.layout === 'section-divider';
  const bg = isInverted ? theme.bgAlt : theme.bg;
  const tc = isInverted ? '#ffffff' : theme.titleColor;
  const bc = isInverted ? 'rgba(255,255,255,0.8)' : theme.bodyColor;

  return (
    <div
      className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
        isActive ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''
      }`}
      style={{
        width: w, height: h, minWidth: w, minHeight: h,
        background: bg,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 * s, background: theme.decorBar }} />

      {/* Decorative elements for inverted */}
      {isInverted && (
        <>
          <div style={{ position: 'absolute', top: -40*s, right: -40*s, width: 140*s, height: 140*s, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -30*s, left: -30*s, width: 100*s, height: 100*s, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        </>
      )}

      {/* Left accent for content slides */}
      {!isInverted && (
        <div style={{ position: 'absolute', top: 4*s, left: 0, width: 3*s, height: 50*s, background: theme.accent, borderRadius: `0 ${2*s}px ${2*s}px 0` }} />
      )}

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, padding: `${(isInverted ? 28 : 24)*s}px ${20*s}px ${16*s}px`, paddingTop: `${(isInverted ? 28 : 24)*s + 4*s}px`, display: 'flex', flexDirection: 'column' }}>
        {renderSlide(slide, s, theme, tc, bc, isInverted)}
      </div>

      {/* Slide number */}
      <div style={{ position: 'absolute', bottom: 6*s, right: 12*s, fontSize: 8*s, color: isInverted ? 'rgba(255,255,255,0.3)' : theme.slideNumColor, fontFamily: 'monospace' }}>
        {slide.slideNumber}
      </div>
    </div>
  );
}

// ─── Main renderer ───
function renderSlide(slide: SlideContent, s: number, theme: SlideTheme, tc: string, bc: string, inv: boolean) {
  if (slide.layout === 'title-slide') return renderTitle(slide, s, theme, tc, bc);
  if (slide.layout === 'section-divider') return renderDivider(slide, s, theme, tc);

  const comp = slide.composition || guessComposition(slide);

  return (
    <>
      {/* Title + subTitle */}
      <div style={{ marginBottom: 4*s }}>
        <div style={{ fontSize: 14*s, fontWeight: 700, color: tc, paddingBottom: 3*s, borderBottom: `2px solid ${theme.accent}`, display: 'inline-block', maxWidth: '80%' }}>
          {slide.title}
        </div>
        {slide.subTitle && (
          <div style={{ fontSize: 8*s, color: bc, marginTop: 2*s, opacity: 0.85, lineHeight: 1.3 }}>
            {slide.subTitle}
          </div>
        )}
      </div>
      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderComposition(comp, slide, s, theme, tc, bc, inv)}
      </div>
      {/* Footnote */}
      {slide.footnote && (
        <div style={{ fontSize: 6*s, color: bc, opacity: 0.5, marginTop: 3*s, borderTop: `1px solid ${theme.accent}20`, paddingTop: 2*s }}>
          {slide.footnote}
        </div>
      )}
    </>
  );
}

function renderTitle(slide: SlideContent, s: number, theme: SlideTheme, tc: string, bc: string) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6*s }}>
      <div style={{ width: 50*s, height: 3*s, background: theme.accent, borderRadius: 2*s, marginBottom: 4*s }} />
      <div style={{ fontSize: 20*s, fontWeight: 700, color: tc, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
        {slide.title}
      </div>
      {slide.subTitle && (
        <div style={{ fontSize: 11*s, color: bc, maxWidth: 380*s, lineHeight: 1.5, opacity: 0.9 }}>
          {slide.subTitle}
        </div>
      )}
      {slide.bodyText && (
        <div style={{ fontSize: 10*s, color: bc, maxWidth: 380*s, lineHeight: 1.5, opacity: 0.8 }}>
          {slide.bodyText}
        </div>
      )}
    </div>
  );
}

function renderDivider(slide: SlideContent, s: number, theme: SlideTheme, tc: string) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40*s, height: 3*s, background: theme.accent, borderRadius: 2*s, marginBottom: 10*s }} />
      <div style={{ fontSize: 18*s, fontWeight: 700, color: tc }}>{slide.title}</div>
      {slide.subTitle && (
        <div style={{ fontSize: 10*s, color: tc, opacity: 0.7, marginTop: 6*s }}>{slide.subTitle}</div>
      )}
    </div>
  );
}

// ─── Guess composition from content ───
function guessComposition(slide: SlideContent): CompositionVariant {
  if (slide.mermaidCode || slide.layout === 'diagram') return 'stack-vertical';
  if (slide.layout === 'two-column') return 'side-by-side';
  if (slide.layout === 'chart') return 'center-highlight';
  if (slide.bulletPoints && slide.bulletPoints.length <= 3) return 'grid-cards';
  if (slide.bulletPoints && slide.bulletPoints.length >= 6) return 'icon-list';
  return 'default';
}

// ─── Key Message callout box ───
function renderKeyMessage(keyMessage: string | undefined, s: number, accent: string) {
  if (!keyMessage) return null;
  return (
    <div style={{
      background: `${accent}12`,
      border: `1px solid ${accent}30`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 4*s,
      padding: `${4*s}px ${8*s}px`,
      marginBottom: 5*s,
      fontSize: 8*s,
      fontWeight: 600,
      color: accent,
      lineHeight: 1.4,
    }}>
      💡 {keyMessage}
    </div>
  );
}

// ─── Secondary points block ───
function renderSecondaryPoints(points: string[] | undefined, s: number, bc: string, accent: string) {
  if (!points || points.length === 0) return null;
  return (
    <div style={{
      marginTop: 'auto',
      paddingTop: 4*s,
      borderTop: `1px dashed ${accent}25`,
    }}>
      {points.map((p, i) => (
        <div key={i} style={{ fontSize: 7*s, color: bc, opacity: 0.7, marginBottom: 2*s, display: 'flex', gap: 3*s, alignItems: 'flex-start' }}>
          <span style={{ color: accent, opacity: 0.6 }}>›</span>
          <span style={{ lineHeight: 1.3 }}>{p}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Composition renderers ───
function renderComposition(comp: CompositionVariant, slide: SlideContent, s: number, theme: SlideTheme, tc: string, bc: string, inv: boolean) {
  const points = slide.bulletPoints || [];
  const accent = theme.accent;
  const light = inv ? 'rgba(255,255,255,0.1)' : theme.accentLight;
  const icons = slide.iconHints || [];

  switch (comp) {
    case 'stack-vertical':
      return renderStackVertical(slide, points, s, accent, light, bc, tc, icons);
    case 'side-by-side':
      return renderSideBySide(slide, points, s, accent, light, bc, tc, theme, icons);
    case 'grid-cards':
      return renderGridCards(slide, points, s, accent, light, bc, tc, icons);
    case 'hub-spoke':
      return renderHubSpoke(slide, points, s, accent, light, bc, tc, icons);
    case 'flow-horizontal':
      return renderFlowHorizontal(slide, points, s, accent, light, bc, icons);
    case 'flow-vertical':
      return renderFlowVertical(slide, points, s, accent, light, bc, icons);
    case 'timeline':
      return renderTimeline(slide, points, s, accent, light, bc, icons);
    case 'icon-list':
      return renderIconList(slide, points, s, accent, bc, icons);
    case 'comparison-table':
      return renderComparisonTable(slide, points, s, accent, light, bc, tc, theme);
    case 'center-highlight':
      return renderCenterHighlight(slide, s, accent, light, bc);
    default:
      return renderDefaultBullets(slide, points, s, accent, bc, icons);
  }
}

// ─── Grid Cards ───
function renderGridCards(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, tc: string, icons: string[]) {
  const items = points.length > 0 ? points : ['항목 1', '항목 2', '항목 3'];
  const cols = items.length <= 3 ? items.length : Math.ceil(items.length / 2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols, 4)}, 1fr)`, gap: 5*s, flex: 1, alignContent: 'center' }}>
        {items.map((item, i) => {
          const icon = icons[i];
          const parts = item.split(/[:：](.+)/);
          const hasTitle = parts.length > 1 && parts[0].length < 20;
          return (
            <div key={i} style={{
              background: light,
              borderRadius: 6*s,
              padding: `${8*s}px ${6*s}px`,
              textAlign: 'center',
              border: `1px solid ${accent}25`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3*s,
            }}>
              <div style={{
                width: 22*s, height: 22*s, borderRadius: '50%',
                background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: icon ? 10*s : 9*s, color: accent, fontWeight: 700,
              }}>
                {icon || (i + 1)}
              </div>
              {hasTitle ? (
                <>
                  <div style={{ fontSize: 8*s, fontWeight: 600, color: tc, lineHeight: 1.3 }}>{parts[0].trim()}</div>
                  <div style={{ fontSize: 7*s, color: bc, lineHeight: 1.3, opacity: 0.8 }}>{parts[1].trim()}</div>
                </>
              ) : (
                <div style={{ fontSize: 8*s, color: tc, fontWeight: 500, lineHeight: 1.4 }}>{item}</div>
              )}
            </div>
          );
        })}
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Side by Side ───
function renderSideBySide(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, tc: string, theme: SlideTheme, icons: string[]) {
  const mid = Math.ceil(points.length / 2);
  const left = points.slice(0, mid);
  const right = points.slice(mid);
  const leftIcons = icons.slice(0, mid);
  const rightIcons = icons.slice(mid);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ display: 'flex', gap: 6*s, flex: 1 }}>
        <div style={{ flex: 1, background: light, borderRadius: 6*s, padding: `${6*s}px ${8*s}px`, border: `1px solid ${accent}20` }}>
          {left.map((p, i) => (
            <div key={i} style={{ fontSize: 8*s, color: bc, marginBottom: 4*s, display: 'flex', alignItems: 'flex-start', gap: 4*s }}>
              <span style={{ color: accent, fontSize: 8*s, flexShrink: 0 }}>{leftIcons[i] || '●'}</span>
              <span style={{ lineHeight: 1.4 }}>{p}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 1*s, background: theme.cardBorder, alignSelf: 'stretch' }} />
        <div style={{ flex: 1, background: light, borderRadius: 6*s, padding: `${6*s}px ${8*s}px`, border: `1px solid ${accent}20` }}>
          {right.map((p, i) => (
            <div key={i} style={{ fontSize: 8*s, color: bc, marginBottom: 4*s, display: 'flex', alignItems: 'flex-start', gap: 4*s }}>
              <span style={{ color: accent, fontSize: 8*s, flexShrink: 0 }}>{rightIcons[i] || '●'}</span>
              <span style={{ lineHeight: 1.4 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Hub & Spoke ───
function renderHubSpoke(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, tc: string, icons: string[]) {
  const items = points.length > 0 ? points.slice(0, 6) : ['A', 'B', 'C', 'D'];
  const cx = 280 * s, cy = 100 * s, r = 75 * s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* Center hub */}
        <div style={{ position: 'absolute', left: cx - 32*s, top: cy - 16*s, width: 64*s, height: 32*s, borderRadius: 6*s, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8*s, fontWeight: 700, boxShadow: `0 2px 8px ${accent}40` }}>
          핵심
        </div>
        {/* Spokes */}
        {items.map((item, i) => {
          const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
          const x = cx + Math.cos(angle) * r - 38*s;
          const y = cy + Math.sin(angle) * r - 13*s;
          const icon = icons[i];
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: y, width: 76*s, height: 26*s, borderRadius: 4*s, background: light, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3*s, fontSize: 7*s, color: tc, textAlign: 'center', padding: `0 ${3*s}px` }}>
              {icon && <span style={{ fontSize: 8*s, flexShrink: 0 }}>{icon}</span>}
              <span>{item.length > 18 ? item.slice(0, 18) + '…' : item}</span>
            </div>
          );
        })}
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Flow Horizontal ───
function renderFlowHorizontal(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, icons: string[]) {
  const items = points.length > 0 ? points.slice(0, 5) : ['Step 1', 'Step 2', 'Step 3'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2*s }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2*s }}>
            <div style={{
              background: i === 0 ? accent : light,
              color: i === 0 ? '#fff' : bc,
              borderRadius: 6*s,
              padding: `${6*s}px ${5*s}px`,
              fontSize: 7*s,
              textAlign: 'center',
              minWidth: 50*s,
              border: i === 0 ? 'none' : `1px solid ${accent}25`,
              fontWeight: i === 0 ? 600 : 400,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2*s,
            }}>
              {icons[i] && <span style={{ fontSize: 10*s }}>{icons[i]}</span>}
              <span>{item.length > 15 ? item.slice(0, 15) + '…' : item}</span>
            </div>
            {i < items.length - 1 && (
              <div style={{ color: accent, fontSize: 12*s, fontWeight: 700 }}>→</div>
            )}
          </div>
        ))}
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Flow Vertical ───
function renderFlowVertical(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, icons: string[]) {
  const items = points.length > 0 ? points.slice(0, 5) : ['Step 1', 'Step 2', 'Step 3'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2*s }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2*s }}>
            <div style={{
              background: i === 0 ? accent : light,
              color: i === 0 ? '#fff' : bc,
              borderRadius: 6*s,
              padding: `${4*s}px ${10*s}px`,
              fontSize: 8*s,
              textAlign: 'center',
              minWidth: 100*s,
              border: i === 0 ? 'none' : `1px solid ${accent}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4*s,
            }}>
              {icons[i] && <span style={{ fontSize: 9*s }}>{icons[i]}</span>}
              <span>{item}</span>
            </div>
            {i < items.length - 1 && (
              <div style={{ color: accent, fontSize: 10*s, fontWeight: 700 }}>↓</div>
            )}
          </div>
        ))}
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Timeline ───
function renderTimeline(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, icons: string[]) {
  const items = points.length > 0 ? points.slice(0, 5) : ['Phase 1', 'Phase 2', 'Phase 3'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
        {/* Timeline line */}
        <div style={{ position: 'absolute', left: 20*s, right: 20*s, top: '45%', height: 2*s, background: `${accent}40`, transform: 'translateY(-50%)' }} />
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', position: 'relative' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3*s }}>
              <div style={{
                width: 14*s, height: 14*s, borderRadius: '50%',
                background: accent, border: `2px solid ${accent}`,
                zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: icons[i] ? 7*s : 6*s, color: '#fff',
              }}>
                {icons[i] || (i + 1)}
              </div>
              <div style={{ fontSize: 7*s, color: bc, textAlign: 'center', maxWidth: 55*s, lineHeight: 1.3, background: light, borderRadius: 4*s, padding: `${3*s}px ${4*s}px` }}>
                {item.length > 20 ? item.slice(0, 20) + '…' : item}
              </div>
            </div>
          ))}
        </div>
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Icon List ───
function renderIconList(slide: SlideContent, points: string[], s: number, accent: string, bc: string, icons: string[]) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3*s, flex: 1 }}>
        {points.map((point, i) => {
          const icon = icons[i];
          const parts = point.split(/[:：](.+)/);
          const hasTitle = parts.length > 1 && parts[0].length < 20;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5*s }}>
              <div style={{
                width: 16*s, height: 16*s, borderRadius: '50%',
                background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1*s,
                fontSize: icon ? 8*s : 6*s, color: accent, fontWeight: 700,
              }}>
                {icon || '●'}
              </div>
              {hasTitle ? (
                <div style={{ lineHeight: 1.4 }}>
                  <span style={{ fontSize: 9*s, fontWeight: 600, color: bc }}>{parts[0].trim()}</span>
                  <span style={{ fontSize: 8*s, color: bc, opacity: 0.75 }}> {parts[1].trim()}</span>
                </div>
              ) : (
                <span style={{ fontSize: 9*s, color: bc, lineHeight: 1.4 }}>{point}</span>
              )}
            </div>
          );
        })}
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Comparison Table ───
function renderComparisonTable(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, tc: string, theme: SlideTheme) {
  const mid = Math.ceil(points.length / 2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ border: `1px solid ${accent}30`, borderRadius: 6*s, overflow: 'hidden', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: accent, padding: `${4*s}px` }}>
          <div style={{ color: '#fff', fontSize: 8*s, fontWeight: 600, textAlign: 'center' }}>항목 A</div>
          <div style={{ color: '#fff', fontSize: 8*s, fontWeight: 600, textAlign: 'center' }}>항목 B</div>
        </div>
        {points.slice(0, mid).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${accent}15` }}>
            <div style={{ padding: `${3*s}px ${5*s}px`, fontSize: 7*s, color: bc, borderRight: `1px solid ${accent}15` }}>
              {points[i] || ''}
            </div>
            <div style={{ padding: `${3*s}px ${5*s}px`, fontSize: 7*s, color: bc }}>
              {points[mid + i] || ''}
            </div>
          </div>
        ))}
      </div>
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Center Highlight ───
function renderCenterHighlight(slide: SlideContent, s: number, accent: string, light: string, bc: string) {
  const mainIcon = slide.iconHints?.[0] || (slide.chartType === 'pie' ? '📊' : slide.chartType === 'bar' ? '📈' : '💡');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 5*s }}>
      <div style={{
        width: 60*s, height: 60*s, borderRadius: '50%',
        background: light, border: `2px solid ${accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 16px ${accent}15`,
      }}>
        <span style={{ fontSize: 22*s }}>{mainIcon}</span>
      </div>
      {slide.keyMessage && (
        <div style={{ fontSize: 10*s, fontWeight: 700, color: accent, textAlign: 'center', maxWidth: 340*s }}>
          {slide.keyMessage}
        </div>
      )}
      {slide.bodyText && (
        <div style={{ fontSize: 8*s, color: bc, textAlign: 'center', maxWidth: 320*s, lineHeight: 1.5 }}>
          {slide.bodyText}
        </div>
      )}
      {/* Supporting bullet points around center */}
      {slide.bulletPoints && slide.bulletPoints.length > 0 && (
        <div style={{ display: 'flex', gap: 6*s, flexWrap: 'wrap', justifyContent: 'center', marginTop: 3*s }}>
          {slide.bulletPoints.slice(0, 4).map((bp, i) => (
            <div key={i} style={{
              background: light, borderRadius: 4*s, padding: `${3*s}px ${6*s}px`,
              fontSize: 7*s, color: bc, border: `1px solid ${accent}20`,
              display: 'flex', alignItems: 'center', gap: 3*s,
            }}>
              {slide.iconHints?.[i + 1] && <span style={{ fontSize: 8*s }}>{slide.iconHints[i + 1]}</span>}
              <span>{bp.length > 25 ? bp.slice(0, 25) + '…' : bp}</span>
            </div>
          ))}
        </div>
      )}
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Stack Vertical (layered architecture) ───
function renderStackVertical(slide: SlideContent, points: string[], s: number, accent: string, light: string, bc: string, tc: string, icons: string[]) {
  const layers = points.length > 0 ? points : ['Layer 1', 'Layer 2', 'Layer 3'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3*s, flex: 1, justifyContent: 'center' }}>
        {layers.map((layer, i) => (
          <div key={i} style={{
            background: i === 0 ? accent : light,
            color: i === 0 ? '#fff' : tc,
            borderRadius: 6*s,
            padding: `${5*s}px ${10*s}px`,
            fontSize: 9*s,
            fontWeight: i === 0 ? 600 : 400,
            textAlign: 'center',
            border: i === 0 ? 'none' : `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4*s,
          }}>
            {icons[i] && <span style={{ fontSize: 10*s }}>{icons[i]}</span>}
            <span>{layer}</span>
          </div>
        ))}
      </div>
      {slide.mermaidCode && (
        <div style={{ textAlign: 'center', fontSize: 9*s, color: accent, marginTop: 4*s }}>
          📊 다이어그램
        </div>
      )}
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

// ─── Default bullets ───
function renderDefaultBullets(slide: SlideContent, points: string[], s: number, accent: string, bc: string, icons: string[]) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderKeyMessage(slide.keyMessage, s, accent)}
      {points.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4*s, flex: 1 }}>
          {points.map((p, i) => {
            const icon = icons[i];
            const parts = p.split(/[:：](.+)/);
            const hasTitle = parts.length > 1 && parts[0].length < 20;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5*s }}>
                <div style={{
                  width: 14*s, height: 14*s, borderRadius: '50%',
                  background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1*s,
                  fontSize: icon ? 8*s : 5*s, color: accent, fontWeight: 700,
                }}>
                  {icon || '●'}
                </div>
                {hasTitle ? (
                  <div style={{ lineHeight: 1.4 }}>
                    <span style={{ fontSize: 9*s, fontWeight: 600, color: bc }}>{parts[0].trim()}</span>
                    <span style={{ fontSize: 8*s, color: bc, opacity: 0.75 }}> — {parts[1].trim()}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 9*s, color: bc, lineHeight: 1.5 }}>{p}</span>
                )}
              </div>
            );
          })}
        </div>
      ) : slide.bodyText ? (
        <div style={{ fontSize: 9*s, color: bc, lineHeight: 1.7 }}>{slide.bodyText}</div>
      ) : null}
      {renderSecondaryPoints(slide.secondaryPoints, s, bc, accent)}
    </div>
  );
}

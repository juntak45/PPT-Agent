import PptxGenJS from 'pptxgenjs';
import { FinalDeckPlan, SlideContent, CompositionVariant } from '../types';
import { getSlideLayout } from './templates';
import { SlideTheme, getThemeById, SLIDE_THEMES } from '../slideThemes';
import { mermaidToBuffer } from './mermaid';

const FONT_FAMILY = 'Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif';

// ─── CSS gradient parser ───
function parseGradientColors(css: string): [string, string] {
  const matches = css.match(/#[0-9a-fA-F]{6}/g);
  if (matches && matches.length >= 2) {
    return [matches[0].replace('#', ''), matches[1].replace('#', '')];
  }
  if (matches && matches.length === 1) {
    return [matches[0].replace('#', ''), matches[0].replace('#', '')];
  }
  return ['ffffff', 'f0f0f0'];
}

function hexStrip(color: string): string {
  return color.replace('#', '');
}

// ─── Guess composition (mirrors SlideRenderer logic) ───
function guessComposition(slide: SlideContent): CompositionVariant {
  if (slide.mermaidCode || slide.layout === 'diagram') return 'stack-vertical';
  if (slide.layout === 'two-column') return 'side-by-side';
  if (slide.layout === 'chart') return 'center-highlight';
  if (slide.bulletPoints && slide.bulletPoints.length <= 3) return 'grid-cards';
  if (slide.bulletPoints && slide.bulletPoints.length >= 6) return 'icon-list';
  return 'default';
}

// ─── Main generator ───
export async function generatePptx(plan: FinalDeckPlan): Promise<Buffer> {
  const pptx = new PptxGenJS();
  const theme = getThemeById(plan.meta.selectedThemeId || SLIDE_THEMES[0].id);

  pptx.author = 'PPT Agent';
  pptx.title = plan.meta.title;
  pptx.subject = plan.meta.subtitle || '';
  pptx.layout = 'LAYOUT_WIDE'; // 16:9

  // Title slide
  const titleSlide = pptx.addSlide();
  applyBackground(titleSlide, theme, true);
  applyDecorations(titleSlide, theme, true);

  titleSlide.addText(plan.meta.title, {
    x: 0.5, y: 1.5, w: 12.0, h: 1.5,
    fontSize: 36, fontFace: FONT_FAMILY, bold: true,
    align: 'center', color: 'ffffff',
  });

  if (plan.meta.subtitle) {
    titleSlide.addText(plan.meta.subtitle, {
      x: 0.5, y: 3.2, w: 12.0, h: 0.8,
      fontSize: 18, fontFace: FONT_FAMILY,
      align: 'center', color: 'ffffffCC',
    });
  }

  titleSlide.addText('1', {
    x: 12.0, y: 7.0, w: 0.7, h: 0.3,
    fontSize: 8, fontFace: 'monospace',
    align: 'right', color: 'ffffff50',
  });

  // Content slides
  const approvedSlides = plan.slides
    .map((slide) => slide.approved)
    .filter((slide): slide is SlideContent => Boolean(slide))
    .sort((a, b) => a.slideNumber - b.slideNumber);

  for (const slideContent of approvedSlides) {
    if (slideContent.slideNumber === 1 && slideContent.layout === 'title-slide') {
      continue;
    }
    const slide = pptx.addSlide();
    try {
      await applySlideContent(slide, slideContent, theme);
    } catch (err) {
      console.error(`[PPT] 슬라이드 ${slideContent.slideNumber} 렌더링 에러:`, err);
      // Fallback: 제목만 표시
      slide.addText(slideContent.title || `슬라이드 ${slideContent.slideNumber}`, {
        x: 0.5, y: 0.3, w: 12.0, h: 0.8,
        fontSize: 24, fontFace: FONT_FAMILY, bold: true,
        color: hexStrip(theme.titleColor),
      });
    }
  }

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return output as Buffer;
}

// ─── Background ───
function applyBackground(slide: PptxGenJS.Slide, theme: SlideTheme, isInverted: boolean) {
  const bgStr = isInverted ? theme.bgAlt : theme.bg;
  const [color1] = parseGradientColors(bgStr);
  slide.background = { fill: color1 };
}

// ─── Decorative elements ───
function applyDecorations(slide: PptxGenJS.Slide, theme: SlideTheme, isInverted: boolean) {
  const accentHex = hexStrip(theme.accent);

  // Top accent bar
  slide.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 0.06,
    fill: { color: accentHex },
    line: { width: 0 },
  });

  if (isInverted) {
    // Decorative circle top-right
    slide.addShape('ellipse', {
      x: 11.0, y: -0.8, w: 2.8, h: 2.8,
      fill: { color: 'ffffff', transparency: 94 },
      line: { width: 0 },
    });
    // Decorative circle bottom-left
    slide.addShape('ellipse', {
      x: -0.6, y: 5.8, w: 2.0, h: 2.0,
      fill: { color: 'ffffff', transparency: 96 },
      line: { width: 0 },
    });
  } else {
    // Left accent bar
    slide.addShape('rect', {
      x: 0, y: 0.06, w: 0.05, h: 1.0,
      fill: { color: accentHex },
      line: { width: 0 },
    });
  }
}

// ─── Slide number ───
function addSlideNumber(slide: PptxGenJS.Slide, num: number, theme: SlideTheme, isInverted: boolean) {
  slide.addText(String(num), {
    x: 12.0, y: 7.0, w: 0.7, h: 0.3,
    fontSize: 8, fontFace: 'monospace',
    align: 'right',
    color: isInverted ? 'ffffff50' : hexStrip(theme.slideNumColor),
  });
}

// ─── Key Message callout ───
function addKeyMessage(
  slide: PptxGenJS.Slide,
  keyMessage: string | undefined,
  x: number, y: number, w: number,
  accentHex: string,
): number {
  if (!keyMessage) return y;
  const h = 0.45;

  // Background with left accent border
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: accentHex, transparency: 90 },
    line: { color: `${accentHex}50`, width: 0.5 },
    rectRadius: 0.06,
  });
  // Left accent strip
  slide.addShape('rect', {
    x, y, w: 0.06, h,
    fill: { color: accentHex },
    line: { width: 0 },
  });
  slide.addText(`💡 ${keyMessage}`, {
    x: x + 0.15, y, w: w - 0.2, h,
    fontSize: 10, fontFace: FONT_FAMILY, bold: true,
    color: accentHex, valign: 'middle',
    wrap: true,
  });
  return y + h + 0.12;
}

// ─── SubTitle ───
function addSubTitle(
  slide: PptxGenJS.Slide,
  subTitle: string | undefined,
  x: number, y: number, w: number,
  bodyColor: string,
): number {
  if (!subTitle) return y;
  const h = 0.35;
  slide.addText(subTitle, {
    x, y, w, h,
    fontSize: 10, fontFace: FONT_FAMILY,
    color: bodyColor, valign: 'top',
    transparency: 20,
  });
  return y + h;
}

// ─── Footnote ───
function addFootnote(
  slide: PptxGenJS.Slide,
  footnote: string | undefined,
  x: number, w: number,
  bodyColor: string,
  accentHex: string,
) {
  if (!footnote) return;
  // Separator line
  slide.addShape('rect', {
    x, y: 6.8, w: w * 0.5, h: 0.01,
    fill: { color: accentHex, transparency: 80 },
    line: { width: 0 },
  });
  slide.addText(footnote, {
    x, y: 6.85, w, h: 0.25,
    fontSize: 7, fontFace: FONT_FAMILY,
    color: bodyColor, transparency: 50,
    valign: 'top',
  });
}

// ─── Secondary points ───
function addSecondaryPoints(
  slide: PptxGenJS.Slide,
  points: string[] | undefined,
  x: number, y: number, w: number,
  bodyColor: string,
  accentHex: string,
): number {
  if (!points || points.length === 0) return y;
  // Dashed separator
  slide.addShape('rect', {
    x, y, w: w * 0.4, h: 0.01,
    fill: { color: accentHex, transparency: 75 },
    line: { width: 0 },
  });
  y += 0.1;

  const lineH = 0.3;
  for (const p of points) {
    slide.addText(`› ${p}`, {
      x: x + 0.1, y, w: w - 0.1, h: lineH,
      fontSize: 9, fontFace: FONT_FAMILY,
      color: bodyColor, transparency: 30,
      valign: 'middle',
    });
    y += lineH;
  }
  return y;
}

// ─── Main slide content ───
async function applySlideContent(slide: PptxGenJS.Slide, content: SlideContent, theme: SlideTheme) {
  const isInverted = content.layout === 'title-slide' || content.layout === 'section-divider';

  applyBackground(slide, theme, isInverted);
  applyDecorations(slide, theme, isInverted);
  addSlideNumber(slide, content.slideNumber, theme, isInverted);

  const titleColor = isInverted ? 'ffffff' : hexStrip(theme.titleColor);
  const bodyColor = isInverted ? 'ffffffCC' : hexStrip(theme.bodyColor);
  const accentHex = hexStrip(theme.accent);

  // Title slide layout
  if (content.layout === 'title-slide') {
    // Accent line
    slide.addShape('rect', {
      x: 4.5, y: 2.5, w: 4.3, h: 0.05,
      fill: { color: accentHex },
      line: { width: 0 },
    });
    slide.addText(content.title, {
      x: 0.5, y: 2.7, w: 12.0, h: 1.5,
      fontSize: 32, fontFace: FONT_FAMILY, bold: true,
      align: 'center', color: titleColor,
    });
    if (content.subTitle) {
      slide.addText(content.subTitle, {
        x: 2.0, y: 4.2, w: 9.0, h: 0.6,
        fontSize: 14, fontFace: FONT_FAMILY,
        align: 'center', color: bodyColor,
      });
    }
    if (content.bodyText) {
      slide.addText(content.bodyText, {
        x: 2.0, y: content.subTitle ? 4.8 : 4.3, w: 9.0, h: 1.0,
        fontSize: 14, fontFace: FONT_FAMILY,
        align: 'center', color: bodyColor,
        lineSpacingMultiple: 1.5,
      });
    }
    if (content.speakerNotes) slide.addNotes(content.speakerNotes);
    return;
  }

  // Section divider layout
  if (content.layout === 'section-divider') {
    slide.addShape('rect', {
      x: 5.0, y: 3.0, w: 3.3, h: 0.05,
      fill: { color: accentHex },
      line: { width: 0 },
    });
    slide.addText(content.title, {
      x: 0.5, y: 3.2, w: 12.0, h: 1.5,
      fontSize: 28, fontFace: FONT_FAMILY, bold: true,
      align: 'center', color: titleColor,
    });
    if (content.subTitle) {
      slide.addText(content.subTitle, {
        x: 2.0, y: 4.8, w: 9.0, h: 0.6,
        fontSize: 14, fontFace: FONT_FAMILY,
        align: 'center', color: bodyColor, transparency: 30,
      });
    }
    if (content.speakerNotes) slide.addNotes(content.speakerNotes);
    return;
  }

  // Content slides: Title with accent underline
  const layout = getSlideLayout(content.layout);
  slide.addText(content.title, {
    x: layout.title.x, y: layout.title.y, w: layout.title.w, h: layout.title.h,
    fontSize: 22, fontFace: FONT_FAMILY, bold: true,
    color: titleColor, valign: 'bottom',
  });

  // Title underline
  slide.addShape('rect', {
    x: layout.title.x, y: layout.title.y + layout.title.h + 0.02,
    w: Math.min(layout.title.w * 0.5, 5.0), h: 0.04,
    fill: { color: accentHex },
    line: { width: 0 },
  });

  // SubTitle below title
  let contentY = layout.body.y;
  contentY = addSubTitle(slide, content.subTitle, layout.body.x, layout.title.y + layout.title.h + 0.12, layout.body.w, bodyColor);
  if (!content.subTitle) contentY = layout.body.y;

  // Mermaid diagram
  if (content.mermaidCode) {
    try {
      const imgBuf = await mermaidToBuffer(content.mermaidCode);
      const base64 = imgBuf.toString('base64');
      slide.addImage({
        data: `image/png;base64,${base64}`,
        x: layout.body.x, y: contentY,
        w: layout.body.w, h: layout.body.h - (contentY - layout.body.y),
        sizing: { type: 'contain', w: layout.body.w, h: layout.body.h - (contentY - layout.body.y) },
      });
    } catch {
      slide.addText('📊 다이어그램 (렌더링 실패)', {
        x: layout.body.x, y: contentY, w: layout.body.w, h: layout.body.h,
        fontSize: 14, fontFace: FONT_FAMILY, color: bodyColor,
        align: 'center', valign: 'middle',
      });
    }
    if (content.speakerNotes) slide.addNotes(content.speakerNotes);
    addFootnote(slide, content.footnote, layout.body.x, layout.body.w, bodyColor, accentHex);
    return;
  }

  // Chart
  if (content.chartType && content.chartData) {
    applyChart(slide, content, { ...layout.body, y: contentY, h: layout.body.h - (contentY - layout.body.y) }, theme);
    if (content.speakerNotes) slide.addNotes(content.speakerNotes);
    addFootnote(slide, content.footnote, layout.body.x, layout.body.w, bodyColor, accentHex);
    return;
  }

  // Composition-based content rendering
  const comp = content.composition || guessComposition(content);
  const adjustedBody = { ...layout.body, y: contentY, h: layout.body.h - (contentY - layout.body.y) };
  applyComposition(slide, content, comp, { ...layout, body: adjustedBody }, theme, titleColor, bodyColor, accentHex);

  if (content.speakerNotes) slide.addNotes(content.speakerNotes);
  addFootnote(slide, content.footnote, layout.body.x, layout.body.w, bodyColor, accentHex);
}

// ─── Chart rendering ───
function applyChart(
  slide: PptxGenJS.Slide,
  content: SlideContent,
  body: { x: number; y: number; w: number; h: number },
  theme: SlideTheme,
) {
  const data = content.chartData || {};
  const labels = (data.labels as string[]) || ['항목1', '항목2', '항목3'];
  const values = (data.values as number[]) || [30, 50, 20];

  const chartData = [{
    name: (data.seriesName as string) || '데이터',
    labels,
    values,
  }];

  const chartTypeMap: Record<string, PptxGenJS.CHART_NAME> = {
    bar: PptxGenJS.charts.BAR,
    pie: PptxGenJS.charts.PIE,
    line: PptxGenJS.charts.LINE,
  };

  const chartType = chartTypeMap[content.chartType || 'bar'] || PptxGenJS.charts.BAR;

  slide.addChart(chartType, chartData, {
    x: body.x, y: body.y, w: body.w, h: body.h,
    showTitle: false,
    showValue: true,
    chartColors: [hexStrip(theme.accent), hexStrip(theme.accentLight), hexStrip(theme.bodyColor)],
  });
}

// ─── Composition rendering (mirrors SlideRenderer.tsx) ───
function applyComposition(
  slide: PptxGenJS.Slide,
  content: SlideContent,
  comp: CompositionVariant,
  layout: ReturnType<typeof getSlideLayout>,
  theme: SlideTheme,
  titleColor: string,
  bodyColor: string,
  accentHex: string,
) {
  const points = content.bulletPoints || [];
  const body = layout.body;
  const secondary = layout.secondary;
  const lightHex = hexStrip(theme.accentLight);
  const icons = content.iconHints || [];

  // Key message first — shifts body down
  let bodyStartY = body.y;
  bodyStartY = addKeyMessage(slide, content.keyMessage, body.x, body.y, body.w, accentHex);
  const adjustedBody = { ...body, y: bodyStartY, h: body.h - (bodyStartY - body.y) };

  // Reserve space for secondary points at bottom
  const hasSecondary = content.secondaryPoints && content.secondaryPoints.length > 0;
  const secondaryH = hasSecondary ? 0.3 * content.secondaryPoints!.length + 0.15 : 0;
  const mainBody = { ...adjustedBody, h: adjustedBody.h - secondaryH };

  switch (comp) {
    case 'grid-cards':
      renderGridCards(slide, points, mainBody, accentHex, lightHex, titleColor, icons);
      break;
    case 'flow-horizontal':
      renderFlowHorizontal(slide, points, mainBody, accentHex, lightHex, bodyColor, icons);
      break;
    case 'flow-vertical':
      renderFlowVertical(slide, points, mainBody, accentHex, lightHex, bodyColor, icons);
      break;
    case 'hub-spoke':
      renderHubSpoke(slide, points, mainBody, accentHex, lightHex, titleColor, icons);
      break;
    case 'side-by-side':
      renderSideBySide(slide, points, mainBody, secondary, accentHex, lightHex, bodyColor, theme, icons);
      break;
    case 'timeline':
      renderTimeline(slide, points, mainBody, accentHex, lightHex, bodyColor, icons);
      break;
    case 'icon-list':
      renderIconList(slide, points, mainBody, accentHex, bodyColor, icons);
      break;
    case 'comparison-table':
      renderComparisonTable(slide, points, mainBody, accentHex, bodyColor);
      break;
    case 'center-highlight':
      renderCenterHighlight(slide, content, mainBody, accentHex, lightHex, bodyColor);
      break;
    case 'stack-vertical':
      renderStackVertical(slide, points, mainBody, accentHex, lightHex, titleColor, bodyColor, icons);
      break;
    default:
      renderDefault(slide, content, mainBody, accentHex, bodyColor, icons);
      break;
  }

  // Secondary points at the bottom
  if (hasSecondary) {
    addSecondaryPoints(slide, content.secondaryPoints, body.x, mainBody.y + mainBody.h + 0.05, body.w, bodyColor, accentHex);
  }
}

// ─── Grid Cards ───
function renderGridCards(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, light: string, titleColor: string, icons: string[],
) {
  const items = points.length > 0 ? points : ['항목 1', '항목 2', '항목 3'];
  const cols = Math.min(items.length <= 3 ? items.length : Math.ceil(items.length / 2), 4);
  const rows = Math.ceil(items.length / cols);
  const gap = 0.15;
  const cardW = (body.w - gap * (cols - 1)) / cols;
  const cardH = (body.h - gap * (rows - 1)) / rows;

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = body.x + col * (cardW + gap);
    const y = body.y + row * (cardH + gap);
    const icon = icons[i];

    // Card background
    slide.addShape('roundRect', {
      x, y, w: cardW, h: cardH,
      fill: { color: light },
      line: { color: `${accent}40`, width: 0.5 },
      rectRadius: 0.1,
    });

    // Icon/Number circle
    const circleSize = 0.4;
    slide.addShape('ellipse', {
      x: x + cardW / 2 - circleSize / 2,
      y: y + 0.15,
      w: circleSize, h: circleSize,
      fill: { color: accent, transparency: 85 },
      line: { width: 0 },
    });
    slide.addText(icon || String(i + 1), {
      x: x + cardW / 2 - circleSize / 2,
      y: y + 0.15,
      w: circleSize, h: circleSize,
      fontSize: icon ? 14 : 11, fontFace: FONT_FAMILY, bold: !icon,
      align: 'center', valign: 'middle',
      color: accent,
    });

    // Parse "Title: Description" format
    const parts = item.split(/[:：](.+)/);
    const hasTitle = parts.length > 1 && parts[0].length < 20;

    if (hasTitle) {
      slide.addText(parts[0].trim(), {
        x: x + 0.08, y: y + 0.6, w: cardW - 0.16, h: 0.3,
        fontSize: 11, fontFace: FONT_FAMILY, bold: true,
        align: 'center', color: titleColor,
      });
      slide.addText(parts[1].trim(), {
        x: x + 0.08, y: y + 0.9, w: cardW - 0.16, h: cardH - 1.05,
        fontSize: 9, fontFace: FONT_FAMILY,
        align: 'center', valign: 'top',
        color: titleColor, transparency: 25,
        lineSpacingMultiple: 1.2, wrap: true,
      });
    } else {
      slide.addText(item, {
        x: x + 0.08, y: y + 0.65, w: cardW - 0.16, h: cardH - 0.75,
        fontSize: 11, fontFace: FONT_FAMILY,
        align: 'center', valign: 'top',
        color: titleColor, lineSpacingMultiple: 1.3,
        wrap: true,
      });
    }
  });
}

// ─── Flow Horizontal ───
function renderFlowHorizontal(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, light: string, bodyColor: string, icons: string[],
) {
  const items = points.length > 0 ? points.slice(0, 5) : ['Step 1', 'Step 2', 'Step 3'];
  const arrowW = 0.3;
  const totalArrowW = arrowW * (items.length - 1);
  const gap = 0.1;
  const totalGap = gap * (items.length - 1) * 2;
  const boxW = (body.w - totalArrowW - totalGap) / items.length;
  const boxH = Math.min(body.h * 0.7, 1.8);
  const yCenter = body.y + (body.h - boxH) / 2;

  let cx = body.x;
  items.forEach((item, i) => {
    const fillColor = i === 0 ? accent : light;
    const textColor = i === 0 ? 'ffffff' : bodyColor;
    const icon = icons[i];

    slide.addShape('roundRect', {
      x: cx, y: yCenter, w: boxW, h: boxH,
      fill: { color: fillColor },
      line: i === 0 ? { width: 0 } : { color: `${accent}40`, width: 0.5 },
      rectRadius: 0.1,
    });

    // Icon in box
    if (icon) {
      slide.addText(icon, {
        x: cx, y: yCenter + 0.1, w: boxW, h: 0.35,
        fontSize: 16, align: 'center', valign: 'middle',
      });
      slide.addText(item.length > 25 ? item.slice(0, 25) + '…' : item, {
        x: cx + 0.05, y: yCenter + 0.45, w: boxW - 0.1, h: boxH - 0.55,
        fontSize: 10, fontFace: FONT_FAMILY,
        align: 'center', valign: 'top',
        color: textColor, wrap: true,
        fontWeight: i === 0 ? 'bold' : undefined,
      } as PptxGenJS.TextPropsOptions);
    } else {
      slide.addText(item.length > 25 ? item.slice(0, 25) + '…' : item, {
        x: cx, y: yCenter, w: boxW, h: boxH,
        fontSize: 11, fontFace: FONT_FAMILY,
        align: 'center', valign: 'middle',
        color: textColor, wrap: true,
        fontWeight: i === 0 ? 'bold' : undefined,
      } as PptxGenJS.TextPropsOptions);
    }

    cx += boxW + gap;

    if (i < items.length - 1) {
      slide.addText('→', {
        x: cx, y: yCenter, w: arrowW, h: boxH,
        fontSize: 18, fontFace: FONT_FAMILY, bold: true,
        align: 'center', valign: 'middle',
        color: accent,
      });
      cx += arrowW + gap;
    }
  });
}

// ─── Flow Vertical ───
function renderFlowVertical(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, light: string, bodyColor: string, icons: string[],
) {
  const items = points.length > 0 ? points.slice(0, 5) : ['Step 1', 'Step 2', 'Step 3'];
  const arrowH = 0.25;
  const gap = 0.05;
  const totalArrow = arrowH * (items.length - 1);
  const totalGap = gap * (items.length - 1) * 2;
  const boxH = (body.h - totalArrow - totalGap) / items.length;
  const boxW = Math.min(body.w * 0.7, 7.0);
  const xCenter = body.x + (body.w - boxW) / 2;

  let cy = body.y;
  items.forEach((item, i) => {
    const fillColor = i === 0 ? accent : light;
    const textColor = i === 0 ? 'ffffff' : bodyColor;
    const icon = icons[i];

    slide.addShape('roundRect', {
      x: xCenter, y: cy, w: boxW, h: boxH,
      fill: { color: fillColor },
      line: i === 0 ? { width: 0 } : { color: `${accent}40`, width: 0.5 },
      rectRadius: 0.1,
    });

    const displayText = icon ? `${icon} ${item}` : item;
    slide.addText(displayText, {
      x: xCenter, y: cy, w: boxW, h: boxH,
      fontSize: 12, fontFace: FONT_FAMILY,
      align: 'center', valign: 'middle',
      color: textColor, wrap: true,
    });

    cy += boxH + gap;

    if (i < items.length - 1) {
      slide.addText('↓', {
        x: xCenter, y: cy, w: boxW, h: arrowH,
        fontSize: 14, fontFace: FONT_FAMILY, bold: true,
        align: 'center', valign: 'middle',
        color: accent,
      });
      cy += arrowH + gap;
    }
  });
}

// ─── Hub & Spoke ───
function renderHubSpoke(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, light: string, titleColor: string, icons: string[],
) {
  const items = points.length > 0 ? points.slice(0, 6) : ['A', 'B', 'C', 'D'];

  // Center hub — larger circle
  const hubSize = 1.6;
  const centerX = body.x + body.w / 2;
  const centerY = body.y + body.h / 2;

  slide.addShape('ellipse', {
    x: centerX - hubSize / 2, y: centerY - hubSize / 2, w: hubSize, h: hubSize,
    fill: { color: accent },
    line: { width: 0 },
  });

  // Use first item as hub label, or generic
  const hubLabel = items.length > 0 ? items[0].split(/[:：]/)[0].trim().slice(0, 10) : '핵심';
  slide.addText(hubLabel, {
    x: centerX - hubSize / 2, y: centerY - hubSize / 2, w: hubSize, h: hubSize,
    fontSize: 13, fontFace: FONT_FAMILY, bold: true,
    align: 'center', valign: 'middle',
    color: 'ffffff',
  });

  // Spokes (skip first item if used as hub)
  const spokeItems = items.length > 1 ? items.slice(1) : items;
  const radiusX = body.w * 0.36;
  const radiusY = body.h * 0.38;
  const spokeW = 2.2;
  const spokeH = 0.6;

  spokeItems.forEach((item, i) => {
    const angle = (2 * Math.PI * i) / spokeItems.length - Math.PI / 2;
    const sx = centerX + Math.cos(angle) * radiusX;
    const sy = centerY + Math.sin(angle) * radiusY;
    const icon = icons[i + 1] || icons[i];

    // Connection line from hub to spoke
    slide.addShape('line', {
      x: centerX, y: centerY,
      w: sx - centerX, h: sy - centerY,
      line: { color: `${accent}40`, width: 1.5, dashType: 'solid' },
    });

    // Spoke card
    slide.addShape('roundRect', {
      x: sx - spokeW / 2, y: sy - spokeH / 2, w: spokeW, h: spokeH,
      fill: { color: light },
      line: { color: `${accent}40`, width: 0.8 },
      rectRadius: 0.08,
    });

    const displayText = icon ? `${icon} ${item}` : item;
    slide.addText(displayText.length > 35 ? displayText.slice(0, 35) + '…' : displayText, {
      x: sx - spokeW / 2, y: sy - spokeH / 2, w: spokeW, h: spokeH,
      fontSize: 10, fontFace: FONT_FAMILY,
      align: 'center', valign: 'middle',
      color: titleColor, wrap: true,
    });
  });
}

// ─── Side by Side ───
function renderSideBySide(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  secondary: { x: number; y: number; w: number; h: number } | undefined,
  accent: string, light: string, bodyColor: string, theme: SlideTheme, icons: string[],
) {
  const mid = Math.ceil(points.length / 2);
  const left = points.slice(0, mid);
  const right = points.slice(mid);
  const leftIcons = icons.slice(0, mid);
  const rightIcons = icons.slice(mid);

  const leftArea = { x: body.x, y: body.y, w: secondary ? body.w : body.w * 0.48, h: body.h };
  const rightArea = secondary || { x: body.x + body.w * 0.52, y: body.y, w: body.w * 0.48, h: body.h };

  // Left box
  slide.addShape('roundRect', {
    x: leftArea.x, y: leftArea.y, w: leftArea.w, h: leftArea.h,
    fill: { color: light },
    line: { color: `${accent}30`, width: 0.5 },
    rectRadius: 0.1,
  });

  if (left.length > 0) {
    slide.addText(
      left.map((p, idx) => ({
        text: `${leftIcons[idx] || '●'} ${p}`,
        options: { fontSize: 12, fontFace: FONT_FAMILY, color: bodyColor, bullet: false },
      })),
      {
        x: leftArea.x + 0.15, y: leftArea.y + 0.15,
        w: leftArea.w - 0.3, h: leftArea.h - 0.3,
        valign: 'top', lineSpacingMultiple: 1.5,
      }
    );
  }

  // Divider
  const divX = leftArea.x + leftArea.w + 0.03;
  slide.addShape('rect', {
    x: divX, y: body.y + 0.3, w: 0.015, h: body.h - 0.6,
    fill: { color: hexStrip(theme.cardBorder) },
    line: { width: 0 },
  });

  // Right box
  slide.addShape('roundRect', {
    x: rightArea.x, y: rightArea.y, w: rightArea.w, h: rightArea.h,
    fill: { color: light },
    line: { color: `${accent}30`, width: 0.5 },
    rectRadius: 0.1,
  });

  if (right.length > 0) {
    slide.addText(
      right.map((p, idx) => ({
        text: `${rightIcons[idx] || '●'} ${p}`,
        options: { fontSize: 12, fontFace: FONT_FAMILY, color: bodyColor, bullet: false },
      })),
      {
        x: rightArea.x + 0.15, y: rightArea.y + 0.15,
        w: rightArea.w - 0.3, h: rightArea.h - 0.3,
        valign: 'top', lineSpacingMultiple: 1.5,
      }
    );
  }
}

// ─── Timeline ───
function renderTimeline(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, light: string, bodyColor: string, icons: string[],
) {
  const items = points.length > 0 ? points.slice(0, 5) : ['Phase 1', 'Phase 2', 'Phase 3'];
  const lineY = body.y + body.h * 0.35;

  // Timeline line — thicker, more visible
  slide.addShape('rect', {
    x: body.x + 0.5, y: lineY, w: body.w - 1.0, h: 0.04,
    fill: { color: accent },
    line: { width: 0 },
  });

  const spacing = (body.w - 1.0) / (items.length - 1 || 1);
  const dotSize = 0.35;
  const labelW = Math.min(spacing * 0.88, 2.2);

  items.forEach((item, i) => {
    const x = body.x + 0.5 + i * spacing;
    const icon = icons[i];

    // Milestone dot — larger, accent filled
    slide.addShape('ellipse', {
      x: x - dotSize / 2, y: lineY - dotSize / 2 + 0.02,
      w: dotSize, h: dotSize,
      fill: { color: accent },
      line: { color: 'ffffff', width: 2 },
    });

    // Icon/number in dot
    slide.addText(icon || String(i + 1), {
      x: x - dotSize / 2, y: lineY - dotSize / 2 + 0.02,
      w: dotSize, h: dotSize,
      fontSize: icon ? 12 : 10, align: 'center', valign: 'middle',
      color: 'ffffff', bold: true,
    });

    // Label card — split title and description
    const parts = item.split(/[:：](.+)/);
    const hasTitle = parts.length > 1 && parts[0].length < 20;
    const cardH = hasTitle ? 0.9 : 0.7;

    slide.addShape('roundRect', {
      x: x - labelW / 2, y: lineY + 0.35,
      w: labelW, h: cardH,
      fill: { color: light },
      line: { color: `${accent}30`, width: 0.5 },
      rectRadius: 0.06,
    });

    if (hasTitle) {
      slide.addText(parts[0].trim(), {
        x: x - labelW / 2 + 0.05, y: lineY + 0.38,
        w: labelW - 0.1, h: 0.3,
        fontSize: 11, fontFace: FONT_FAMILY, bold: true,
        align: 'center', valign: 'middle', color: accent,
      });
      slide.addText(parts[1].trim().slice(0, 40), {
        x: x - labelW / 2 + 0.05, y: lineY + 0.65,
        w: labelW - 0.1, h: cardH - 0.35,
        fontSize: 9, fontFace: FONT_FAMILY,
        align: 'center', valign: 'top',
        color: bodyColor, wrap: true,
      });
    } else {
      slide.addText(item.length > 35 ? item.slice(0, 35) + '…' : item, {
        x: x - labelW / 2, y: lineY + 0.35,
        w: labelW, h: cardH,
        fontSize: 10, fontFace: FONT_FAMILY,
        align: 'center', valign: 'middle',
        color: bodyColor, wrap: true,
      });
    }
  });
}

// ─── Icon List ───
function renderIconList(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, bodyColor: string, icons: string[],
) {
  const items = points.length > 0 ? points : ['항목 1'];
  const lineH = Math.min(body.h / items.length, 0.55);
  const circleSize = 0.28;

  items.forEach((item, i) => {
    const y = body.y + i * lineH;
    const icon = icons[i];

    // Icon circle
    slide.addShape('ellipse', {
      x: body.x, y: y + (lineH - circleSize) / 2,
      w: circleSize, h: circleSize,
      fill: { color: accent, transparency: 85 },
      line: { width: 0 },
    });
    slide.addText(icon || '●', {
      x: body.x, y: y + (lineH - circleSize) / 2,
      w: circleSize, h: circleSize,
      fontSize: icon ? 12 : 8, align: 'center', valign: 'middle',
      color: accent,
    });

    // Parse "Title: Description" format
    const parts = item.split(/[:：](.+)/);
    const hasTitle = parts.length > 1 && parts[0].length < 20;

    if (hasTitle) {
      slide.addText([
        { text: parts[0].trim(), options: { fontSize: 13, fontFace: FONT_FAMILY, bold: true, color: bodyColor } },
        { text: ` — ${parts[1].trim()}`, options: { fontSize: 11, fontFace: FONT_FAMILY, color: bodyColor, transparency: 25 } },
      ], {
        x: body.x + 0.4, y,
        w: body.w - 0.4, h: lineH,
        valign: 'middle',
      });
    } else {
      slide.addText(item, {
        x: body.x + 0.4, y,
        w: body.w - 0.4, h: lineH,
        fontSize: 13, fontFace: FONT_FAMILY,
        color: bodyColor, valign: 'middle',
      });
    }
  });
}

// ─── Comparison Table ───
function renderComparisonTable(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, bodyColor: string,
) {
  const mid = Math.ceil(points.length / 2);
  const rows: PptxGenJS.TableRow[] = [];

  // Infer header labels from first items
  const headerA = points[0]?.split(/[:：]/)[0]?.trim().slice(0, 15) || 'AS-IS';
  const headerB = points[mid]?.split(/[:：]/)[0]?.trim().slice(0, 15) || 'TO-BE';

  // Header row
  rows.push([
    { text: headerA, options: { fill: { color: accent }, color: 'ffffff', fontSize: 12, fontFace: FONT_FAMILY, bold: true, align: 'center', valign: 'middle', margin: [4, 8, 4, 8] } },
    { text: headerB, options: { fill: { color: accent }, color: 'ffffff', fontSize: 12, fontFace: FONT_FAMILY, bold: true, align: 'center', valign: 'middle', margin: [4, 8, 4, 8] } },
  ]);

  // Data rows with alternating colors
  for (let i = 0; i < mid; i++) {
    const isEven = i % 2 === 0;
    const rowBg = isEven ? `${accent}08` : `${accent}03`;
    rows.push([
      { text: points[i] || '', options: { fontSize: 11, fontFace: FONT_FAMILY, color: bodyColor, valign: 'middle', fill: { color: rowBg }, margin: [4, 8, 4, 8] } },
      { text: points[mid + i] || '', options: { fontSize: 11, fontFace: FONT_FAMILY, color: bodyColor, valign: 'middle', fill: { color: rowBg }, margin: [4, 8, 4, 8] } },
    ]);
  }

  const rowH = Math.min(body.h / (mid + 1), 0.7);
  slide.addTable(rows, {
    x: body.x + 0.2, y: body.y, w: body.w - 0.4,
    colW: [(body.w - 0.4) / 2, (body.w - 0.4) / 2],
    border: { color: `${accent}25`, pt: 0.5 },
    rowH,
  });
}

// ─── Center Highlight ───
function renderCenterHighlight(
  slide: PptxGenJS.Slide, content: SlideContent,
  body: { x: number; y: number; w: number; h: number },
  accent: string, light: string, bodyColor: string,
) {
  const mainIcon = content.iconHints?.[0] || (content.chartType === 'pie' ? '📊' : content.chartType === 'bar' ? '📈' : '💡');
  const circleSize = 1.8;
  const cx = body.x + body.w / 2 - circleSize / 2;
  const cy = body.y + body.h * 0.1;

  slide.addShape('ellipse', {
    x: cx, y: cy, w: circleSize, h: circleSize,
    fill: { color: light },
    line: { color: `${accent}60`, width: 1 },
  });

  slide.addText(mainIcon, {
    x: cx, y: cy, w: circleSize, h: circleSize,
    fontSize: 28, align: 'center', valign: 'middle',
  });

  let textY = cy + circleSize + 0.2;

  // Key message as main text
  if (content.keyMessage) {
    slide.addText(content.keyMessage, {
      x: body.x + 1.0, y: textY,
      w: body.w - 2.0, h: 0.5,
      fontSize: 14, fontFace: FONT_FAMILY, bold: true,
      align: 'center', valign: 'middle',
      color: accent,
    });
    textY += 0.55;
  }

  if (content.bodyText) {
    slide.addText(content.bodyText, {
      x: body.x + 1.0, y: textY,
      w: body.w - 2.0, h: 1.0,
      fontSize: 12, fontFace: FONT_FAMILY,
      align: 'center', valign: 'top',
      color: bodyColor, lineSpacingMultiple: 1.5,
      wrap: true,
    });
    textY += 1.05;
  }

  // Supporting bullet chips
  if (content.bulletPoints && content.bulletPoints.length > 0) {
    const chipW = Math.min((body.w - 1.0) / Math.min(content.bulletPoints.length, 4), 2.8);
    const totalChipW = chipW * Math.min(content.bulletPoints.length, 4) + 0.15 * (Math.min(content.bulletPoints.length, 4) - 1);
    let chipX = body.x + (body.w - totalChipW) / 2;

    content.bulletPoints.slice(0, 4).forEach((bp, idx) => {
      const icon = content.iconHints?.[idx + 1];
      slide.addShape('roundRect', {
        x: chipX, y: textY, w: chipW, h: 0.45,
        fill: { color: light },
        line: { color: `${accent}30`, width: 0.5 },
        rectRadius: 0.06,
      });
      const displayText = icon ? `${icon} ${bp}` : bp;
      slide.addText(displayText.length > 22 ? displayText.slice(0, 22) + '…' : displayText, {
        x: chipX, y: textY, w: chipW, h: 0.45,
        fontSize: 9, fontFace: FONT_FAMILY,
        align: 'center', valign: 'middle',
        color: bodyColor,
      });
      chipX += chipW + 0.15;
    });
  }
}

// ─── Stack Vertical ───
function renderStackVertical(
  slide: PptxGenJS.Slide, points: string[],
  body: { x: number; y: number; w: number; h: number },
  accent: string, light: string, titleColor: string, bodyColor: string, icons: string[],
) {
  const layers = points.length > 0 ? points : ['Layer 1', 'Layer 2', 'Layer 3'];
  const gap = 0.1;
  const layerH = (body.h - gap * (layers.length - 1)) / layers.length;

  layers.forEach((layer, i) => {
    const y = body.y + i * (layerH + gap);
    const fillColor = i === 0 ? accent : light;
    const textColor = i === 0 ? 'ffffff' : titleColor;
    const icon = icons[i];

    slide.addShape('roundRect', {
      x: body.x + 0.5, y, w: body.w - 1.0, h: layerH,
      fill: { color: fillColor },
      line: i === 0 ? { width: 0 } : { color: `${accent}40`, width: 0.5 },
      rectRadius: 0.1,
    });

    const displayText = icon ? `${icon} ${layer}` : layer;
    slide.addText(displayText, {
      x: body.x + 0.5, y, w: body.w - 1.0, h: layerH,
      fontSize: 13, fontFace: FONT_FAMILY,
      align: 'center', valign: 'middle',
      color: textColor, wrap: true,
      fontWeight: i === 0 ? 'bold' : undefined,
    } as PptxGenJS.TextPropsOptions);
  });
}

// ─── Default bullets ───
function renderDefault(
  slide: PptxGenJS.Slide, content: SlideContent,
  body: { x: number; y: number; w: number; h: number },
  accent: string, bodyColor: string, icons: string[],
) {
  if (content.bulletPoints && content.bulletPoints.length > 0) {
    const lineH = Math.min(body.h / content.bulletPoints.length, 0.6);
    const circleSize = 0.25;

    content.bulletPoints.forEach((bp, i) => {
      const y = body.y + i * lineH;
      const icon = icons[i];

      // Icon circle
      slide.addShape('ellipse', {
        x: body.x, y: y + (lineH - circleSize) / 2,
        w: circleSize, h: circleSize,
        fill: { color: accent, transparency: 85 },
        line: { width: 0 },
      });
      slide.addText(icon || '●', {
        x: body.x, y: y + (lineH - circleSize) / 2,
        w: circleSize, h: circleSize,
        fontSize: icon ? 11 : 7, align: 'center', valign: 'middle',
        color: accent,
      });

      // Parse "Title: Description"
      const parts = bp.split(/[:：](.+)/);
      const hasTitle = parts.length > 1 && parts[0].length < 20;

      if (hasTitle) {
        slide.addText([
          { text: parts[0].trim(), options: { fontSize: 14, fontFace: FONT_FAMILY, bold: true, color: bodyColor } },
          { text: ` — ${parts[1].trim()}`, options: { fontSize: 12, fontFace: FONT_FAMILY, color: bodyColor, transparency: 25 } },
        ], {
          x: body.x + 0.4, y,
          w: body.w - 0.4, h: lineH,
          valign: 'middle',
        });
      } else {
        slide.addText(bp, {
          x: body.x + 0.4, y,
          w: body.w - 0.4, h: lineH,
          fontSize: 14, fontFace: FONT_FAMILY,
          color: bodyColor, valign: 'middle',
        });
      }
    });
  } else if (content.bodyText) {
    slide.addText(content.bodyText, {
      x: body.x, y: body.y, w: body.w, h: body.h,
      fontSize: 14, fontFace: FONT_FAMILY,
      color: bodyColor, valign: 'top',
      lineSpacingMultiple: 1.5,
    });
  }
}

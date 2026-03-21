import { SlideLayoutBlueprint, SlideShape, ReferenceThemeInfo } from '../types';

// PPTX uses EMU (English Metric Units). 1 inch = 914400 EMU
// Standard slide: 10" x 7.5" = 9144000 x 6858000 EMU
const SLIDE_WIDTH_EMU = 9144000;
const SLIDE_HEIGHT_EMU = 6858000;

function emuToPercent(emu: number, total: number): number {
  return Math.round((emu / total) * 1000) / 10; // 1 decimal
}

function extractAttr(xml: string, tag: string, attr: string): number {
  const regex = new RegExp(`<${tag}[^>]*\\s${attr}="(\\d+)"`, 'i');
  const match = xml.match(regex);
  return match ? parseInt(match[1], 10) : 0;
}

function getShapeType(spXml: string): SlideShape['type'] {
  if (/<c:chart/i.test(spXml) || /<a:chart/i.test(spXml) || /<c:barChart|<c:pieChart|<c:lineChart/i.test(spXml)) return 'chart';
  if (/<a:tbl>/i.test(spXml) || /<a:tr>/i.test(spXml)) return 'table';
  if (/<dgm:|<a:graphic.*dgm/i.test(spXml)) return 'diagram';
  if (/<p:pic>|<a:blip/i.test(spXml)) return 'image';
  if (/<p:grpSp>/i.test(spXml)) return 'group';
  if (/<p:sp>[\s\S]*?<a:t>/i.test(spXml)) return 'textbox';
  if (/<p:sp>/i.test(spXml)) return 'shape';
  return 'other';
}

function getShapeName(spXml: string): string {
  const match = spXml.match(/<p:cNvPr[^>]*\sname="([^"]*)"/i)
    || spXml.match(/<p:cNvPr[^>]*\sdescr="([^"]*)"/i);
  return match ? match[1] : '';
}

function getShapeText(spXml: string): string {
  const matches = spXml.match(/<a:t>(.*?)<\/a:t>/g);
  if (!matches) return '';
  const full = matches.map((m) => m.replace(/<\/?a:t>/g, '')).join(' ');
  return full.length > 80 ? full.slice(0, 80) + '...' : full;
}

function getChartSubType(spXml: string): string | undefined {
  const chartTypes = ['barChart', 'bar3DChart', 'pieChart', 'pie3DChart', 'lineChart', 'areaChart', 'scatterChart', 'doughnutChart', 'radarChart'];
  for (const ct of chartTypes) {
    if (spXml.includes(`<c:${ct}`)) return ct;
  }
  return undefined;
}

function countGroupChildren(spXml: string): number | undefined {
  const matches = spXml.match(/<p:sp>/g);
  return matches ? matches.length : undefined;
}

function extractFillColor(spXml: string): string | undefined {
  // <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
  const solidMatch = spXml.match(/<a:solidFill>\s*<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
  if (solidMatch) return `#${solidMatch[1]}`;

  // <a:solidFill><a:schemeClr val="accent1"/></a:solidFill> — skip scheme colors (resolved later from theme)
  return undefined;
}

function extractFontFace(spXml: string): string | undefined {
  // <a:latin typeface="맑은 고딕"/> or <a:ea typeface="맑은 고딕"/>
  const latinMatch = spXml.match(/<a:latin\s+typeface="([^"]+)"/);
  if (latinMatch && latinMatch[1] !== '+mj-lt' && latinMatch[1] !== '+mn-lt') return latinMatch[1];
  const eaMatch = spXml.match(/<a:ea\s+typeface="([^"]+)"/);
  if (eaMatch && eaMatch[1] !== '+mj-ea' && eaMatch[1] !== '+mn-ea') return eaMatch[1];
  return undefined;
}

function extractFontSize(spXml: string): number | undefined {
  // <a:sz val="2400"/> → 24pt (val is in hundredths of a point)
  const match = spXml.match(/<a:sz\s+val="(\d+)"/);
  if (match) return Math.round(parseInt(match[1], 10) / 100);
  return undefined;
}

interface ShapeBlock {
  xml: string;
  offX: number;
  offY: number;
  extCx: number;
  extCy: number;
}

function extractShapeBlocks(slideXml: string): ShapeBlock[] {
  const blocks: ShapeBlock[] = [];

  // Extract individual shapes <p:sp>...</p:sp>
  const spRegex = /<p:sp>[\s\S]*?<\/p:sp>/g;
  let m;
  while ((m = spRegex.exec(slideXml)) !== null) {
    const xml = m[0];
    blocks.push({
      xml,
      offX: extractAttr(xml, 'a:off', 'x'),
      offY: extractAttr(xml, 'a:off', 'y'),
      extCx: extractAttr(xml, 'a:ext', 'cx'),
      extCy: extractAttr(xml, 'a:ext', 'cy'),
    });
  }

  // Extract pictures <p:pic>...</p:pic>
  const picRegex = /<p:pic>[\s\S]*?<\/p:pic>/g;
  while ((m = picRegex.exec(slideXml)) !== null) {
    const xml = m[0];
    blocks.push({
      xml,
      offX: extractAttr(xml, 'a:off', 'x'),
      offY: extractAttr(xml, 'a:off', 'y'),
      extCx: extractAttr(xml, 'a:ext', 'cx'),
      extCy: extractAttr(xml, 'a:ext', 'cy'),
    });
  }

  // Extract group shapes <p:grpSp>...</p:grpSp>
  const grpRegex = /<p:grpSp>[\s\S]*?<\/p:grpSp>/g;
  while ((m = grpRegex.exec(slideXml)) !== null) {
    const xml = m[0];
    blocks.push({
      xml,
      offX: extractAttr(xml, 'a:off', 'x'),
      offY: extractAttr(xml, 'a:off', 'y'),
      extCx: extractAttr(xml, 'a:ext', 'cx'),
      extCy: extractAttr(xml, 'a:ext', 'cy'),
    });
  }

  // Extract graphicFrame (charts, tables, diagrams) <p:graphicFrame>...</p:graphicFrame>
  const gfRegex = /<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g;
  while ((m = gfRegex.exec(slideXml)) !== null) {
    const xml = m[0];
    blocks.push({
      xml,
      offX: extractAttr(xml, 'a:off', 'x'),
      offY: extractAttr(xml, 'a:off', 'y'),
      extCx: extractAttr(xml, 'a:ext', 'cx'),
      extCy: extractAttr(xml, 'a:ext', 'cy'),
    });
  }

  return blocks;
}

function blockToShape(block: ShapeBlock): SlideShape {
  const type = getShapeType(block.xml);
  const shape: SlideShape = {
    type,
    name: getShapeName(block.xml),
    position: {
      x: emuToPercent(block.offX, SLIDE_WIDTH_EMU),
      y: emuToPercent(block.offY, SLIDE_HEIGHT_EMU),
      w: emuToPercent(block.extCx, SLIDE_WIDTH_EMU),
      h: emuToPercent(block.extCy, SLIDE_HEIGHT_EMU),
    },
  };

  const text = getShapeText(block.xml);
  if (text) shape.text = text;

  if (type === 'chart') shape.subType = getChartSubType(block.xml);
  if (type === 'group') shape.childCount = countGroupChildren(block.xml);

  const fillColor = extractFillColor(block.xml);
  if (fillColor) shape.fillColor = fillColor;

  const fontFace = extractFontFace(block.xml);
  if (fontFace) shape.fontFace = fontFace;

  const fontSize = extractFontSize(block.xml);
  if (fontSize) shape.fontSize = fontSize;

  return shape;
}

function summarizeComposition(shapes: SlideShape[]): string {
  if (shapes.length === 0) return '빈 슬라이드';

  const significant = shapes.filter((s) => s.position.w > 10 && s.position.h > 10);
  if (significant.length === 0) return '소형 요소만 배치';

  const types = significant.map((s) => s.type);
  const hasText = types.includes('textbox');
  const hasImage = types.includes('image');
  const hasChart = types.includes('chart');
  const hasTable = types.includes('table');
  const hasDiagram = types.includes('diagram');

  // Check spatial arrangement
  const leftItems = significant.filter((s) => s.position.x + s.position.w / 2 < 50);
  const rightItems = significant.filter((s) => s.position.x + s.position.w / 2 >= 50);
  const isTwoColumn = leftItems.length > 0 && rightItems.length > 0
    && leftItems.some((s) => s.position.w < 60) && rightItems.some((s) => s.position.w < 60);

  const parts: string[] = [];

  if (isTwoColumn) {
    const leftTypes = [...new Set(leftItems.map((s) => typeToKo(s.type)))];
    const rightTypes = [...new Set(rightItems.map((s) => typeToKo(s.type)))];
    parts.push(`좌측(${leftTypes.join('+')}) + 우측(${rightTypes.join('+')})`);
  } else {
    if (hasText) parts.push('텍스트');
    if (hasImage) parts.push('이미지');
    if (hasChart) parts.push('차트');
    if (hasTable) parts.push('표');
    if (hasDiagram) parts.push('다이어그램');

    if (significant.length === 1 && significant[0].position.w > 70) {
      parts.unshift('전체 영역');
    }
  }

  return parts.join(' + ') || `${significant.length}개 요소`;
}

function typeToKo(type: SlideShape['type']): string {
  const map: Record<string, string> = {
    textbox: '텍스트',
    image: '이미지',
    chart: '차트',
    table: '표',
    diagram: '다이어그램',
    shape: '도형',
    group: '그룹',
    other: '기타',
  };
  return map[type] || type;
}

/**
 * Extract detailed layout blueprints from PPTX slide XML.
 * Returns per-slide shape positions, types, and composition summaries.
 */
export async function extractPptxLayouts(buffer: Buffer): Promise<SlideLayoutBlueprint[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort();

  const blueprints: SlideLayoutBlueprint[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXml = await zip.files[slideFiles[i]].async('string');
    const blocks = extractShapeBlocks(slideXml);
    const shapes = blocks.map(blockToShape);

    // Also check for charts in separate chart XML files referenced by this slide
    const relsFile = slideFiles[i].replace('slides/', 'slides/_rels/') + '.rels';
    if (zip.files[relsFile]) {
      const relsXml = await zip.files[relsFile].async('string');
      const chartRefs = relsXml.match(/Target="\.\.\/charts\/chart\d+\.xml"/g);
      if (chartRefs) {
        for (const ref of chartRefs) {
          const chartPath = 'ppt/' + ref.match(/Target="\.\.\/(.+?)"/)?.[1];
          if (chartPath && zip.files[chartPath]) {
            const chartXml = await zip.files[chartPath].async('string');
            // Find the matching graphicFrame shape and update its subType
            const chartType = getChartSubType(chartXml);
            const chartShape = shapes.find((s) => s.type === 'chart' && !s.subType);
            if (chartShape && chartType) {
              chartShape.subType = chartType;
            }
          }
        }
      }
    }

    blueprints.push({
      slideNumber: i + 1,
      shapes,
      compositionSummary: summarizeComposition(shapes),
    });
  }

  return blueprints;
}

/**
 * Extract theme color scheme and fonts from ppt/theme/theme1.xml
 */
export async function extractPptxTheme(buffer: Buffer): Promise<ReferenceThemeInfo | undefined> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  const themeFile = Object.keys(zip.files).find((name) => name.match(/^ppt\/theme\/theme\d+\.xml$/));
  if (!themeFile) return undefined;

  const themeXml = await zip.files[themeFile].async('string');

  // Extract scheme colors: dk1, dk2, lt1, lt2, accent1-6
  const colorMap: Record<string, string> = {};
  const schemeColors = ['dk1', 'dk2', 'lt1', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];
  for (const name of schemeColors) {
    const regex = new RegExp(`<a:${name}>\\s*<a:srgbClr\\s+val="([A-Fa-f0-9]{6})"`, 'i');
    const match = themeXml.match(regex);
    if (match) colorMap[name] = `#${match[1]}`;
  }

  // Extract fonts: <a:majorFont><a:latin typeface="..."/><a:ea typeface="..."/>
  const majorLatinMatch = themeXml.match(/<a:majorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/);
  const minorLatinMatch = themeXml.match(/<a:minorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/);
  const majorEaMatch = themeXml.match(/<a:majorFont>[\s\S]*?<a:ea\s+typeface="([^"]+)"/);
  const minorEaMatch = themeXml.match(/<a:minorFont>[\s\S]*?<a:ea\s+typeface="([^"]+)"/);

  const fontHeading = majorEaMatch?.[1] || majorLatinMatch?.[1] || '';
  const fontBody = minorEaMatch?.[1] || minorLatinMatch?.[1] || '';

  // Detect background style from slide master
  let backgroundStyle = 'solid';
  const masterFile = Object.keys(zip.files).find((name) => name.match(/^ppt\/slideMasters\/slideMaster1\.xml$/));
  if (masterFile) {
    const masterXml = await zip.files[masterFile].async('string');
    if (masterXml.includes('<a:gradFill')) backgroundStyle = 'gradient';
    else if (masterXml.includes('<a:blipFill')) backgroundStyle = 'image';
  }

  const accentColors = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6']
    .map((k) => colorMap[k])
    .filter(Boolean) as string[];

  return {
    primaryColor: colorMap['dk1'] || '#000000',
    secondaryColor: colorMap['dk2'] || '#333333',
    accentColors,
    fontHeading,
    fontBody,
    backgroundStyle,
  };
}

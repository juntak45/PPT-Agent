import mammoth from 'mammoth';
import { SlideLayoutBlueprint, SlideShape } from '../types';

interface HtmlSection {
  tag: string;       // h1, h2, h3, p, ul, ol, table, etc.
  text: string;
  level?: number;    // heading level
  isBold?: boolean;
  listItems?: string[];
  tableRows?: string[][];
}

/**
 * Parse mammoth HTML output into structured sections.
 */
function parseHtmlSections(html: string): HtmlSection[] {
  const sections: HtmlSection[] = [];

  // Match block-level elements
  const blockRegex = /<(h[1-6]|p|ul|ol|table)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag.startsWith('h')) {
      const level = parseInt(tag[1]);
      const text = stripHtml(inner).trim();
      if (text) {
        sections.push({ tag, text, level });
      }
    } else if (tag === 'p') {
      const text = stripHtml(inner).trim();
      const isBold = /<strong>|<b>/i.test(inner);
      if (text) {
        sections.push({ tag, text, isBold });
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const items: string[] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li;
      while ((li = liRegex.exec(inner)) !== null) {
        const t = stripHtml(li[1]).trim();
        if (t) items.push(t);
      }
      if (items.length > 0) {
        sections.push({ tag, text: items.join('; '), listItems: items });
      }
    } else if (tag === 'table') {
      const rows: string[][] = [];
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let tr;
      while ((tr = trRegex.exec(inner)) !== null) {
        const cells: string[] = [];
        const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let td;
        while ((td = tdRegex.exec(tr[1])) !== null) {
          cells.push(stripHtml(td[1]).trim());
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length > 0) {
        sections.push({
          tag,
          text: rows.map(r => r.join(' | ')).join('\n'),
          tableRows: rows,
        });
      }
    }
  }

  return sections;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

/**
 * Split sections into logical "pages" based on headings.
 * Each H1/H2 starts a new page.
 */
function splitIntoPages(sections: HtmlSection[]): HtmlSection[][] {
  const pages: HtmlSection[][] = [];
  let current: HtmlSection[] = [];

  for (const section of sections) {
    if (section.level && section.level <= 2 && current.length > 0) {
      pages.push(current);
      current = [];
    }
    current.push(section);
  }
  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

/**
 * Convert a page of sections into a SlideLayoutBlueprint.
 * Generates virtual layout positions based on content structure.
 */
function pageToBlueprint(sections: HtmlSection[], pageNum: number): SlideLayoutBlueprint {
  const shapes: SlideShape[] = [];
  let yPos = 5;

  for (const section of sections) {
    if (yPos > 95) break; // don't overflow

    if (section.level) {
      // Heading
      const h = section.level <= 2 ? 10 : 7;
      shapes.push({
        type: 'textbox',
        name: section.level <= 2 ? 'title' : 'subtitle',
        position: {
          x: 5,
          y: yPos,
          w: 90,
          h,
        },
        text: section.text.slice(0, 80),
      });
      yPos += h + 2;
    } else if (section.tableRows) {
      // Table
      const h = Math.min(30, 5 + section.tableRows.length * 5);
      shapes.push({
        type: 'table',
        name: 'table',
        position: {
          x: 5,
          y: yPos,
          w: 90,
          h,
        },
        text: `${section.tableRows.length}행 x ${section.tableRows[0]?.length || 0}열 테이블`,
      });
      yPos += h + 3;
    } else if (section.listItems) {
      // List
      const h = Math.min(25, 3 + section.listItems.length * 4);
      shapes.push({
        type: 'textbox',
        name: 'bullet-list',
        position: {
          x: 8,
          y: yPos,
          w: 84,
          h,
        },
        text: section.listItems.slice(0, 3).join('; ').slice(0, 80),
      });
      yPos += h + 2;
    } else if (section.isBold) {
      // Bold paragraph = sub-heading
      shapes.push({
        type: 'textbox',
        name: 'emphasis',
        position: {
          x: 5,
          y: yPos,
          w: 90,
          h: 6,
        },
        text: section.text.slice(0, 80),
      });
      yPos += 8;
    } else {
      // Normal paragraph
      const textLen = section.text.length;
      const h = Math.min(15, Math.max(5, Math.ceil(textLen / 80) * 4));
      shapes.push({
        type: 'textbox',
        name: 'body-text',
        position: {
          x: 5,
          y: yPos,
          w: 90,
          h,
        },
        text: section.text.slice(0, 80),
      });
      yPos += h + 2;
    }
  }

  // Build composition summary
  const headings = sections.filter(s => s.level);
  const tables = sections.filter(s => s.tableRows);
  const lists = sections.filter(s => s.listItems);
  const parts: string[] = [];
  if (headings.length > 0) parts.push(`제목 ${headings.length}개`);
  if (tables.length > 0) parts.push(`테이블 ${tables.length}개`);
  if (lists.length > 0) parts.push(`리스트 ${lists.length}개`);
  const bodyCount = sections.filter(s => !s.level && !s.tableRows && !s.listItems).length;
  if (bodyCount > 0) parts.push(`본문 ${bodyCount}개`);

  return {
    slideNumber: pageNum,
    shapes,
    compositionSummary: parts.join(' + ') || '빈 페이지',
  };
}

/**
 * Extract layout blueprints from DOCX using mammoth HTML conversion.
 * Parses document structure (headings, lists, tables, bold text) to create
 * virtual layout blueprints comparable to PPTX/PDF extraction.
 */
export async function extractDocxLayouts(buffer: Buffer): Promise<SlideLayoutBlueprint[]> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  if (!html || html.trim().length < 20) {
    return [];
  }

  const sections = parseHtmlSections(html);
  if (sections.length === 0) return [];

  const pages = splitIntoPages(sections);

  const blueprints = pages.map((page, i) => pageToBlueprint(page, i + 1));

  console.log(`[DOCX Layout] ${blueprints.length}페이지, 총 shapes: ${blueprints.reduce((s, b) => s + b.shapes.length, 0)}개`);
  return blueprints;
}

/**
 * Extract writing style hints from DOCX HTML structure.
 * Returns a summary string that can be included in LLM analysis.
 */
export async function extractDocxStyleHints(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  const hints: string[] = [];

  // Check heading levels used
  const h1Count = (html.match(/<h1/gi) || []).length;
  const h2Count = (html.match(/<h2/gi) || []).length;
  const h3Count = (html.match(/<h3/gi) || []).length;
  if (h1Count > 0 || h2Count > 0 || h3Count > 0) {
    hints.push(`헤딩 구조: H1(${h1Count})개, H2(${h2Count})개, H3(${h3Count})개`);
  }

  // Check for tables
  const tableCount = (html.match(/<table/gi) || []).length;
  if (tableCount > 0) hints.push(`테이블 ${tableCount}개 포함`);

  // Check for lists
  const ulCount = (html.match(/<ul/gi) || []).length;
  const olCount = (html.match(/<ol/gi) || []).length;
  if (ulCount > 0 || olCount > 0) hints.push(`리스트: 순서없음(${ulCount})개, 순서(${olCount})개`);

  // Check for bold/emphasis usage
  const boldCount = (html.match(/<strong/gi) || []).length;
  const emCount = (html.match(/<em/gi) || []).length;
  if (boldCount > 0) hints.push(`볼드 강조 ${boldCount}회`);
  if (emCount > 0) hints.push(`이탤릭 강조 ${emCount}회`);

  return hints.join(', ') || '서식 정보 없음';
}

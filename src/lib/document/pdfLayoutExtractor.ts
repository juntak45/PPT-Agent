import { SlideLayoutBlueprint, SlideShape, ContentBlock, LlmProviderType, ProgressCallback } from '../types';
import { createLlmProvider } from '../llm/factory';
import { pdfPagesToImages } from './pdfToImage';

interface TextItem {
  str: string;
  // transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

interface TextBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize: number;
  fontName: string;
  itemCount: number;
}

/**
 * Group nearby text items into logical blocks.
 * Items that are close vertically and overlap horizontally are merged.
 */
function groupTextItems(items: TextItem[], pageHeight: number): TextBlock[] {
  if (items.length === 0) return [];

  // Convert items to normalized coordinates (top-left origin)
  const normalized = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => {
      const fontSize = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 12;
      return {
        x: item.transform[4],
        y: pageHeight - item.transform[5], // PDF uses bottom-left origin
        w: item.width,
        h: fontSize,
        text: item.str,
        fontSize,
        fontName: item.fontName,
      };
    });

  if (normalized.length === 0) return [];

  // Sort by y then x
  normalized.sort((a, b) => a.y - b.y || a.x - b.x);

  // Merge items into blocks (items within ~1.5x font height vertically and overlapping horizontally)
  const blocks: TextBlock[] = [];
  let current: TextBlock = { ...normalized[0], itemCount: 1 };

  for (let i = 1; i < normalized.length; i++) {
    const item = normalized[i];
    const verticalGap = item.y - (current.y + current.h);
    const horizontalOverlap =
      item.x < current.x + current.w + 50 && item.x + item.w > current.x - 50;

    if (verticalGap < current.fontSize * 1.8 && horizontalOverlap) {
      // Merge into current block
      const newX = Math.min(current.x, item.x);
      const newRight = Math.max(current.x + current.w, item.x + item.w);
      const newBottom = Math.max(current.y + current.h, item.y + item.h);
      current.x = newX;
      current.w = newRight - newX;
      current.h = newBottom - current.y;
      current.text += ' ' + item.text;
      current.itemCount++;
      // Use larger font size if found
      if (item.fontSize > current.fontSize) {
        current.fontSize = item.fontSize;
        current.fontName = item.fontName;
      }
    } else {
      blocks.push(current);
      current = { ...item, itemCount: 1 };
    }
  }
  blocks.push(current);

  return blocks;
}

/**
 * Determine shape type based on text block characteristics
 */
function classifyBlock(block: TextBlock, pageWidth: number, pageHeight: number): SlideShape['type'] {
  const relW = (block.w / pageWidth) * 100;
  const relH = (block.h / pageHeight) * 100;

  // Large font = likely title
  if (block.fontSize > 18 && block.itemCount <= 3) return 'textbox';
  // Very wide and tall = could be a table area
  if (relW > 60 && relH > 30 && block.itemCount > 10) return 'table';
  // Default to textbox
  return 'textbox';
}

function summarizeComposition(shapes: SlideShape[]): string {
  if (shapes.length === 0) return '빈 페이지';

  const significant = shapes.filter((s) => s.position.w > 10 && s.position.h > 5);
  if (significant.length === 0) return '소형 요소만 배치';

  const leftItems = significant.filter((s) => s.position.x + s.position.w / 2 < 50);
  const rightItems = significant.filter((s) => s.position.x + s.position.w / 2 >= 50);
  const isTwoColumn =
    leftItems.length > 0 &&
    rightItems.length > 0 &&
    leftItems.some((s) => s.position.w < 55) &&
    rightItems.some((s) => s.position.w < 55);

  if (isTwoColumn) return '좌우 2단 구성';

  const hasTitle = significant.some(
    (s) => s.position.y < 15 && s.text && s.text.length < 60
  );
  const bodyBlocks = significant.filter((s) => s.position.y >= 15);

  const parts: string[] = [];
  if (hasTitle) parts.push('제목');
  if (bodyBlocks.length > 0) parts.push(`본문 블록 ${bodyBlocks.length}개`);

  return parts.join(' + ') || `${significant.length}개 요소`;
}

/**
 * Extract layout blueprints from PDF pages.
 * Uses pdfjs-dist to get text item positions and groups them into logical blocks.
 */
export async function extractPdfLayouts(buffer: Buffer): Promise<SlideLayoutBlueprint[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;

  const blueprints: SlideLayoutBlueprint[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    const content = await page.getTextContent();
    const items: TextItem[] = content.items.filter(
      (item: { str?: string }) => typeof item.str === 'string'
    );

    const blocks = groupTextItems(items, pageHeight);

    const shapes: SlideShape[] = blocks
      .filter((block) => block.text.trim().length > 0)
      .map((block) => {
        const type = classifyBlock(block, pageWidth, pageHeight);
        const shape: SlideShape = {
          type,
          name: block.fontSize > 16 ? 'title' : 'text',
          position: {
            x: Math.round((block.x / pageWidth) * 1000) / 10,
            y: Math.round((block.y / pageHeight) * 1000) / 10,
            w: Math.round((block.w / pageWidth) * 1000) / 10,
            h: Math.round((block.h / pageHeight) * 1000) / 10,
          },
        };
        const text = block.text.length > 80 ? block.text.slice(0, 80) + '...' : block.text;
        if (text) shape.text = text;
        return shape;
      })
      // Filter out tiny blocks
      .filter((s) => s.position.w > 3 && s.position.h > 1);

    blueprints.push({
      slideNumber: i,
      shapes,
      compositionSummary: summarizeComposition(shapes),
    });
  }

  doc.destroy();
  return blueprints;
}

const LAYOUT_ANALYSIS_PROMPT = `당신은 프레젠테이션 슬라이드의 레이아웃을 세밀하게 분석하는 전문가입니다.
각 페이지 이미지를 보고 **모든** 시각적 요소의 배치를 개별적으로 분석하세요.

## 핵심 규칙
1. 다이어그램/아키텍처 도를 하나의 큰 shape으로 묶지 마세요!
2. 다이어그램 내부의 **개별 박스, 영역, 컴포넌트를 각각 별도의 shape으로** 분해하세요.
3. 예를 들어 시스템 아키텍처 다이어그램이면:
   - "Integration" 영역 → shape 1개
   - "Core Engine" 영역 → shape 1개
   - 그 안의 "Layer 1", "Layer 2" 등 → 각각 shape
   - "Admin" 패널 → shape 1개
   - 화살표 연결 → 무시 가능
4. 테이블도 헤더 행과 데이터 영역을 구분하세요.
5. 같은 논리 그룹의 박스들은 type을 "group"으로 하고, 그 안의 하위 요소들은 별도로 나열하세요.

각 페이지에 대해 JSON 객체를 반환:
{
  "slideNumber": 페이지번호,
  "shapes": [
    {
      "type": "textbox" | "image" | "chart" | "table" | "diagram" | "shape" | "group",
      "name": "구체적 요소명 (예: integration-genesys, core-engine-layer1-faq, admin-panel)",
      "position": { "x": 0-100, "y": 0-100, "w": 0-100, "h": 0-100 },
      "text": "내부 텍스트 요약 (50자 이내)",
      "children": 하위요소수(선택)
    }
  ],
  "compositionSummary": "상세 레이아웃 (예: 좌측 Integration 4개 박스 + 중앙 3-Layer Core Engine + 우측 Admin 패널)"
}

position은 슬라이드 전체를 100x100으로 볼 때의 상대 좌표.
**가능한 많은 개별 요소를 추출하세요. 최소 10개 이상의 shape이 있는 슬라이드가 대부분입니다.**
반드시 JSON 배열만 출력. 다른 텍스트 없이.`;

/**
 * Extract layout blueprints from image-based PDF using Vision LLM.
 * Converts pages to images and asks LLM to analyze visual layout.
 */
export async function extractPdfLayoutsViaVision(
  buffer: Buffer,
  provider: LlmProviderType,
  maxPages = 20,
  onProgress?: ProgressCallback
): Promise<SlideLayoutBlueprint[]> {
  console.log(`[PDF Layout Vision] 시작: provider=${provider}`);

  const pages = await pdfPagesToImages(buffer, maxPages, 1.0); // lower scale for layout analysis
  if (pages.length === 0) return [];

  const llm = createLlmProvider(provider);
  const allBlueprints: SlideLayoutBlueprint[] = [];

  // Process in batches of 3 pages (smaller batches for layout detail)
  const BATCH_SIZE = 3;
  for (let batchStart = 0; batchStart < pages.length; batchStart += BATCH_SIZE) {
    const batch = pages.slice(batchStart, batchStart + BATCH_SIZE);
    console.log(`[PDF Layout Vision] 배치: 페이지 ${batchStart + 1}-${batchStart + batch.length}`);
    onProgress?.(`Vision 레이아웃 분석 중... (페이지 ${batchStart + 1}-${batchStart + batch.length} / ${pages.length})`);

    const contentBlocks: ContentBlock[] = [];
    for (const { page, jpeg } of batch) {
      contentBlocks.push({ type: 'text', text: `페이지 ${page}:` });
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') },
      });
    }
    contentBlocks.push({
      type: 'text',
      text: `위 ${batch.length}개 페이지의 레이아웃을 분석하세요. JSON 배열만 출력.`,
    });

    const stream = llm.streamChat({
      messages: [{ role: 'user', content: contentBlocks }],
      systemPrompt: LAYOUT_ANALYSIS_PROMPT,
      temperature: 0.1,
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }
    } catch (err) {
      console.error(`[PDF Layout Vision] 스트림 에러:`, err instanceof Error ? err.message : err);
    }

    // Parse JSON response
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          slideNumber: number;
          shapes: Array<{
            type: string;
            name: string;
            position: { x: number; y: number; w: number; h: number };
            text?: string;
          }>;
          compositionSummary: string;
        }>;

        for (const item of parsed) {
          const shapes: SlideShape[] = (item.shapes || []).map((s) => ({
            type: (s.type || 'textbox') as SlideShape['type'],
            name: s.name || 'element',
            position: {
              x: Math.round(s.position?.x || 0),
              y: Math.round(s.position?.y || 0),
              w: Math.round(s.position?.w || 0),
              h: Math.round(s.position?.h || 0),
            },
            ...(s.text ? { text: s.text.slice(0, 80) } : {}),
            ...((s as Record<string, unknown>).children ? { childCount: Number((s as Record<string, unknown>).children) } : {}),
          }));

          allBlueprints.push({
            slideNumber: item.slideNumber,
            shapes,
            compositionSummary: item.compositionSummary || summarizeComposition(shapes),
          });
        }
      }
    } catch (parseErr) {
      console.error(`[PDF Layout Vision] JSON 파싱 실패:`, parseErr instanceof Error ? parseErr.message : parseErr);
      // Fill with empty blueprints for this batch
      for (const { page } of batch) {
        if (!allBlueprints.find((b) => b.slideNumber === page)) {
          allBlueprints.push({ slideNumber: page, shapes: [], compositionSummary: '분석 실패' });
        }
      }
    }
  }

  console.log(`[PDF Layout Vision] 완료: ${allBlueprints.length}페이지 분석`);
  return allBlueprints;
}

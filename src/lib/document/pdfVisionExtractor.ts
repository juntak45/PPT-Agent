import { createLlmProvider } from '../llm/factory';
import { LlmProviderType, ContentBlock, ProgressCallback } from '../types';
import { pdfPagesToImages } from './pdfToImage';

const EXTRACT_PROMPT = `당신은 PDF 문서에서 텍스트를 추출하는 전문가입니다.
제공된 PDF 문서의 각 페이지에서 모든 텍스트 내용을 정확하게 추출하세요.

규칙:
1. 각 페이지를 "--- 페이지 N ---" 형식으로 구분하세요
2. 텍스트를 있는 그대로 추출하세요 (번역하지 마세요)
3. 표가 있으면 간단한 텍스트 형태로 변환하세요
4. 차트/다이어그램이 있으면 [차트: 설명] 또는 [다이어그램: 설명] 형태로 간단히 기술하세요
5. 장식용 이미지는 무시하세요
6. 다른 설명 없이 추출된 텍스트만 출력하세요`;

/**
 * Extract text from an image-based PDF using LLM vision API.
 * - Claude: sends PDF as native document block (best quality)
 * - OpenAI/OpenRouter: converts PDF pages to JPEG images, sends as vision (image_url)
 *
 * For large PDFs, only processes the first maxPages pages.
 */
export async function extractPdfTextViaVision(
  buffer: Buffer,
  provider: LlmProviderType,
  maxPages = 35,
  onProgress?: ProgressCallback
): Promise<string> {
  console.log(`[PDF Vision] 시작: ${(buffer.length / 1024 / 1024).toFixed(1)}MB, provider=${provider}`);

  // Claude supports PDF documents directly via base64
  if (provider === 'claude') {
    return extractViaClaudePdf(buffer, maxPages);
  }

  // OpenAI/OpenRouter — convert PDF pages to images and use vision API
  // If Claude key also available, prefer Claude (better PDF support)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    console.log('[PDF Vision] OpenAI 선택됨, Claude 키 있으므로 Claude로 PDF 직접 처리');
    return extractViaClaudePdf(buffer, maxPages);
  }

  // Use OpenRouter vision with page images
  console.log('[PDF Vision] OpenRouter Vision으로 페이지 이미지 변환 후 처리');
  return extractViaImageVision(buffer, provider, maxPages, onProgress);
}

async function extractViaClaudePdf(
  buffer: Buffer,
  maxPages: number
): Promise<string> {
  // For large PDFs, we may need to split. Claude supports up to ~100 pages per request.
  // We'll send the whole PDF if reasonable, or truncate.
  const pdfBase64 = buffer.toString('base64');
  const sizeMB = buffer.length / 1024 / 1024;

  console.log(`[PDF Vision] Claude PDF 직접 전송: ${sizeMB.toFixed(1)}MB`);

  // If PDF is extremely large (>30MB), we need to be careful about API limits
  if (sizeMB > 30) {
    console.log(`[PDF Vision] PDF가 ${sizeMB.toFixed(0)}MB로 큼. 부분 처리 시도.`);
  }

  const llm = createLlmProvider('claude');

  const contentBlocks: ContentBlock[] = [
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBase64,
      },
    },
    {
      type: 'text',
      text: `이 PDF 문서의 텍스트를 추출해주세요. 최대 ${maxPages}페이지까지 처리하세요.`,
    },
  ];

  const stream = llm.streamChat({
    messages: [{ role: 'user', content: contentBlocks }],
    systemPrompt: EXTRACT_PROMPT,
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
    console.error('[PDF Vision] 스트림 에러:', err instanceof Error ? err.message : err);
    if (result.length > 100) {
      console.log(`[PDF Vision] 부분 결과 사용 (${result.length}자)`);
    } else {
      throw err;
    }
  }

  console.log(`[PDF Vision] 추출 완료: ${result.length}자`);
  return result;
}

/**
 * Extract text from PDF by converting pages to JPEG images and sending to vision LLM.
 * Used for OpenAI/OpenRouter when no Claude API key is available.
 * Processes pages in batches to stay within API limits.
 */
async function extractViaImageVision(
  buffer: Buffer,
  provider: LlmProviderType,
  maxPages: number,
  onProgress?: ProgressCallback
): Promise<string> {
  // Convert PDF pages to JPEG images
  const pages = await pdfPagesToImages(buffer, maxPages, 1.5);

  if (pages.length === 0) {
    throw new Error('PDF에서 페이지를 추출할 수 없습니다.');
  }

  const llm = createLlmProvider(provider);
  const allResults: string[] = [];

  // Process in batches of 5 pages to avoid token limits
  const BATCH_SIZE = 5;
  for (let batchStart = 0; batchStart < pages.length; batchStart += BATCH_SIZE) {
    const batch = pages.slice(batchStart, batchStart + BATCH_SIZE);
    const batchEnd = batchStart + batch.length;
    console.log(`[PDF Vision] 배치 처리: 페이지 ${batchStart + 1}-${batchEnd} / ${pages.length}`);
    onProgress?.(`Vision 텍스트 추출 중... (페이지 ${batchStart + 1}-${batchEnd} / ${pages.length})`);

    const contentBlocks: ContentBlock[] = [];

    for (const { page, jpeg } of batch) {
      contentBlocks.push({
        type: 'text',
        text: `--- 페이지 ${page} ---`,
      });
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: jpeg.toString('base64'),
        },
      });
    }

    contentBlocks.push({
      type: 'text',
      text: `위 ${batch.length}개 페이지의 텍스트를 추출해주세요.`,
    });

    const stream = llm.streamChat({
      messages: [{ role: 'user', content: contentBlocks }],
      systemPrompt: EXTRACT_PROMPT,
      temperature: 0.1,
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let batchResult = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        batchResult += decoder.decode(value, { stream: true });
      }
    } catch (err) {
      console.error(`[PDF Vision] 배치 ${batchStart + 1}-${batchEnd} 스트림 에러:`, err instanceof Error ? err.message : err);
      if (batchResult.length > 50) {
        console.log(`[PDF Vision] 부분 결과 사용 (${batchResult.length}자)`);
      }
      // Continue with partial results rather than failing entirely
    }

    if (batchResult.length > 0) {
      allResults.push(batchResult);
    }
  }

  const finalResult = allResults.join('\n\n');
  console.log(`[PDF Vision] 이미지 Vision 추출 완료: ${finalResult.length}자 (${pages.length}페이지)`);

  if (finalResult.length < 50) {
    throw new Error('PDF 이미지에서 텍스트를 충분히 추출할 수 없습니다. PPTX 원본을 업로드해보세요.');
  }

  return finalResult;
}

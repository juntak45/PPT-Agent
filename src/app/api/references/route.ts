import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { getReferences, addReference } from '@/lib/reference/store';
import { analyzeReferenceFromPptx, analyzeReferenceFromText } from '@/lib/reference/analyzer';
import { parsePptxSlides, parseDocument } from '@/lib/document/parser';
import { extractPptxLayouts, extractPptxTheme } from '@/lib/document/pptxLayoutExtractor';
import { extractPdfLayouts, extractPdfLayoutsViaVision } from '@/lib/document/pdfLayoutExtractor';
import { extractPdfTextViaVision } from '@/lib/document/pdfVisionExtractor';
import { extractDocxLayouts } from '@/lib/document/docxLayoutExtractor';
import { LlmProviderType } from '@/lib/types';

export const maxDuration = 120;

export async function GET() {
  try {
    const references = await getReferences();
    return Response.json(references);
  } catch (error) {
    console.error('References GET error:', error);
    return Response.json({ error: '레퍼런스 목록을 불러올 수 없습니다' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  const encoder = new TextEncoder();

  function sendEvent(controller: ReadableStreamDefaultController, event: Record<string, unknown>) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  }

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = (formData.get('name') as string) || file.name;
    const provider = (formData.get('provider') as LlmProviderType) || 'claude';

    if (!file) {
      return Response.json({ error: '파일이 필요합니다' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pptx', 'pdf', 'docx'].includes(ext)) {
      return Response.json(
        { error: '지원하지 않는 파일 형식입니다. (.pptx, .pdf, .docx만 지원)' },
        { status: 400 }
      );
    }

    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          const progress = (detail: string) => {
            sendEvent(controller, { type: 'progress', step: 'processing', detail });
          };

          progress('파일 읽는 중...');
          const buffer = Buffer.from(await file.arrayBuffer());

          let analysis;
          let rawSlideTexts: string[] | undefined;

          if (ext === 'pptx') {
            progress('PPTX 슬라이드 파싱 중...');
            const slideTexts = await parsePptxSlides(buffer);
            const totalText = slideTexts.join('').trim();
            if (totalText.length < 50) {
              sendEvent(controller, { type: 'error', error: `PPTX에서 텍스트를 거의 추출할 수 없습니다 (${totalText.length}자).` });
              controller.close();
              return;
            }

            progress(`${slideTexts.length}장 파싱 완료. 레이아웃 및 테마 추출 중...`);
            const [layoutBlueprints, themeInfo] = await Promise.all([
              extractPptxLayouts(buffer),
              extractPptxTheme(buffer),
            ]);

            progress(`레이아웃 추출 완료. AI 패턴 분석 시작 (${slideTexts.length}장)...`);
            analysis = await analyzeReferenceFromPptx(slideTexts, provider, layoutBlueprints, progress);
            analysis.layoutBlueprints = layoutBlueprints;
            if (themeInfo) analysis.themeInfo = themeInfo;
            rawSlideTexts = slideTexts;

          } else if (ext === 'pdf') {
            progress('PDF 텍스트 추출 중...');
            let text = await parseDocument(buffer, 'pdf');

            if (text.trim().length < 50) {
              progress('이미지 기반 PDF 감지. Vision AI로 텍스트 추출 시작...');
              try {
                text = await extractPdfTextViaVision(buffer, provider, 35, progress);
              } catch (visionErr) {
                sendEvent(controller, { type: 'error', error: `이미지 기반 PDF에서 텍스트를 추출할 수 없습니다. ${visionErr instanceof Error ? visionErr.message : ''}` });
                controller.close();
                return;
              }
            }

            progress('텍스트 추출 완료. 레이아웃 구조 추출 중...');
            let layoutBlueprints: Awaited<ReturnType<typeof extractPdfLayouts>> = [];
            try {
              layoutBlueprints = await extractPdfLayouts(buffer);
            } catch {
              layoutBlueprints = [];
            }

            const hasEmptyBlueprints = layoutBlueprints.length === 0 ||
              layoutBlueprints.every(bp => bp.shapes.length === 0);
            if (hasEmptyBlueprints && text.trim().length >= 50) {
              progress('Vision AI로 레이아웃 분석 시작...');
              try {
                layoutBlueprints = await extractPdfLayoutsViaVision(buffer, provider, 20, progress);
              } catch (layoutErr) {
                console.error('[레퍼런스] Vision 레이아웃 분석 실패:', layoutErr);
              }
            }

            progress('레이아웃 분석 완료. AI 패턴 분석 시작...');
            analysis = await analyzeReferenceFromText(text, provider, layoutBlueprints, progress);
            if (layoutBlueprints.length > 0) analysis.layoutBlueprints = layoutBlueprints;

          } else {
            progress('DOCX 텍스트 추출 중...');
            const text = await parseDocument(buffer, ext as 'pdf' | 'docx');
            if (text.trim().length < 50) {
              sendEvent(controller, { type: 'error', error: `문서에서 텍스트를 거의 추출할 수 없습니다 (${text.trim().length}자).` });
              controller.close();
              return;
            }

            progress('DOCX 문서 구조 분석 중... (헤딩/테이블/리스트 추출)');
            let layoutBlueprints: Awaited<ReturnType<typeof extractDocxLayouts>> = [];
            try {
              layoutBlueprints = await extractDocxLayouts(buffer);
            } catch (err) {
              console.error('[레퍼런스] DOCX 레이아웃 추출 실패:', err);
              layoutBlueprints = [];
            }

            progress(`구조 추출 완료 (${layoutBlueprints.length}섹션). AI 패턴 분석 시작...`);
            analysis = await analyzeReferenceFromText(text, provider, layoutBlueprints.length > 0 ? layoutBlueprints : undefined, progress);
            if (layoutBlueprints.length > 0) analysis.layoutBlueprints = layoutBlueprints;
          }

          progress('분석 완료! 저장 중...');
          const ref = {
            id: nanoid(),
            name,
            sourceType: ext as 'pptx' | 'pdf' | 'docx',
            createdAt: Date.now(),
            analysis,
            ...(rawSlideTexts ? { rawSlideTexts } : {}),
          };

          await addReference(ref);
          sendEvent(controller, { type: 'result', data: ref });
          controller.close();
        } catch (error) {
          console.error('References POST error:', error);
          sendEvent(controller, { type: 'error', error: error instanceof Error ? error.message : '레퍼런스 등록에 실패했습니다' });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    // Text/JSON input — no streaming needed (fast)
    try {
      const body = await request.json();
      const { name, text, provider = 'claude' } = body as {
        name: string;
        text: string;
        provider?: LlmProviderType;
      };

      if (!name || !text) {
        return Response.json({ error: '이름과 텍스트가 필요합니다' }, { status: 400 });
      }

      const analysis = await analyzeReferenceFromText(text, provider);

      const ref = {
        id: nanoid(),
        name,
        sourceType: 'text' as const,
        createdAt: Date.now(),
        analysis,
      };

      await addReference(ref);
      return Response.json(ref, { status: 201 });
    } catch (error) {
      console.error('References POST error:', error);
      const message = error instanceof Error ? error.message : '레퍼런스 등록에 실패했습니다';
      return Response.json({ error: message }, { status: 500 });
    }
  }
}

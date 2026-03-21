import { NextRequest } from 'next/server';
import { parseDocument } from '@/lib/document/parser';
import { extractPdfTextViaVision } from '@/lib/document/pdfVisionExtractor';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const provider = (formData.get('provider') as string) || 'openai';

    if (!file) {
      return Response.json({ error: '파일이 없습니다' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'pptx'].includes(ext)) {
      return Response.json(
        { error: '지원하지 않는 파일 형식입니다. (.pdf, .docx, .pptx만 지원)' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = await parseDocument(buffer, ext as 'pdf' | 'docx' | 'pptx');

    // Image-based PDF fallback: use LLM vision
    if (ext === 'pdf' && text.trim().length < 50) {
      console.log(`[업로드] 이미지 기반 PDF 감지, Vision API로 텍스트 추출`);
      text = await extractPdfTextViaVision(buffer, provider as 'claude' | 'openai');
    }

    return Response.json({
      filename: file.name,
      text,
      charCount: text.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다';
    return Response.json({ error: message }, { status: 500 });
  }
}

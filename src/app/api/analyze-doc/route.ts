import { NextRequest } from 'next/server';
import { analyzeDocument } from '@/lib/document/analyzer';
import { LlmProviderType } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { text, provider } = (await request.json()) as {
      text: string;
      provider: LlmProviderType;
    };

    if (!text) {
      return Response.json({ error: '분석할 텍스트가 없습니다' }, { status: 400 });
    }

    const analysis = await analyzeDocument(text, provider);
    return Response.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : '문서 분석 중 오류 발생';
    return Response.json({ error: message }, { status: 500 });
  }
}

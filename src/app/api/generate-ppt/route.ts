import { NextRequest } from 'next/server';
import { FinalDeckPlan } from '@/lib/types';
import { generatePptx } from '@/lib/ppt/generator';

export async function POST(request: NextRequest) {
  try {
    const plan: FinalDeckPlan = await request.json();

    const approvedSlides = plan?.slides?.filter((slide) => slide.approved);

    if (!plan || !approvedSlides || approvedSlides.length === 0) {
      return Response.json({ error: '슬라이드 데이터가 없습니다' }, { status: 400 });
    }

    const buffer = await generatePptx(plan);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(plan.meta?.title || 'presentation')}.pptx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PPT 생성 중 오류 발생';
    return Response.json({ error: message }, { status: 500 });
  }
}

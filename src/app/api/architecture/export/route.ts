import { NextRequest } from 'next/server';
import { ArchitectureSlideModel } from '@/lib/architecture/types';
import { exportArchitectureSlide } from '@/lib/ppt/architectureExporter';

export async function POST(request: NextRequest) {
  try {
    const slide = (await request.json()) as ArchitectureSlideModel;
    if (!slide?.components?.length) {
      return Response.json({ error: '내보낼 아키텍처 슬라이드가 없습니다.' }, { status: 400 });
    }

    const buffer = await exportArchitectureSlide(slide);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(slide.title || 'architecture-slide')}.pptx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PPTX export 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}

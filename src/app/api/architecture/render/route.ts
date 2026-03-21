import { NextRequest } from 'next/server';
import { getReferences } from '@/lib/reference/store';
import { buildArchitectureSlideModel } from '@/lib/architecture/slideModelBuilder';
import { ArchitectureOverlayPlan } from '@/lib/architecture/types';

export async function POST(request: NextRequest) {
  try {
    const { overlayPlan, themeId } = (await request.json()) as {
      overlayPlan: ArchitectureOverlayPlan;
      themeId?: string;
    };

    if (!overlayPlan) {
      return Response.json({ error: 'overlay plan이 필요합니다.' }, { status: 400 });
    }

    const references = await getReferences();
    const selected = references.filter((reference) => reference.id === overlayPlan.referenceStyleProfileId);
    const slide = buildArchitectureSlideModel(
      overlayPlan,
      selected.map((reference) => reference.analysis),
      themeId || 'corporate-blue',
    );

    return Response.json(slide);
  } catch (error) {
    const message = error instanceof Error ? error.message : '슬라이드 렌더링 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}

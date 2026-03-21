import { NextRequest } from 'next/server';
import { getReferences } from '@/lib/reference/store';
import { buildArchitectureVariations } from '@/lib/architecture/refine';
import { ArchitectureOverlayPlan } from '@/lib/architecture/types';

export async function POST(request: NextRequest) {
  try {
    const { overlayPlan, targetScope, instruction } = (await request.json()) as {
      overlayPlan: ArchitectureOverlayPlan;
      targetScope: string;
      instruction?: string;
    };

    if (!overlayPlan || !targetScope) {
      return Response.json({ error: 'overlayPlan과 targetScope가 필요합니다.' }, { status: 400 });
    }

    const references = await getReferences();
    const selected = references.filter((reference) => reference.id === overlayPlan.referenceStyleProfileId);
    const variations = buildArchitectureVariations(overlayPlan, selected.map((reference) => reference.analysis), `${targetScope}${instruction ? `:${instruction}` : ''}`);

    return Response.json({ variations });
  } catch (error) {
    const message = error instanceof Error ? error.message : '변주 생성 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { getReferences } from '@/lib/reference/store';
import { buildOverlayPlan } from '@/lib/architecture/overlayMapper';
import { ArchitectureExtractionResult } from '@/lib/architecture/types';

export async function POST(request: NextRequest) {
  try {
    const { extraction, referenceIds } = (await request.json()) as {
      extraction: ArchitectureExtractionResult;
      referenceIds?: string[];
    };

    if (!extraction) {
      return Response.json({ error: '추출 결과가 필요합니다.' }, { status: 400 });
    }

    const references = await getReferences();
    const selected = referenceIds?.length
      ? references.filter((reference) => referenceIds.includes(reference.id))
      : references;

    if (selected.length === 0) {
      return Response.json({ error: '레퍼런스가 필요합니다.' }, { status: 400 });
    }

    const overlay = buildOverlayPlan(extraction, selected[0].id);
    return Response.json(overlay);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Wrtn 매핑 생성 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { getReferences } from '@/lib/reference/store';
import { extractArchitecture } from '@/lib/architecture/extractor';
import { LlmProviderType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { rfiText, referenceIds, manualNotes, provider } = (await request.json()) as {
      rfiText: string;
      referenceIds?: string[];
      manualNotes?: string;
      provider?: LlmProviderType;
    };

    if (!rfiText?.trim()) {
      return Response.json({ error: 'RFI 텍스트가 필요합니다.' }, { status: 400 });
    }

    const references = await getReferences();
    const selected = referenceIds?.length
      ? references.filter((reference) => referenceIds.includes(reference.id))
      : references;
    if (selected.length === 0) {
      return Response.json({ error: '레퍼런스가 필요합니다.' }, { status: 400 });
    }

    const extraction = await extractArchitecture(
      rfiText,
      manualNotes,
      provider || 'claude',
      selected.map((reference) => reference.analysis),
    );

    return Response.json(extraction);
  } catch (error) {
    const message = error instanceof Error ? error.message : '아키텍처 추출 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}

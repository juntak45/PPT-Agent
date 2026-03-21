import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { mermaidCode } = (await request.json()) as { mermaidCode: string };

    if (!mermaidCode) {
      return Response.json({ error: 'Mermaid 코드가 없습니다' }, { status: 400 });
    }

    // Use mermaid.ink API for server-side rendering
    const encoded = Buffer.from(mermaidCode).toString('base64url');
    const url = `https://mermaid.ink/img/${encoded}?type=png&bgColor=white`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mermaid 렌더링 실패: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mermaid 변환 중 오류';
    return Response.json({ error: message }, { status: 500 });
  }
}

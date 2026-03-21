export async function mermaidToImageUrl(mermaidCode: string): Promise<string> {
  const encoded = Buffer.from(mermaidCode).toString('base64url');
  return `https://mermaid.ink/img/${encoded}?type=png&bgColor=white`;
}

export async function mermaidToBuffer(mermaidCode: string): Promise<Buffer> {
  const url = await mermaidToImageUrl(mermaidCode);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mermaid 렌더링 실패: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

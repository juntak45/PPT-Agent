import { createLlmProvider } from '../llm/factory';
import { LlmProviderType } from '../types';

export async function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

export function extractJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function generateJson<T>(
  provider: LlmProviderType,
  systemPrompt: string,
  userPrompt: string,
): Promise<T | null> {
  try {
    const llm = createLlmProvider(provider);
    const stream = llm.streamChat({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt,
      temperature: 0.2,
    });
    const text = await collectStream(stream);
    const parsed = extractJsonObject(text);
    return parsed as T | null;
  } catch {
    return null;
  }
}

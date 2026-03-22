import { NextRequest } from 'next/server';
import { createLlmProvider } from '@/lib/llm/factory';
import { getSystemPrompt } from '@/lib/llm/prompts';
import { LlmProviderType, LlmMessage, StepId, PipelineState } from '@/lib/types';
import { getReferences } from '@/lib/reference/store';

export const maxDuration = 60;

interface ChatRequestBody {
  provider: LlmProviderType;
  messages: LlmMessage[];
  stepId: StepId;
  pipelineState: PipelineState;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { provider: providerType, messages, stepId, pipelineState } = body;

    const provider = createLlmProvider(providerType);

    // Load registered references and inject their patterns into prompts
    const references = await getReferences();
    const refAnalyses = references.map((r) => r.analysis);
    const systemPrompt = getSystemPrompt(stepId, pipelineState, refAnalyses);

    const stream = provider.streamChat({
      messages,
      systemPrompt,
      stepId,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider, StreamChatOptions } from './provider';
import { CLAUDE_MODEL } from '../constants';
import { ContentBlock } from '../types';

export class ClaudeProvider implements LlmProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  streamChat(options: StreamChatOptions): ReadableStream<Uint8Array> {
    const { messages, systemPrompt, model, temperature, stepId } = options;
    // Step 5 (realization): lower temperature for consistency
    const effectiveTemp = temperature ?? (stepId === 5 ? 0.5 : 0.7);
    const encoder = new TextEncoder();

    const anthropicMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: this.convertContent(m.content),
      }));

    return new ReadableStream({
      start: async (controller) => {
        try {
          const stream = this.client.messages.stream({
            model: model || CLAUDE_MODEL,
            max_tokens: 8192,
            system: systemPrompt,
            messages: anthropicMessages,
            temperature: effectiveTemp,
          });

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          controller.close();
        } catch (error) {
          console.error('[Claude Provider] 스트림 에러:', error instanceof Error ? error.message : error);
          controller.error(error);
        }
      },
    });
  }

  private convertContent(content: string | ContentBlock[]): string | Anthropic.MessageCreateParams['messages'][0]['content'] {
    if (typeof content === 'string') return content;

    return content.map((block) => {
      switch (block.type) {
        case 'text':
          return { type: 'text' as const, text: block.text };
        case 'image':
          return {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: block.source.media_type,
              data: block.source.data,
            },
          };
        case 'document':
          return {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: block.source.media_type,
              data: block.source.data,
            },
          };
        default:
          return { type: 'text' as const, text: '' };
      }
    });
  }
}

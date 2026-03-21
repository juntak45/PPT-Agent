import OpenAI from 'openai';
import { LlmProvider, StreamChatOptions } from './provider';
import { OPENAI_MODEL } from '../constants';
import { ContentBlock } from '../types';

export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  streamChat(options: StreamChatOptions): ReadableStream<Uint8Array> {
    const { messages, systemPrompt, model, temperature } = options;
    const encoder = new TextEncoder();

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          const converted = this.convertContent(m.content);
          if (m.role === 'assistant') {
            // Assistant messages only support string content in OpenAI
            const text = typeof converted === 'string' ? converted : converted.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('');
            return { role: 'assistant' as const, content: text };
          }
          return { role: 'user' as const, content: converted };
        }),
    ];

    return new ReadableStream({
      start: async (controller) => {
        try {
          const stream = await this.client.chat.completions.create({
            model: model || OPENAI_MODEL,
            messages: openaiMessages,
            temperature: temperature ?? 0.7,
            max_tokens: 8192,
            stream: true,
          });

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }

          controller.close();
        } catch (error) {
          console.error('[OpenAI Provider] 스트림 에러:', error instanceof Error ? error.message : error);
          controller.error(error);
        }
      },
    });
  }

  private convertContent(content: string | ContentBlock[]): string | OpenAI.Chat.ChatCompletionContentPart[] {
    if (typeof content === 'string') return content;

    return content.map((block): OpenAI.Chat.ChatCompletionContentPart => {
      switch (block.type) {
        case 'text':
          return { type: 'text', text: block.text };
        case 'image':
          return {
            type: 'image_url',
            image_url: {
              url: `data:${block.source.media_type};base64,${block.source.data}`,
            },
          };
        case 'document':
          // OpenAI/OpenRouter doesn't support PDF directly, send as text fallback
          return {
            type: 'text',
            text: '[PDF 문서가 첨부되었으나 이 모델에서는 PDF를 직접 처리할 수 없습니다]',
          };
        default:
          return { type: 'text', text: '' };
      }
    });
  }
}

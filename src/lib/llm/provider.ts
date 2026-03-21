import { LlmMessage } from '../types';

export interface StreamChatOptions {
  messages: LlmMessage[];
  systemPrompt: string;
  model?: string;
  temperature?: number;
}

export interface LlmProvider {
  streamChat(options: StreamChatOptions): ReadableStream<Uint8Array>;
}

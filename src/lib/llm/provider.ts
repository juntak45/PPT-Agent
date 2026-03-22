import { LlmMessage, StepId } from '../types';

export interface StreamChatOptions {
  messages: LlmMessage[];
  systemPrompt: string;
  model?: string;
  temperature?: number;
  stepId?: StepId;
}

export interface LlmProvider {
  streamChat(options: StreamChatOptions): ReadableStream<Uint8Array>;
}

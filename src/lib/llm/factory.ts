import { LlmProviderType } from '../types';
import { LlmProvider } from './provider';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';

export function createLlmProvider(type: LlmProviderType): LlmProvider {
  switch (type) {
    case 'claude': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
      return new ClaudeProvider(apiKey);
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
      const baseURL = process.env.OPENAI_BASE_URL;
      return new OpenAIProvider(apiKey, baseURL);
    }
  }
}

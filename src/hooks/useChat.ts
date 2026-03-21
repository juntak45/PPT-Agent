'use client';

import { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import {
  ChatMessage,
  LlmProviderType,
  LlmMessage,
  StepId,
  PipelineState,
} from '@/lib/types';
import { extractStructuredData, removeStructuredData } from '@/lib/pipeline/parser';

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (content: string, stepId: StepId, pipelineState: PipelineState) => Promise<string>;
  addAssistantMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

export function useChat(provider: LlmProviderType): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, stepId: StepId, pipelineState: PipelineState): Promise<string> => {
      // Add user message
      const userMsg: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content,
        type: 'text',
        stepId,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      // Build LLM messages from history
      const llmMessages: LlmMessage[] = messages
        .concat(userMsg)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Create assistant message placeholder
      const assistantId = nanoid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        type: 'text',
        stepId,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            messages: llmMessages,
            stepId,
            pipelineState,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API 오류: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Stream을 읽을 수 없습니다');

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            )
          );
        }

        // Parse structured data
        const structured = extractStructuredData(fullText);
        const cleanContent = removeStructuredData(fullText);

        // Update final message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: cleanContent,
                  type: structured ? 'options' : 'text',
                  options: structured
                    ? undefined // Will be handled by pipeline
                    : undefined,
                }
              : m
          )
        );

        return fullText; // Return full text including structured data
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return '';
        }

        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `오류가 발생했습니다: ${errorMsg}` }
              : m
          )
        );
        return '';
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, provider]
  );

  const addAssistantMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, addAssistantMessage, clearMessages };
}

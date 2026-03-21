'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '@/lib/types';
import MessageBubble from './MessageBubble';
import Spinner from '@/components/ui/Spinner';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export default function MessageList({ messages, isStreaming }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const checkIfNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // 하단에서 5px 이내면 "near bottom"으로 판단 (완전히 바닥에 붙어있을 때만)
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
  }, []);

  useEffect(() => {
    // 사용자가 하단 근처에 있을 때만 자동 스크롤
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  // 유저가 새 메시지를 보냈을 때만 강제 하단 스크롤
  // (assistant 스트리밍 응답 추가 시에는 강제하지 않음)
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'user') {
        isNearBottomRef.current = true;
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">PPT Agent</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            제안서/RFP 문서를 업로드하면 AI가 분석하여<br />
            프레젠테이션을 자동으로 기획해드립니다
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            또는 아래에 발표 주제를 직접 입력하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4"
      onScroll={checkIfNearBottom}
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-4">
          <Spinner size="sm" />
          <span className="text-xs">응답 생성 중...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

function stripStructuredData(text: string): string {
  const marker = '<!--STRUCTURED_DATA';
  const idx = text.indexOf(marker);
  if (idx === -1) return text;
  // Remove from marker to end of closing --> (or end of string if still streaming)
  const endIdx = text.indexOf('-->', idx + marker.length);
  if (endIdx === -1) return text.slice(0, idx).trim();
  return (text.slice(0, idx) + text.slice(endIdx + 3)).trim();
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const cleaned = stripStructuredData(content);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mt-3 mb-2 text-gray-900 dark:text-gray-100">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-2 mb-1 text-gray-900 dark:text-gray-100">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-2 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1 text-gray-700 dark:text-gray-300">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-700 dark:text-gray-300">{children}</ol>
        ),
        li: ({ children }) => <li className="ml-2">{children}</li>,
        code: ({ className, children }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 my-2 overflow-x-auto">
                <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{children}</code>
              </pre>
            );
          }
          return (
            <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-left text-sm font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-sm">{children}</td>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 my-2 text-gray-600 dark:text-gray-400 italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );
}

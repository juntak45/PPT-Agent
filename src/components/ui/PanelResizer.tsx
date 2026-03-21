'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

interface PanelResizerProps {
  onResize: (leftWidthPercent: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function PanelResizer({ onResize, containerRef }: PanelResizerProps) {
  const isDragging = useRef(false);
  const [active, setActive] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setActive(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.min(Math.max((x / rect.width) * 100, 20), 80);
      onResize(percent);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setActive(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize, containerRef]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`hidden md:flex items-center justify-center w-1.5 cursor-col-resize group hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors shrink-0 ${
        active ? 'bg-blue-200 dark:bg-blue-800/40' : ''
      }`}
    >
      <div
        className={`w-0.5 h-8 rounded-full transition-colors ${
          active
            ? 'bg-blue-500'
            : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400 dark:group-hover:bg-blue-500'
        }`}
      />
    </div>
  );
}

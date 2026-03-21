'use client';

import { ArchitectureSlideModel } from '@/lib/architecture/types';
import { getThemeById } from '@/lib/slideThemes';

interface ArchitectureCanvasProps {
  slide: ArchitectureSlideModel;
  className?: string;
}

function colorForToken(slide: ArchitectureSlideModel, token: string, themeAccent: string): string {
  switch (token) {
    case 'wrtn':
      return slide.styleProfile.wrtnFillColor || themeAccent;
    case 'shared':
      return slide.styleProfile.sharedFillColor || '#dbeafe';
    case 'analytics':
      return slide.styleProfile.groupFillColor || '#eef2ff';
    default:
      return slide.styleProfile.customerFillColor || '#f3f4f6';
  }
}

export default function ArchitectureCanvas({ slide, className = '' }: ArchitectureCanvasProps) {
  const theme = getThemeById(slide.themeId || 'corporate-blue');

  return (
    <div
      className={`relative w-full aspect-[16/9] overflow-hidden rounded-2xl border ${className}`}
      style={{
        background: slide.styleProfile.backgroundColor || '#f8fafc',
        borderColor: theme.cardBorder,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: theme.decorBar }} />

      <div className="absolute left-[2.5%] top-[3%] right-[18%]">
        <h2 className="text-[2.2vw] font-black leading-tight" style={{ color: slide.styleProfile.titleColor }}>
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="mt-[0.8%] text-[0.9vw] leading-snug" style={{ color: slide.styleProfile.subtitleColor }}>
            {slide.subtitle}
          </p>
        )}
      </div>

      {slide.legend && (
        <div className="absolute right-[2.5%] top-[4.5%] space-y-[0.4vw]">
          {slide.legend.map((legend) => (
            <div key={legend.label} className="flex items-center gap-[0.45vw]">
              <span
                className="block rounded-full"
                style={{
                  width: '0.7vw',
                  height: '0.7vw',
                  background: colorForToken(slide, legend.colorToken, theme.accent),
                }}
              />
              <span className="text-[0.7vw] font-medium" style={{ color: slide.styleProfile.subtitleColor }}>
                {legend.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <svg className="absolute inset-0 h-full w-full pointer-events-none">
        {slide.connections.map((connection) => {
          const path = connection.points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x}% ${point.y}%`)
            .join(' ');
          const end = connection.points[connection.points.length - 1];
          return (
            <g key={connection.id}>
              <path
                d={path}
                stroke={slide.styleProfile.connectionColor}
                strokeWidth="0.35"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={`${end.x}%`} cy={`${end.y}%`} r="0.32" fill={slide.styleProfile.connectionColor} />
              {connection.label && connection.points[1] && (
                <text
                  x={`${connection.points[1].x + 0.8}%`}
                  y={`${connection.points[1].y - 0.6}%`}
                  fontSize="0.8"
                  fill={slide.styleProfile.subtitleColor}
                >
                  {connection.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {slide.groups.map((group) => (
        <div
          key={group.id}
          className="absolute rounded-2xl border shadow-sm"
          style={{
            left: `${group.x}%`,
            top: `${group.y}%`,
            width: `${group.w}%`,
            height: `${group.h}%`,
            background: slide.styleProfile.groupFillColor,
            borderColor: slide.styleProfile.groupStrokeColor,
          }}
        >
          <div
            className="px-[0.8vw] py-[0.45vw] text-[0.82vw] font-bold border-b"
            style={{ color: slide.styleProfile.titleColor, borderColor: slide.styleProfile.groupStrokeColor }}
          >
            {group.title}
          </div>
        </div>
      ))}

      {slide.components.map((component) => (
        <div
          key={component.id}
          className="absolute rounded-xl border px-[0.65vw] py-[0.55vw] flex items-center justify-center text-center shadow-sm"
          style={{
            left: `${component.x}%`,
            top: `${component.y}%`,
            width: `${component.w}%`,
            height: `${component.h}%`,
            background: colorForToken(slide, component.colorToken, theme.accent),
            borderColor: slide.styleProfile.groupStrokeColor,
            color: component.colorToken === 'wrtn' ? '#0f172a' : '#1f2937',
          }}
        >
          <span className="text-[0.78vw] font-semibold leading-tight">{component.label}</span>
        </div>
      ))}
    </div>
  );
}

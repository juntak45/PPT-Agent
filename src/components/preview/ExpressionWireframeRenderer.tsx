'use client';

import { ExpressionWireframe, ExpressionFamily } from '@/lib/types';

interface ExpressionWireframeRendererProps {
  wireframe: ExpressionWireframe;
  family: ExpressionFamily;
}

const ZONE_BG = 'bg-blue-100 dark:bg-blue-900/30';
const ZONE_BORDER = 'border border-blue-300 dark:border-blue-700';
const ZONE_TEXT = 'text-[7px] text-blue-700 dark:text-blue-300 truncate px-1';
const ARROW = 'text-blue-400 dark:text-blue-500 text-[8px] font-bold';

function TableWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const rows = wireframe.meta?.rowCount || 3;
  const cols = wireframe.meta?.columnCount || 2;
  return (
    <div className="flex flex-col gap-[2px] w-full">
      <div className={`flex gap-[2px]`}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`flex-1 h-3 rounded-sm bg-blue-200 dark:bg-blue-800 ${ZONE_TEXT} flex items-center justify-center font-semibold`}>
            {wireframe.zones[i]?.placeholder?.slice(0, 6) || `열${i + 1}`}
          </div>
        ))}
      </div>
      {Array.from({ length: Math.min(rows, 4) }).map((_, r) => (
        <div key={r} className="flex gap-[2px]">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={`flex-1 h-2.5 rounded-sm ${ZONE_BG} ${ZONE_BORDER}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardsWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const count = wireframe.meta?.itemCount || 3;
  return (
    <div className="flex gap-1 w-full">
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div key={i} className={`flex-1 rounded-md ${ZONE_BG} ${ZONE_BORDER} p-1 flex flex-col items-center gap-[2px]`}>
          <div className="w-3 h-3 rounded-full bg-blue-200 dark:bg-blue-800" />
          <div className={ZONE_TEXT}>{wireframe.zones[i]?.placeholder?.slice(0, 8) || `카드${i + 1}`}</div>
        </div>
      ))}
    </div>
  );
}

function FlowWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const steps = wireframe.meta?.stepCount || 3;
  return (
    <div className="flex items-center gap-[2px] w-full">
      {Array.from({ length: Math.min(steps, 4) }).map((_, i) => (
        <div key={i} className="flex items-center gap-[2px] flex-1">
          <div className={`flex-1 h-6 rounded-md ${ZONE_BG} ${ZONE_BORDER} ${ZONE_TEXT} flex items-center justify-center`}>
            {wireframe.zones[i]?.placeholder?.slice(0, 6) || `단계${i + 1}`}
          </div>
          {i < Math.min(steps, 4) - 1 && <span className={ARROW}>→</span>}
        </div>
      ))}
    </div>
  );
}

function HubSpokeWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const spokes = wireframe.meta?.spokeCount || 4;
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className={`w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 ${ZONE_BORDER} flex items-center justify-center ${ZONE_TEXT} font-semibold`}>
        {wireframe.zones[0]?.placeholder?.slice(0, 4) || '중심'}
      </div>
      {Array.from({ length: Math.min(spokes, 4) }).map((_, i) => {
        const positions = [
          { top: '2px', left: '50%', transform: 'translateX(-50%)' },
          { bottom: '2px', left: '50%', transform: 'translateX(-50%)' },
          { top: '50%', left: '4px', transform: 'translateY(-50%)' },
          { top: '50%', right: '4px', transform: 'translateY(-50%)' },
        ];
        return (
          <div key={i} className={`absolute ${ZONE_BG} ${ZONE_BORDER} rounded-sm px-1 ${ZONE_TEXT}`} style={positions[i]}>
            {wireframe.zones[i + 1]?.placeholder?.slice(0, 4) || `${i + 1}`}
          </div>
        );
      })}
    </div>
  );
}

function TimelineWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const steps = wireframe.meta?.stepCount || 4;
  return (
    <div className="flex flex-col items-center w-full gap-1">
      <div className="w-full h-[2px] bg-blue-300 dark:bg-blue-600 relative mt-2">
        <div className="absolute inset-0 flex justify-between items-center px-1">
          {Array.from({ length: Math.min(steps, 5) }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500" />
          ))}
        </div>
      </div>
      <div className="flex justify-between w-full px-1">
        {Array.from({ length: Math.min(steps, 5) }).map((_, i) => (
          <span key={i} className={ZONE_TEXT}>{wireframe.zones[i]?.placeholder?.slice(0, 4) || `${i + 1}`}</span>
        ))}
      </div>
    </div>
  );
}

function ContrastSplitWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  return (
    <div className="flex gap-[2px] w-full h-full">
      <div className={`flex-1 rounded-md ${ZONE_BG} ${ZONE_BORDER} ${ZONE_TEXT} flex items-center justify-center`}>
        {wireframe.zones[0]?.placeholder?.slice(0, 8) || 'AS-IS'}
      </div>
      <div className="w-[1px] bg-blue-300 dark:bg-blue-600" />
      <div className={`flex-1 rounded-md ${ZONE_BG} ${ZONE_BORDER} ${ZONE_TEXT} flex items-center justify-center`}>
        {wireframe.zones[1]?.placeholder?.slice(0, 8) || 'TO-BE'}
      </div>
    </div>
  );
}

function ChartWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const type = wireframe.meta?.chartType || 'bar';
  if (type === 'pie') {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-10 h-10 rounded-full border-4 border-blue-300 dark:border-blue-600 border-t-blue-500 dark:border-t-blue-400" />
      </div>
    );
  }
  return (
    <div className="flex items-end gap-[3px] w-full h-full px-2 pb-1">
      {[60, 80, 45, 90, 55].map((h, i) => (
        <div key={i} className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-t-sm" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function CenterStageWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
      <div className={`w-12 h-6 rounded-lg bg-blue-200 dark:bg-blue-800 ${ZONE_BORDER} ${ZONE_TEXT} flex items-center justify-center font-semibold`}>
        {wireframe.zones[0]?.placeholder?.slice(0, 8) || '핵심'}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`w-6 h-3 rounded-sm ${ZONE_BG} ${ZONE_BORDER}`} />
        ))}
      </div>
    </div>
  );
}

function IconListWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const count = wireframe.meta?.itemCount || 4;
  return (
    <div className="flex flex-col gap-[3px] w-full">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-200 dark:bg-blue-800 flex-shrink-0" />
          <div className={`flex-1 h-2.5 rounded-sm ${ZONE_BG} ${ZONE_BORDER}`} />
        </div>
      ))}
    </div>
  );
}

function MatrixWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const rows = wireframe.meta?.rowCount || 2;
  const cols = wireframe.meta?.columnCount || 2;
  return (
    <div className="grid gap-[2px] w-full h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div key={i} className={`rounded-md ${ZONE_BG} ${ZONE_BORDER} ${ZONE_TEXT} flex items-center justify-center`}>
          {wireframe.zones[i]?.placeholder?.slice(0, 4) || ''}
        </div>
      ))}
    </div>
  );
}

function FunnelWireframe() {
  const widths = [100, 80, 60, 40];
  return (
    <div className="flex flex-col items-center gap-[2px] w-full">
      {widths.map((w, i) => (
        <div key={i} className={`h-3 rounded-sm ${ZONE_BG} ${ZONE_BORDER}`} style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function StackedLayersWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  const count = wireframe.meta?.itemCount || 3;
  return (
    <div className="flex flex-col gap-[2px] w-full">
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div key={i} className={`h-4 rounded-sm ${ZONE_BG} ${ZONE_BORDER} ${ZONE_TEXT} flex items-center px-1`}>
          {wireframe.zones[i]?.placeholder?.slice(0, 10) || `레이어 ${i + 1}`}
        </div>
      ))}
    </div>
  );
}

function DefaultWireframe({ wireframe }: { wireframe: ExpressionWireframe }) {
  return (
    <div className={`w-full h-full rounded-md ${ZONE_BG} ${ZONE_BORDER} ${ZONE_TEXT} flex items-center justify-center`}>
      {wireframe.zones[0]?.placeholder?.slice(0, 12) || wireframe.title?.slice(0, 12) || '미리보기'}
    </div>
  );
}

const FAMILY_RENDERERS: Record<ExpressionFamily, React.FC<{ wireframe: ExpressionWireframe }>> = {
  'table': TableWireframe,
  'cards': CardsWireframe,
  'flow-diagram': FlowWireframe,
  'timeline': TimelineWireframe,
  'hub-spoke': HubSpokeWireframe,
  'stacked-layers': StackedLayersWireframe,
  'chart': ChartWireframe,
  'contrast-split': ContrastSplitWireframe,
  'icon-list': IconListWireframe,
  'center-stage': CenterStageWireframe,
  'matrix': MatrixWireframe,
  'funnel': FunnelWireframe,
  'pyramid': FunnelWireframe,      // reuse funnel visual
  'scorecard': CardsWireframe,     // reuse cards visual
};

export default function ExpressionWireframeRenderer({ wireframe, family }: ExpressionWireframeRendererProps) {
  const Renderer = FAMILY_RENDERERS[family] || DefaultWireframe;

  return (
    <div className="w-[200px] h-[112px] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex flex-col">
      <div className="text-[8px] font-semibold text-gray-600 dark:text-gray-400 truncate mb-1">
        {wireframe.title}
      </div>
      <div className="flex-1 min-h-0">
        <Renderer wireframe={wireframe} />
      </div>
    </div>
  );
}

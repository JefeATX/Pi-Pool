import React, { useEffect } from 'react';
import { PoolsConfigMap } from '../types';

interface PoolStripProps {
  poolsConfig: PoolsConfigMap;
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}

export const PoolStrip: React.FC<PoolStripProps> = ({
  poolsConfig,
  selectedMode,
  onSelectMode,
}) => {
  // Only include pools that are enabled
  const allPoolKeys = Object.keys(poolsConfig);
  const enabledPoolKeys = allPoolKeys.filter((key) => poolsConfig[key]?.enabled);

  const visibleModes = [...enabledPoolKeys];
  if (enabledPoolKeys.length > 1) {
    visibleModes.push('Multi-View');
  }

  // Fallback selectedMode if current selected mode is disabled or no longer visible
  useEffect(() => {
    if (visibleModes.length > 0 && !visibleModes.includes(selectedMode)) {
      onSelectMode(visibleModes[0]);
    }
  }, [visibleModes.join(','), selectedMode, onSelectMode]);

  if (enabledPoolKeys.length === 0) {
    return (
      <div className="bg-[#111] p-2 sm:p-3 rounded-sm border border-[#1a1a1a] mb-3 sm:mb-4 shadow-sm text-xs font-mono text-[#555] flex items-center justify-between">
        <span>NO POOL SERVERS ENABLED — ENABLE POOL PROFILES IN SETTINGS TO MONITOR MINING</span>
      </div>
    );
  }

  return (
    <div className="bg-[#111] p-1.5 sm:p-2 rounded-sm border border-[#1a1a1a] mb-3 sm:mb-4 shadow-sm">
      <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar touch-pan-x">
        {visibleModes.map((mode) => {
          const poolData = poolsConfig[mode];
          const isSelected = selectedMode === mode;
          const label = mode === 'Multi-View' ? 'Multi-View' : poolData?.name || mode;

          return (
            <button
              key={mode}
              onClick={() => onSelectMode(mode)}
              className={`flex-1 min-w-[95px] sm:min-w-[120px] py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-sm font-mono text-xs font-bold transition-all border text-center truncate active:scale-95 ${
                isSelected
                  ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-[0_0_8px_rgba(0,255,65,0.3)]'
                  : 'bg-[#0c0c0c] text-[#e0e0e0] border-[#1a1a1a] hover:bg-[#1a1a1a]'
              }`}
            >
              <div className="truncate uppercase">{label}</div>
              {mode !== 'Multi-View' && (
                <div
                  className={`text-[10px] tracking-tight font-normal truncate mt-0.5 ${
                    isSelected ? 'text-black/80 font-bold' : 'text-[#555]'
                  }`}
                >
                  {poolData?.cores && poolData.cores.length > 0
                    ? `Cores ${poolData.cores.join(',')}`
                    : 'Unassigned'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { PoolConfig, PoolLiveStats, CoreUsage } from '../types';
import { Cpu, ShieldAlert, Activity } from 'lucide-react';

interface PoolDetailCardProps {
  poolKey: string;
  poolConfig: PoolConfig;
  liveStats: PoolLiveStats | null;
  coreUsages: CoreUsage[];
  isMinerRunning: boolean;
}

export const PoolDetailCard: React.FC<PoolDetailCardProps> = ({
  poolKey,
  poolConfig,
  liveStats,
  coreUsages,
  isMinerRunning,
}) => {
  const formattedHashrate = () => {
    if (!poolConfig.enabled) return 'Disabled';
    if (!isMinerRunning) return 'N/A';
    if (!liveStats || liveStats.hashrateKhs === 0) return 'Connecting...';
    
    const khs = liveStats.hashrateKhs;
    if (khs >= 1000) {
      return `${(khs / 1000).toFixed(2)} MH/s`;
    }
    return `${khs.toFixed(2)} kH/s`;
  };

  const assignedCores = poolConfig.cores || [];

  return (
    <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-3.5 sm:p-5 shadow-xl flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        {/* Header Title & Status */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#1a1a1a] mb-3.5 sm:mb-5">
          <div>
            <div className="text-[10px] font-mono text-[#00FF41] font-bold uppercase tracking-widest">
              {poolKey}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#e0e0e0] font-mono tracking-tight mt-0.5 uppercase">
              {poolConfig.name || poolKey}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {!poolConfig.enabled ? (
              <span className="px-2.5 py-1 rounded-sm text-[11px] sm:text-xs font-bold font-mono bg-[#1a1a1a] text-[#555] border border-[#222] uppercase">
                Disabled
              </span>
            ) : isMinerRunning && liveStats?.status === 'Running' ? (
              <span className="px-2.5 py-1 rounded-sm text-[11px] sm:text-xs font-bold font-mono bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 flex items-center space-x-1.5 animate-pulse uppercase">
                <span className="w-2 h-2 rounded-full bg-[#00FF41]" />
                <span>Running</span>
              </span>
            ) : isMinerRunning ? (
              <span className="px-2.5 py-1 rounded-sm text-[11px] sm:text-xs font-bold font-mono bg-orange-950/60 text-orange-400 border border-orange-800/60 uppercase">
                Connecting...
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-sm text-[11px] sm:text-xs font-bold font-mono bg-[#1a1a1a] text-[#555] border border-[#222] uppercase">
                Idle
              </span>
            )}
          </div>
        </div>

        {/* Big Hashrate Number Display */}
        <div className="mb-3.5 sm:mb-5 bg-[#0c0c0c] p-3.5 sm:p-5 rounded-sm border border-[#1a1a1a]">
          <div className="text-[10px] font-mono text-[#555] uppercase tracking-widest font-semibold mb-1">
            Current Hash Rate
          </div>
          <div className="text-3xl sm:text-5xl font-extrabold text-[#00FF41] font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]">
            {formattedHashrate()}
          </div>
        </div>

        {/* ACC / REJ / ACC-MIN Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3.5 sm:mb-5">
          <div className="bg-[#0c0c0c] p-2.5 sm:p-3.5 rounded-sm border border-[#1a1a1a]">
            <div className="text-[9px] sm:text-[10px] font-mono text-[#555] font-semibold uppercase tracking-widest">ACC</div>
            <div className="text-lg sm:text-xl font-bold font-mono text-[#00FF41] mt-0.5 sm:mt-1">
              {liveStats ? liveStats.acceptedShares : '-'}
            </div>
          </div>

          <div className="bg-[#0c0c0c] p-2.5 sm:p-3.5 rounded-sm border border-[#1a1a1a]">
            <div className="text-[9px] sm:text-[10px] font-mono text-[#555] font-semibold uppercase tracking-widest">REJ</div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-500 mt-0.5 sm:mt-1">
              {liveStats ? liveStats.rejectedShares : '-'}
            </div>
          </div>

          <div className="bg-[#0c0c0c] p-2.5 sm:p-3.5 rounded-sm border border-[#1a1a1a]">
            <div className="text-[9px] sm:text-[10px] font-mono text-[#555] font-semibold uppercase tracking-widest">ACC / MIN</div>
            <div className="text-lg sm:text-xl font-bold font-mono text-[#e0e0e0] mt-0.5 sm:mt-1">
              {liveStats ? liveStats.acceptedPerMin : '-'}
            </div>
          </div>
        </div>

        {/* Difficulty & CPU Cores Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs font-mono">
          <div className="bg-[#0c0c0c] p-3 rounded-sm border border-[#1a1a1a]">
            <div className="text-[#555] uppercase tracking-widest font-semibold mb-1 text-[10px]">
              NETWORK DIFFICULTY
            </div>
            <div className="text-[#e0e0e0] font-bold text-sm">
              {liveStats ? liveStats.difficulty : '-'}
            </div>
          </div>

          <div className="bg-[#0c0c0c] p-3 rounded-sm border border-[#1a1a1a]">
            <div className="text-[#555] uppercase tracking-widest font-semibold mb-1 text-[10px] flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-[#00FF41]" />
              <span>CPU TASKSET CORES</span>
            </div>
            <div className="text-[#e0e0e0] font-bold text-sm">
              {assignedCores.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {assignedCores.map((cid) => (
                    <span
                      key={cid}
                      className="px-2 py-0.5 bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 rounded-sm font-mono font-bold text-[11px]"
                    >
                      Core {cid}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-rose-500">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Per-Core Breakdown List */}
        {assignedCores.length > 0 && (
          <div className="mb-5 bg-[#0c0c0c] p-3.5 rounded-sm border border-[#1a1a1a]">
            <div className="text-[10px] font-mono text-[#555] font-semibold uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Per-Core Load (Max 4 Cores)</span>
              <Activity className="w-3.5 h-3.5 text-[#00FF41]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
              {assignedCores.map((cid) => {
                const coreStat = coreUsages.find((c) => c.coreId === cid);
                const load = coreStat?.usagePercent ?? 0;
                const estKhs = liveStats?.hashrateKhs
                  ? (liveStats.hashrateKhs / assignedCores.length).toFixed(2)
                  : '0.00';

                return (
                  <div key={cid} className="flex items-center justify-between bg-[#111] px-3 py-2 rounded-sm border border-[#1a1a1a]">
                    <span className="text-[#e0e0e0] font-bold text-[11px]">Core {cid}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#666] text-[10px]">{estKhs} kH/s</span>
                      <div className="w-12 bg-[#1a1a1a] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00FF41] h-full transition-all duration-500"
                          style={{ width: `${isMinerRunning ? load : 0}%` }}
                        />
                      </div>
                      <span className="text-[#00FF41] font-bold text-[11px] w-8 text-right">
                        {isMinerRunning ? `${load}%` : '0%'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { SystemHardwareStats, PoolsConfigMap, PoolLiveStats } from '../types';
import { Cpu, Server, Clock, HardDrive, ShieldCheck, Zap } from 'lucide-react';

interface SystemStatsPanelProps {
  systemStats: SystemHardwareStats | null;
  poolsConfig: PoolsConfigMap;
  poolLiveStatsMap: Record<string, PoolLiveStats>;
  isMinerRunning: boolean;
  selectedMode: string;
}

export const SystemStatsPanel: React.FC<SystemStatsPanelProps> = ({
  systemStats,
  poolsConfig,
  poolLiveStatsMap,
  isMinerRunning,
  selectedMode,
}) => {
  // Format uptime
  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Get active pool summary strings
  const activePoolItems = Object.entries(poolsConfig).filter(
    ([_, p]) => p.enabled && p.cores && p.cores.length > 0
  );

  const totalHashRateDisplay = () => {
    if (!isMinerRunning) return '0.00 kH/s';
    const total = systemStats?.overallHashrateKhs || 0;
    return total >= 1000 ? `${(total / 1000).toFixed(2)} MH/s` : `${total.toFixed(2)} kH/s`;
  };

  const currentPoolData = selectedMode !== 'Multi-View' ? poolsConfig[selectedMode] : null;

  return (
    <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-3.5 sm:p-5 shadow-xl space-y-3.5 sm:space-y-5">
      {/* Total Hash Header Card */}
      <div className="bg-[#0c0c0c] p-3.5 sm:p-5 rounded-sm border border-[#1a1a1a]">
        <div className="text-[10px] font-mono font-bold text-[#00FF41] uppercase tracking-widest flex items-center space-x-1.5">
          <Zap className="w-4 h-4" />
          <span>TOTAL COMBINED HASH</span>
        </div>
        <div className="text-2xl sm:text-4xl font-extrabold font-mono text-[#00FF41] mt-1 tracking-tighter drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]">
          {totalHashRateDisplay()}
        </div>
      </div>

      {/* Selected Pool Info or Multi-View Info */}
      <div className="space-y-3.5 text-xs font-mono">
        <div>
          <div className="text-[#555] uppercase tracking-widest font-semibold text-[10px]">VIEW / POOL NAME</div>
          <div className="text-[#e0e0e0] font-bold text-sm mt-0.5 truncate uppercase">
            {selectedMode === 'Multi-View'
              ? 'Multi-View (Parallel Workers)'
              : currentPoolData?.name || selectedMode}
          </div>
        </div>

        <div>
          <div className="text-[#555] uppercase tracking-widest font-semibold text-[10px]">POOL ADDRESS</div>
          <div className="text-[#aaa] font-medium mt-0.5 break-all">
            {selectedMode === 'Multi-View' ? (
              <span className="text-[#00FF41]">
                {activePoolItems.length} pool(s) configured
              </span>
            ) : currentPoolData?.addr ? (
              `${currentPoolData.addr}:${currentPoolData.port}`
            ) : (
              'Not Configured'
            )}
          </div>
        </div>

        <div>
          <div className="text-[#555] uppercase tracking-widest font-semibold text-[10px]">WORKER NAME</div>
          <div className="text-[#aaa] font-medium mt-0.5 truncate">
            {selectedMode === 'Multi-View'
              ? 'Multi-Worker'
              : currentPoolData?.worker || 'Default'}
          </div>
        </div>

        <div>
          <div className="text-[#555] uppercase tracking-widest font-semibold text-[10px] flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-[#00FF41]" />
            <span>SESSION UPTIME</span>
          </div>
          <div className="text-[#e0e0e0] font-bold text-sm mt-0.5">
            {formatUptime(systemStats?.uptimeSeconds || 0)}
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-[#1a1a1a]" />

      {/* Active Pool Core Allocations */}
      <div>
        <div className="text-[10px] font-mono text-[#555] font-semibold uppercase tracking-widest mb-2 flex items-center justify-between">
          <span>ACTIVE TASKSET POOLS</span>
          <Server className="w-3.5 h-3.5 text-[#00FF41]" />
        </div>

        {activePoolItems.length > 0 ? (
          <div className="space-y-1.5 font-mono text-xs">
            {activePoolItems.map(([pk, p]) => (
              <div
                key={pk}
                className="bg-[#0c0c0c] p-2.5 rounded-sm border border-[#1a1a1a] flex items-center justify-between"
              >
                <div className="truncate pr-2">
                  <span className="text-[#00FF41] font-bold uppercase">{p.name}</span>
                </div>
                <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#00FF41] rounded-sm text-[10px] font-bold border border-[#222] whitespace-nowrap">
                  Cores: {p.cores?.sort().join(',')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-mono text-[#555] bg-[#0c0c0c] p-3 rounded-sm border border-[#1a1a1a] text-center uppercase tracking-widest">
            No pools active
          </div>
        )}
      </div>

      <div className="h-[1px] bg-[#1a1a1a]" />

      {/* Hardware Rig Specs */}
      <div className="space-y-3 font-mono text-xs">
        <div className="text-[#555] uppercase tracking-widest font-semibold flex items-center space-x-1 text-[10px]">
          <HardDrive className="w-3.5 h-3.5 text-[#00FF41]" />
          <span>HARDWARE PLATFORM</span>
        </div>
        <div className="bg-[#0c0c0c] p-3 rounded-sm border border-[#1a1a1a] space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[#555]">Board:</span>
            <span className="text-[#e0e0e0] font-bold">Raspberry Pi 5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Cores:</span>
            <span className="text-[#e0e0e0] font-bold">4x Cortex-A76</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Arch:</span>
            <span className="text-[#e0e0e0] font-bold">aarch64 / NEON</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">RAM Load:</span>
            <span className="text-[#00FF41] font-bold">{systemStats?.ramUsagePercent || 22}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

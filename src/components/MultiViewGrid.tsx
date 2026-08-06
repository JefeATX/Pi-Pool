import React from 'react';
import { PoolsConfigMap, PoolLiveStats } from '../types';
import { Layers } from 'lucide-react';

interface MultiViewGridProps {
  poolsConfig: PoolsConfigMap;
  poolLiveStatsMap: Record<string, PoolLiveStats>;
  isMinerRunning: boolean;
}

export const MultiViewGrid: React.FC<MultiViewGridProps> = ({
  poolsConfig,
  poolLiveStatsMap,
  isMinerRunning,
}) => {
  const displayKeys = ['Pool 1', 'Pool 2', 'Pool 3', 'Pool 4'];
  const enabledKeys = displayKeys.filter((key) => poolsConfig[key]?.enabled);

  if (enabledKeys.length === 0) {
    return (
      <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-12 text-center text-[#555]">
        <Layers className="w-12 h-12 mx-auto mb-4 text-[#333]" />
        <h3 className="text-lg font-bold font-mono text-[#e0e0e0] uppercase">No Enabled Pools for Multi-View</h3>
        <p className="text-sm text-[#555] mt-2 max-w-md mx-auto font-mono">
          Please enable one or more pools and assign CPU cores in Settings to view parallel miner operations here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {enabledKeys.map((poolKey) => {
        const pool = poolsConfig[poolKey];
        const stats = poolLiveStatsMap[poolKey];

        const formattedHashrate = () => {
          if (!pool.enabled) return 'Disabled';
          if (!isMinerRunning) return 'N/A';
          if (!stats || stats.hashrateKhs === 0) return 'Connecting...';
          const khs = stats.hashrateKhs;
          return khs >= 1000 ? `${(khs / 1000).toFixed(2)} MH/s` : `${khs.toFixed(2)} kH/s`;
        };

        return (
          <div
            key={poolKey}
            className="bg-[#111] rounded-sm border border-[#1a1a1a] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a] mb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#00FF41] uppercase tracking-widest">
                    {poolKey}
                  </span>
                  <h3 className="text-lg font-bold font-mono text-[#e0e0e0] truncate uppercase">
                    {pool.name}
                  </h3>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-bold border uppercase ${
                    !pool.enabled
                      ? 'bg-[#1a1a1a] text-[#555] border-[#222]'
                      : isMinerRunning && stats?.status === 'Running'
                      ? 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30'
                      : 'bg-[#1a1a1a] text-[#555] border-[#222]'
                  }`}
                >
                  {isMinerRunning && stats?.status === 'Running' ? 'Running' : 'Idle'}
                </span>
              </div>

              {/* Hashrate Big Number */}
              <div className="mb-4">
                <div className="text-[10px] font-mono text-[#555] uppercase font-semibold tracking-widest">
                  Hash Rate
                </div>
                <div className="text-3xl font-extrabold font-mono text-[#00FF41] mt-0.5 drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]">
                  {formattedHashrate()}
                </div>
              </div>

              {/* Stats Table */}
              <div className="grid grid-cols-3 gap-2 bg-[#0c0c0c] p-3 rounded-sm border border-[#1a1a1a] text-center font-mono">
                <div>
                  <div className="text-[10px] text-[#555] uppercase tracking-widest">ACC</div>
                  <div className="text-base font-bold text-[#00FF41] mt-0.5">
                    {stats ? stats.acceptedShares : '-'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#555] uppercase tracking-widest">REJ</div>
                  <div className="text-base font-bold text-rose-500 mt-0.5">
                    {stats ? stats.rejectedShares : '-'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#555] uppercase tracking-widest">ACC / MIN</div>
                  <div className="text-base font-bold text-[#e0e0e0] mt-0.5">
                    {stats ? stats.acceptedPerMin : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Cores & Wallet info */}
            <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex items-center justify-between text-xs font-mono text-[#555]">
              <span className="truncate max-w-[180px]">
                {pool.addr}:{pool.port}
              </span>
              <span className="px-2 py-0.5 bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 rounded-sm text-[10px] font-bold uppercase">
                Cores: {pool.cores?.join(',') || 'None'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

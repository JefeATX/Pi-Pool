import React, { useState, useEffect } from 'react';
import { PoolsConfigMap, PoolLiveStats, SystemHardwareStats, CoreUsage, HistoricalDataPoint, LogMessage } from './types';
import { Header } from './components/Header';
import { PoolStrip } from './components/PoolStrip';
import { PoolDetailCard } from './components/PoolDetailCard';
import { MultiViewGrid } from './components/MultiViewGrid';
import { SystemStatsPanel } from './components/SystemStatsPanel';
import { HashrateChart } from './components/HashrateChart';
import { PoolSettings } from './components/PoolSettings';
import { LiveTerminal } from './components/LiveTerminal';
import { ProfitabilityCalculator } from './components/ProfitabilityCalculator';
import { PoolsAndWalletsLinks } from './components/PoolsAndWalletsLinks';

export default function App() {
  const [poolsConfig, setPoolsConfig] = useState<PoolsConfigMap>({});
  const [selectedMode, setSelectedMode] = useState<string>('Pool 1');
  const [isMinerRunning, setIsMinerRunning] = useState<boolean>(false);
  const [systemStats, setSystemStats] = useState<SystemHardwareStats | null>(null);
  const [poolLiveStatsMap, setPoolLiveStatsMap] = useState<Record<string, PoolLiveStats>>({});
  const [coreUsages, setCoreUsages] = useState<CoreUsage[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'logs' | 'calculator' | 'links'>('dashboard');

  // Initial load config
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.pools) {
          setPoolsConfig(data.pools);
          // Set initial mode to first enabled pool if available
          const enabledKey = Object.keys(data.pools).find((k) => data.pools[k]?.enabled);
          if (enabledKey) setSelectedMode(enabledKey);
        }
      })
      .catch((e) => console.error('Failed to load initial pool config:', e));
  }, []);

  // Poll live status every 2 seconds
  useEffect(() => {
    let isMounted = true;
    const pollStatus = async () => {
      try {
        const res = await fetch('/api/miner/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        setIsMinerRunning(!!data.isMinerRunning);
        if (data.systemStats) setSystemStats(data.systemStats);
        setPoolLiveStatsMap(data.poolStatsMap || {});
        setCoreUsages(data.coreUsages || []);
        setHistoricalData(data.historicalData || []);
        if (Array.isArray(data.recentLogs)) {
          setLogs(data.recentLogs);
        }
      } catch (e) {
        // Ignore temporary network disconnects or dev server restarts
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggleMiner = async () => {
    const endpoint = isMinerRunning ? '/api/miner/stop' : '/api/miner/start';
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to toggle miner process.');
        return;
      }
      setIsMinerRunning(data.isMinerRunning);
    } catch (e: any) {
      alert('Network error toggling miner.');
    }
  };

  const handleSaveConfig = async (updatedPools: PoolsConfigMap) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pools: updatedPools }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to save configuration.');
    }

    setPoolsConfig(data.pools);
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'POST' });
    } catch (e) {
      console.error('Failed to clear server logs:', e);
    }
    setLogs([]);
  };

  // Build active pools label
  const activePoolItems = Object.entries(poolsConfig).filter(
    ([_, p]) => p.enabled && p.cores && p.cores.length > 0
  );
  const activePoolsText =
    activePoolItems.length > 0 && isMinerRunning
      ? activePoolItems.map(([_, p]) => `${p.name} [cores ${p.cores.join(',')}]`).join(' | ')
      : 'No pools active';

  return (
    <div className="min-h-screen bg-[#080808] text-[#e0e0e0] font-sans selection:bg-[#00FF41] selection:text-black">
      {/* Top Header */}
      <Header
        isMinerRunning={isMinerRunning}
        onToggleMiner={handleToggleMiner}
        systemStats={systemStats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePoolsText={activePoolsText}
      />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-5">
        {/* VIEW 1: MAIN DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Quick Pool View Switcher Strip */}
            <PoolStrip
              poolsConfig={poolsConfig}
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
            />

            {/* Live Timeline Chart */}
            <HashrateChart data={historicalData} />

            {/* Main Content Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
              {/* Left Column: Pool Detail Card or Multi-View Grid */}
              <div className="lg:col-span-2">
                {selectedMode === 'Multi-View' ? (
                  <MultiViewGrid
                    poolsConfig={poolsConfig}
                    poolLiveStatsMap={poolLiveStatsMap}
                    isMinerRunning={isMinerRunning}
                  />
                ) : (
                  <PoolDetailCard
                    poolKey={selectedMode}
                    poolConfig={poolsConfig[selectedMode] || { name: selectedMode, addr: '', port: '', worker: '', pass: 'x', wallet: '', enabled: false, log_enabled: false, cores: [] }}
                    liveStats={poolLiveStatsMap[selectedMode] || null}
                    coreUsages={coreUsages}
                    isMinerRunning={isMinerRunning}
                  />
                )}
              </div>

              {/* Right Column: System Rig & Taskset Stats Panel */}
              <div>
                <SystemStatsPanel
                  systemStats={systemStats}
                  poolsConfig={poolsConfig}
                  poolLiveStatsMap={poolLiveStatsMap}
                  isMinerRunning={isMinerRunning}
                  selectedMode={selectedMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: POOL CONFIGURATION SETTINGS */}
        {activeTab === 'settings' && (
          <PoolSettings
            poolsConfig={poolsConfig}
            onSaveConfig={handleSaveConfig}
            onClose={() => setActiveTab('dashboard')}
          />
        )}

        {/* VIEW 3: LIVE TERMINAL LOGS */}
        {activeTab === 'logs' && (
          <LiveTerminal logs={logs} onClearLogs={handleClearLogs} />
        )}

        {/* VIEW 4: PROFITABILITY CALCULATOR */}
        {activeTab === 'calculator' && (
          <ProfitabilityCalculator currentTotalKhs={systemStats?.overallHashrateKhs || 0} />
        )}

        {/* VIEW 5: POOLS & WALLETS DIRECTORY */}
        {activeTab === 'links' && (
          <PoolsAndWalletsLinks />
        )}
      </main>
    </div>
  );
}

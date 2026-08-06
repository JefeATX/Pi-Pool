import React from 'react';
import { Play, Square, Settings, Cpu, Terminal, Calculator, ExternalLink, LayoutDashboard } from 'lucide-react';
import { SystemHardwareStats } from '../types';

interface HeaderProps {
  isMinerRunning: boolean;
  onToggleMiner: () => void;
  systemStats: SystemHardwareStats | null;
  activeTab: 'dashboard' | 'settings' | 'logs' | 'calculator' | 'links';
  setActiveTab: (tab: 'dashboard' | 'settings' | 'logs' | 'calculator' | 'links') => void;
  activePoolsText: string;
}

const RaspberryIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top Leaves */}
    <path
      d="M12 2C10.2 3.8 9.8 5.8 12 7.5C14.2 5.8 13.8 3.8 12 2Z"
      className="text-[#00FF41]"
    />
    <path
      d="M6.5 5.5C5.8 3.8 4.2 3 2 3.5C2.8 5.8 4.5 7.2 6.8 7.5C5.8 6.8 6.2 5.8 6.5 5.5Z"
      className="text-[#00FF41]"
    />
    <path
      d="M17.5 5.5C18.2 3.8 19.8 3 22 3.5C21.2 5.8 19.5 7.2 17.2 7.5C18.2 6.8 17.8 5.8 17.5 5.5Z"
      className="text-[#00FF41]"
    />
    {/* Raspberry Berry Drupelets */}
    <circle cx="8.5" cy="10" r="2.2" />
    <circle cx="15.5" cy="10" r="2.2" />
    <circle cx="12" cy="11.8" r="2.3" />
    <circle cx="7.2" cy="14.2" r="2.2" />
    <circle cx="16.8" cy="14.2" r="2.2" />
    <circle cx="9.8" cy="16.8" r="2.2" />
    <circle cx="14.2" cy="16.8" r="2.2" />
    <circle cx="12" cy="20" r="2" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  isMinerRunning,
  onToggleMiner,
  systemStats,
  activeTab,
  setActiveTab,
  activePoolsText,
}) => {
  const cpuTemp = systemStats?.cpuTempC ?? 41.5;

  const getTempColorClass = (temp: number) => {
    if (temp < 60) return 'text-[#00FF41] bg-[#00FF41]/10 border-[#00FF41]/30';
    if (temp < 78) return 'text-orange-500 bg-orange-950/40 border-orange-800/50';
    return 'text-rose-500 bg-rose-950/40 border-rose-800/50 animate-pulse';
  };

  return (
    <header className="bg-[#0c0c0c] border-b border-[#1a1a1a] text-[#e0e0e0] px-3 sm:px-4 py-2 sm:py-2.5 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-3">
        {/* Left: Branding & Main Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.15)] flex items-center justify-center shrink-0">
              <RaspberryIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 leading-none">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#00FF41] font-mono uppercase">Pi-Pool</h1>
                <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm bg-[#1a1a1a] text-[#888] border border-[#222]">
                  v2.0
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-[#666] leading-tight mt-0.5">Crypto Mining Dash</p>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#1a1a1a] hidden sm:block" />

          {/* Start/Stop Toggle & Status LED */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={onToggleMiner}
              className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-sm font-bold text-xs tracking-wider transition-all shadow-md flex items-center justify-center space-x-1.5 active:scale-95 ${
                isMinerRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30 uppercase'
                  : 'bg-[#00FF41] hover:bg-[#00cc34] text-black font-extrabold uppercase shadow-[0_0_12px_rgba(0,255,65,0.3)]'
              }`}
            >
              {isMinerRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start</span>
                </>
              )}
            </button>

            {/* Status indicator LED */}
            <div className="h-8 sm:h-9 flex items-center space-x-1.5 sm:space-x-2 bg-[#111] px-2 sm:px-2.5 rounded-sm border border-[#1a1a1a] text-xs">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isMinerRunning ? 'bg-[#00FF41] shadow-[0_0_8px_#00FF41]' : 'bg-rose-500'
                }`}
              />
              <span className="font-mono text-[#aaa] font-medium uppercase tracking-wider text-[9px] sm:text-[10px]">
                {isMinerRunning ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Main Navigation Tabs */}
        <div className="flex items-center justify-center my-0.5 md:my-0 overflow-x-auto max-w-full no-scrollbar">
          <div className="h-8 sm:h-9 flex items-center bg-[#111] p-0.5 sm:p-1 rounded-sm border border-[#1a1a1a] space-x-0.5 sm:space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`h-7 flex items-center space-x-1 px-2.5 sm:px-3 rounded-sm text-xs font-mono font-bold transition-all uppercase whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`h-7 flex items-center space-x-1 px-2.5 sm:px-3 rounded-sm text-xs font-mono font-bold transition-all uppercase whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`h-7 flex items-center space-x-1 px-2.5 sm:px-3 rounded-sm text-xs font-mono font-bold transition-all uppercase whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`h-7 flex items-center space-x-1 px-2.5 sm:px-3 rounded-sm text-xs font-mono font-bold transition-all uppercase whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calc</span>
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={`h-7 flex items-center space-x-1 px-2.5 sm:px-3 rounded-sm text-xs font-mono font-bold transition-all uppercase whitespace-nowrap ${
                activeTab === 'links'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Links</span>
            </button>
          </div>
        </div>

        {/* Right: Telemetry & Hardware Stats */}
        <div className="flex items-center justify-end space-x-2 shrink-0">
          <div className="hidden xl:flex items-center space-x-1.5 h-8 sm:h-9 text-xs bg-[#111] px-2.5 rounded-sm border border-[#1a1a1a] max-w-[200px] truncate">
            <span className="text-[#666] font-semibold uppercase text-[10px]">ACTIVE:</span>
            <span className="font-mono text-[#00FF41] truncate text-[10px]">{activePoolsText}</span>
          </div>

          <div
            className={`h-8 sm:h-9 flex items-center space-x-1.5 px-2 sm:px-2.5 rounded-sm border text-xs font-mono font-bold ${getTempColorClass(
              cpuTemp
            )}`}
          >
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] sm:text-[11px] whitespace-nowrap">CPU {cpuTemp.toFixed(1)}°C</span>
          </div>
        </div>
      </div>
    </header>
  );
};

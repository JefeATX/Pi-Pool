import React, { useState, useRef, useEffect } from 'react';
import { LogMessage } from '../types';
import { Terminal, Download, Trash2, Pause, Play, Filter, Search } from 'lucide-react';

interface LiveTerminalProps {
  logs: LogMessage[];
  onClearLogs?: () => void;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.poolName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleExportLogs = () => {
    const textContent = logs
      .map((l) => `[${l.timestamp}] [${l.poolName}] (${l.type.toUpperCase()}): ${l.message}`)
      .join('\n');

    const nowStr = new Date().toISOString().split('T')[0];
    const fileName = `miner_log_export_${nowStr}.txt`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLogTypeBadge = (type: LogMessage['type']) => {
    switch (type) {
      case 'accepted':
        return 'text-[#00FF41] bg-[#00FF41]/10 border-[#00FF41]/30';
      case 'rejected':
        return 'text-rose-500 bg-rose-950/80 border-rose-800';
      case 'stratum':
        return 'text-orange-400 bg-orange-950/80 border-orange-800';
      case 'system':
        return 'text-sky-400 bg-sky-950/80 border-sky-800';
      default:
        return 'text-[#555] bg-[#1a1a1a] border-[#222]';
    }
  };

  return (
    <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-5 shadow-xl space-y-4">
      {/* Top Bar Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a1a1a]">
        <div className="flex items-center space-x-2">
          <Terminal className="w-6 h-6 text-[#00FF41]" />
          <div>
            <h2 className="text-xl font-bold font-mono text-[#e0e0e0] uppercase">Live cpuminer Console Logs</h2>
            <p className="text-xs text-[#555] font-mono">Real-time stdout/stderr buffer and share acceptance logging</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm font-mono text-xs border uppercase transition-all ${
              autoScroll
                ? 'bg-[#1a1a1a] text-[#e0e0e0] border-[#222]'
                : 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30'
            }`}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoScroll ? 'Auto-Scroll ON' : 'Paused'}</span>
          </button>

          {/* Export Log File */}
          <button
            onClick={handleExportLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm font-mono text-xs bg-[#00FF41] text-black font-extrabold hover:bg-[#00cc34] uppercase transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Log File</span>
          </button>

          {/* Clear Logs */}
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm font-mono text-xs bg-rose-950/80 text-rose-300 font-bold border border-rose-800 hover:bg-rose-900 uppercase transition-colors shadow-sm"
              title="Clear all console logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['all', 'accepted', 'rejected', 'system', 'stratum'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-sm font-bold uppercase transition-all border ${
                filterType === type
                  ? 'bg-[#00FF41] text-black border-[#00FF41]'
                  : 'bg-[#0c0c0c] text-[#555] border-[#1a1a1a] hover:text-[#e0e0e0]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#555]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search log output..."
            className="w-full bg-[#0c0c0c] border border-[#1a1a1a] rounded-sm pl-9 pr-3 py-1.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] text-xs font-mono"
          />
        </div>
      </div>

      {/* Terminal View Output */}
      <div className="bg-[#0c0c0c] rounded-sm border border-[#1a1a1a] p-3 sm:p-4 font-mono text-xs h-[260px] sm:h-[350px] md:h-[450px] overflow-y-auto space-y-1.5 shadow-inner touch-pan-y">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 leading-relaxed hover:bg-[#1a1a1a]/50 p-1 rounded-sm">
              <span className="text-[#555] flex-shrink-0">[{log.timestamp}]</span>
              <span
                className={`px-1.5 py-0.2 rounded-sm text-[10px] font-bold border flex-shrink-0 uppercase ${getLogTypeBadge(
                  log.type
                )}`}
              >
                {log.type}
              </span>
              <span className="text-[#00FF41] font-bold flex-shrink-0">[{log.poolName}]</span>
              <span className="text-[#e0e0e0] break-all">{log.message}</span>
            </div>
          ))
        ) : (
          <div className="text-center text-[#555] py-20 font-mono uppercase tracking-widest text-xs">
            No console output matches current filter criteria.
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

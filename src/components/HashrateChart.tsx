import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { HistoricalDataPoint } from '../types';
import { TrendingUp, Flame } from 'lucide-react';

interface HashrateChartProps {
  data: HistoricalDataPoint[];
}

export const HashrateChart: React.FC<HashrateChartProps> = ({ data }) => {
  return (
    <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-3.5 sm:p-5 shadow-xl mb-3.5 sm:mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-[#1a1a1a]">
        <div>
          <h3 className="text-sm sm:text-base font-bold font-mono text-[#e0e0e0] uppercase tracking-wider flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FF41]" />
            <span>Live Hash Rate & Thermal Timeline</span>
          </h3>
          <p className="text-[10px] sm:text-xs text-[#555] font-mono mt-0.5">
            Real-time cpuminer throughput (kH/s) vs Raspberry Pi SoC CPU Temperature (°C)
          </p>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#00FF41] shadow-[0_0_6px_#00FF41] inline-block" />
            <span className="text-[#aaa] uppercase text-[10px] sm:text-[11px]">Hash Rate (kH/s)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-orange-500 inline-block" />
            <span className="text-[#aaa] uppercase text-[10px] sm:text-[11px]">Temp (°C)</span>
          </div>
        </div>
      </div>

      <div className="h-36 sm:h-52 md:h-64 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF41" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00FF41" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
              <XAxis dataKey="time" stroke="#555" fontSize={11} fontFamily="monospace" />
              <YAxis yAxisId="left" stroke="#00FF41" fontSize={11} fontFamily="monospace" />
              <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={11} fontFamily="monospace" domain={[30, 90]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c0c0c',
                  borderColor: '#1a1a1a',
                  borderRadius: '0.25rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#e0e0e0',
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalKhs"
                name="Hash Rate (kH/s)"
                stroke="#00FF41"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#hashGradient)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cpuTempC"
                name="CPU Temp (°C)"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tempGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[#555] font-mono text-xs uppercase tracking-widest">
            Waiting for timeline data stream...
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { POPULAR_COINS } from '../data/coins';
import { Calculator, DollarSign, Zap, Coins, TrendingUp } from 'lucide-react';

interface ProfitabilityCalculatorProps {
  currentTotalKhs: number;
}

export const ProfitabilityCalculator: React.FC<ProfitabilityCalculatorProps> = ({
  currentTotalKhs,
}) => {
  const [selectedCoinId, setSelectedCoinId] = useState<string>('verus');
  const [userHashrateKhs, setUserHashrateKhs] = useState<number>(
    currentTotalKhs > 0 ? currentTotalKhs : 7.4
  );
  const [powerWatts, setPowerWatts] = useState<number>(6.5); // Default Pi 5 under full load ~6.5W
  const [costPerKwh, setCostPerKwh] = useState<number>(0.12); // Average electricity cost

  const coin = POPULAR_COINS.find((c) => c.id === selectedCoinId) || POPULAR_COINS[0];

  // Calculation estimates
  const dailyPowerKwh = (powerWatts * 24) / 1000;
  const dailyPowerCostUsd = dailyPowerKwh * costPerKwh;

  // Revenue estimation formula based on coin difficulty and block reward
  const dailyCoins = (userHashrateKhs * 86400 * coin.blockReward) / (coin.difficulty * 100);
  const dailyRevenueUsd = dailyCoins * coin.priceUsd;
  const dailyProfitUsd = dailyRevenueUsd - dailyPowerCostUsd;

  const weeklyProfitUsd = dailyProfitUsd * 7;
  const monthlyProfitUsd = dailyProfitUsd * 30;

  return (
    <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-3.5 sm:p-5 shadow-xl space-y-4 sm:space-y-6">
      <div className="flex items-center space-x-3 pb-3 sm:pb-4 border-b border-[#1a1a1a]">
        <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-[#00FF41]" />
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-mono text-[#e0e0e0] uppercase">Crypto Yield & Electricity Cost Calculator</h2>
          <p className="text-[10px] sm:text-xs text-[#555] font-mono">
            Estimate Raspberry Pi mining returns and power overhead
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 font-mono text-xs">
        {/* Controls Column */}
        <div className="bg-[#0c0c0c] p-5 rounded-sm border border-[#1a1a1a] space-y-4">
          <div>
            <label className="block text-[#555] font-semibold mb-1.5 flex items-center space-x-1 text-[10px] uppercase tracking-widest">
              <Coins className="w-3.5 h-3.5 text-[#00FF41]" />
              <span>Select Mining Coin / Algo:</span>
            </label>
            <select
              value={selectedCoinId}
              onChange={(e) => setSelectedCoinId(e.target.value)}
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] font-bold text-xs"
            >
              {POPULAR_COINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.symbol}) - ${c.priceUsd}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#555] font-semibold mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest">
              <span>Hash Rate (kH/s):</span>
              {currentTotalKhs > 0 && (
                <button
                  type="button"
                  onClick={() => setUserHashrateKhs(currentTotalKhs)}
                  className="text-[10px] text-[#00FF41] hover:underline uppercase"
                >
                  Use Live ({currentTotalKhs.toFixed(2)})
                </button>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              value={userHashrateKhs}
              onChange={(e) => setUserHashrateKhs(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] font-bold text-xs"
            />
          </div>

          <div>
            <label className="block text-[#555] font-semibold mb-1.5 flex items-center space-x-1 text-[10px] uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 text-[#00FF41]" />
              <span>Power Consumption (Watts):</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={powerWatts}
              onChange={(e) => setPowerWatts(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] font-bold text-xs"
            />
            <p className="text-[10px] text-[#555] mt-1">Pi 4 ~4.5W | Pi 5 ~6.5W - 8.0W under load</p>
          </div>

          <div>
            <label className="block text-[#555] font-semibold mb-1.5 flex items-center space-x-1 text-[10px] uppercase tracking-widest">
              <DollarSign className="w-3.5 h-3.5 text-[#00FF41]" />
              <span>Electricity Cost ($ / kWh):</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={costPerKwh}
              onChange={(e) => setCostPerKwh(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] font-bold text-xs"
            />
          </div>
        </div>

        {/* Financial Results Display */}
        <div className="lg:col-span-2 bg-[#0c0c0c] p-6 rounded-sm border border-[#1a1a1a] space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a]">
              <span className="text-xs font-bold text-[#e0e0e0] uppercase tracking-widest">
                ESTIMATED {coin.symbol} YIELD BREAKDOWN
              </span>
              <span className="text-xs text-[#00FF41] font-bold">
                1 {coin.symbol} = ${coin.priceUsd.toFixed(4)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="bg-[#080808] p-4 rounded-sm border border-[#1a1a1a]">
                <div className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">Est. Daily Revenue</div>
                <div className="text-xl font-bold text-[#00FF41] mt-1">
                  ${dailyRevenueUsd.toFixed(3)}
                </div>
                <div className="text-[10px] text-[#555] mt-0.5">
                  ~{dailyCoins.toFixed(3)} {coin.symbol}
                </div>
              </div>

              <div className="bg-[#080808] p-4 rounded-sm border border-[#1a1a1a]">
                <div className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">Power Cost (24h)</div>
                <div className="text-xl font-bold text-rose-500 mt-1">
                  -${dailyPowerCostUsd.toFixed(3)}
                </div>
                <div className="text-[10px] text-[#555] mt-0.5">
                  {dailyPowerKwh.toFixed(2)} kWh / day
                </div>
              </div>

              <div className="bg-[#080808] p-4 rounded-sm border border-[#00FF41]/30 bg-[#00FF41]/5">
                <div className="text-[10px] text-[#00FF41] uppercase tracking-widest font-bold">Net Daily Profit</div>
                <div className={`text-2xl font-extrabold mt-1 ${dailyProfitUsd >= 0 ? 'text-[#00FF41]' : 'text-rose-500'}`}>
                  ${dailyProfitUsd.toFixed(3)}
                </div>
                <div className="text-[10px] text-[#555] mt-0.5">After electricity</div>
              </div>
            </div>

            {/* Timeframe Projection Table */}
            <div className="bg-[#080808] rounded-sm border border-[#1a1a1a] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#111] border-b border-[#1a1a1a] text-[10px] text-[#555] uppercase tracking-widest">
                    <th className="p-3">Period</th>
                    <th className="p-3">Crypto Mined</th>
                    <th className="p-3">Gross Revenue</th>
                    <th className="p-3">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a] text-xs text-[#e0e0e0]">
                  <tr>
                    <td className="p-3 font-bold text-[#e0e0e0]">Daily</td>
                    <td className="p-3">{dailyCoins.toFixed(4)} {coin.symbol}</td>
                    <td className="p-3 text-[#00FF41]">${dailyRevenueUsd.toFixed(3)}</td>
                    <td className="p-3 font-bold text-[#00FF41]">${dailyProfitUsd.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#e0e0e0]">Weekly</td>
                    <td className="p-3">{(dailyCoins * 7).toFixed(4)} {coin.symbol}</td>
                    <td className="p-3 text-[#00FF41]">${(dailyRevenueUsd * 7).toFixed(3)}</td>
                    <td className="p-3 font-bold text-[#00FF41]">${weeklyProfitUsd.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#e0e0e0]">Monthly (30d)</td>
                    <td className="p-3">{(dailyCoins * 30).toFixed(4)} {coin.symbol}</td>
                    <td className="p-3 text-[#00FF41]">${(dailyRevenueUsd * 30).toFixed(3)}</td>
                    <td className="p-3 font-bold text-[#00FF41]">${monthlyProfitUsd.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { PoolsConfigMap, PoolConfig } from '../types';
import { MINER_ALGORITHMS } from '../data/coins';
import { Save, CheckCircle, AlertTriangle, Cpu, Server, Shield, FileText, Trash2, RotateCcw } from 'lucide-react';

interface PoolSettingsProps {
  poolsConfig: PoolsConfigMap;
  onSaveConfig: (updatedPools: PoolsConfigMap) => Promise<void>;
  onClose: () => void;
}

export const PoolSettings: React.FC<PoolSettingsProps> = ({
  poolsConfig,
  onSaveConfig,
  onClose,
}) => {
  const [localPools, setLocalPools] = useState<PoolsConfigMap>(() => JSON.parse(JSON.stringify(poolsConfig)));
  const [activeTab, setActiveTab] = useState<string>('Pool 1');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const poolKeys = ['Pool 1', 'Pool 2', 'Pool 3', 'Pool 4', 'Pool 5', 'Pool 6', 'Pool 7', 'Pool 8'];
  const totalSystemCores = [0, 1, 2, 3];

  // Calculate live core owners among enabled pools
  const getCoreOwnerMap = () => {
    const ownerMap: Record<number, string> = {};
    for (const pk of poolKeys) {
      const p = localPools[pk];
      if (p && p.enabled && Array.isArray(p.cores)) {
        for (const cid of p.cores) {
          ownerMap[cid] = pk;
        }
      }
    }
    return ownerMap;
  };

  const coreOwnerMap = getCoreOwnerMap();

  const handleFieldChange = (poolKey: string, field: keyof PoolConfig, value: any) => {
    setLocalPools((prev) => ({
      ...prev,
      [poolKey]: {
        ...prev[poolKey],
        [field]: value,
      },
    }));
    setErrorMessage(null);
  };

  const handleToggleCore = (poolKey: string, coreId: number) => {
    const currentCores = localPools[poolKey]?.cores || [];
    let updatedCores: number[];
    if (currentCores.includes(coreId)) {
      updatedCores = currentCores.filter((c) => c !== coreId);
    } else {
      updatedCores = [...currentCores, coreId].sort();
    }
    handleFieldChange(poolKey, 'cores', updatedCores);
  };

  const handleClearAll = () => {
    const clearedPools: PoolsConfigMap = {};
    poolKeys.forEach((pk) => {
      clearedPools[pk] = {
        name: pk,
        addr: '',
        port: '',
        worker: '',
        pass: 'x',
        wallet: '',
        enabled: false,
        log_enabled: pk === 'Pool 1' || pk === 'Pool 2',
        cores: [],
        algo: 'scrypt',
      };
    });
    setLocalPools(clearedPools);
    setSuccessMessage('Cleared all pool fields. Click Save & Exit to apply.');
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate core overlaps
    const assigned: Record<number, string> = {};
    let conflict: string | null = null;

    for (const pk of poolKeys) {
      const pool = localPools[pk];
      if (pool.enabled && Array.isArray(pool.cores)) {
        for (const cid of pool.cores) {
          if (assigned[cid]) {
            conflict = `Core ${cid} is assigned to both ${assigned[cid]} and ${pk}. Please remove duplicate core assignments before saving.`;
            break;
          }
          assigned[cid] = pk;
        }
      }
      if (conflict) break;
    }

    if (conflict) {
      setErrorMessage(conflict);
      setSaving(false);
      return;
    }

    try {
      await onSaveConfig(localPools);
      setSuccessMessage('Pool profiles successfully saved! Miner engine updated.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const defaultEmptyPool: PoolConfig = {
    name: activeTab,
    addr: '',
    port: '',
    worker: '',
    pass: 'x',
    wallet: '',
    enabled: false,
    log_enabled: false,
    cores: [],
    algo: 'sha256d',
  };
  const currentPool: PoolConfig = localPools[activeTab] || defaultEmptyPool;

  return (
    <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-5 shadow-2xl max-w-5xl mx-auto my-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1a1a1a] mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold font-mono text-[#e0e0e0] flex items-center space-x-2 uppercase">
            <Server className="w-6 h-6 text-[#00FF41]" />
            <span>Server Configuration Profiles</span>
          </h2>
          <p className="text-xs text-[#555] font-mono mt-0.5">
            Configure Stratum mining pools, wallet addresses, and per-core taskset CPU pinning
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearAll}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-sm font-mono text-xs font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 transition-colors uppercase"
            title="Reset all pool slots to blank defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All Pools</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm font-mono text-xs font-bold bg-[#1a1a1a] hover:bg-[#222] text-[#e0e0e0] transition-colors border border-[#222] uppercase"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-5 py-2 rounded-sm font-mono text-xs font-extrabold bg-[#00FF41] hover:bg-[#00cc34] text-black transition-all shadow-md uppercase disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Exit'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-sm bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-sm bg-[#00FF41]/10 border border-[#00FF41]/30 text-[#00FF41] font-mono text-xs flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-[#00FF41] flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Pool Profile Tabs (Pool 1 .. Pool 8) */}
      <div className="flex items-center space-x-1 border-b border-[#1a1a1a] pb-2 mb-6 overflow-x-auto no-scrollbar">
        {poolKeys.map((pk) => {
          const isSelected = activeTab === pk;
          const p = localPools[pk];
          const isEnabled = p?.enabled;

          return (
            <button
              key={pk}
              onClick={() => setActiveTab(pk)}
              className={`px-4 py-2 rounded-t-sm font-mono text-xs font-bold transition-all whitespace-nowrap border-t border-x uppercase ${
                isSelected
                  ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-md'
                  : isEnabled
                  ? 'bg-[#0c0c0c] text-[#00FF41] border-[#1a1a1a] hover:bg-[#111]'
                  : 'bg-[#080808] text-[#555] border-[#1a1a1a] hover:text-[#aaa]'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isEnabled ? 'bg-[#00FF41]' : 'bg-[#333]'
                  }`}
                />
                <span>{p?.name || pk}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Active Pool Settings Form */}
      <div className="bg-[#0c0c0c] p-6 rounded-sm border border-[#1a1a1a] space-y-6">
        {/* Toggle Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#1a1a1a]">
          <label className="flex items-center space-x-3 cursor-pointer bg-[#080808] p-3.5 rounded-sm border border-[#1a1a1a] hover:border-[#222] transition-colors">
            <input
              type="checkbox"
              checked={!!currentPool.enabled}
              onChange={(e) => handleFieldChange(activeTab, 'enabled', e.target.checked)}
              className="w-4 h-4 accent-[#00FF41] rounded-sm cursor-pointer"
            />
            <div className="font-mono">
              <div className="text-xs font-bold text-[#e0e0e0] uppercase">Enable Pool Profile</div>
              <p className="text-[11px] text-[#555]">Include this pool in parallel mining runtime</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer bg-[#080808] p-3.5 rounded-sm border border-[#1a1a1a] hover:border-[#222] transition-colors">
            <input
              type="checkbox"
              checked={!!currentPool.log_enabled}
              onChange={(e) => handleFieldChange(activeTab, 'log_enabled', e.target.checked)}
              className="w-4 h-4 accent-[#00FF41] rounded-sm cursor-pointer"
            />
            <div className="font-mono flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-[#00FF41]" />
              <div>
                <div className="text-xs font-bold text-[#e0e0e0] uppercase">Save Miner Logs to File</div>
                <p className="text-[11px] text-[#555]">Persist output to miner_{currentPool.name}_YYYY-MM-DD.txt</p>
              </div>
            </div>
          </label>
        </div>

        {/* Core Input Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div>
            <label className="block text-[#555] font-semibold mb-1.5 uppercase text-[10px] tracking-widest">
              Pool Display Name:
            </label>
            <input
              type="text"
              value={currentPool.name || ''}
              onChange={(e) => handleFieldChange(activeTab, 'name', e.target.value)}
              placeholder="e.g. Verus_Zergpool"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-medium text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[#555] font-semibold uppercase text-[10px] tracking-widest">
                Supported Miner Software:
              </label>
              <span className="text-[10px] font-mono text-[#00FF41] bg-[#00FF41]/10 px-1.5 py-0.5 rounded-sm border border-[#00FF41]/30">
                Direct Native API
              </span>
            </div>
            <select
              value={
                currentPool.minerProgram ||
                (currentPool.algo === 'randomx' || currentPool.algo === 'ghostrider'
                  ? 'xmrig'
                  : currentPool.algo === 'duco-s1' || currentPool.algo === 'duco-avr'
                  ? 'duino-coin'
                  : 'cpuminer-multi')
              }
              onChange={(e) => handleFieldChange(activeTab, 'minerProgram', e.target.value)}
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-medium text-sm"
            >
              <option value="cpuminer-multi">cpuminer-multi (SHA256d / Scrypt / Yescrypt)</option>
              <option value="duino-coin">Duino-Coin Miner (DUCO-S1 / AVR Serial)</option>
              <option value="xmrig">XMRig (RandomX / Monero / GhostRider)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[#555] font-semibold uppercase text-[10px] tracking-widest">
                Algorithm (-a):
              </label>
            </div>
            <select
              value={currentPool.algo || 'scrypt'}
              onChange={(e) => {
                const newAlgo = e.target.value;
                handleFieldChange(activeTab, 'algo', newAlgo);
                const matchAlgo = MINER_ALGORITHMS.find((a) => a.id === newAlgo);
                if (matchAlgo) {
                  handleFieldChange(activeTab, 'minerProgram', matchAlgo.minerProgram);
                }
              }}
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-medium text-sm"
            >
              {MINER_ALGORITHMS.map((algo) => (
                <option key={algo.id} value={algo.id}>
                  {algo.name}
                </option>
              ))}
            </select>

            {currentPool.algo === 'duco-s1' && (
              <div className="mt-2 p-2.5 bg-[#00FF41]/10 border border-[#00FF41]/30 rounded-sm text-[11px] font-mono text-[#00FF41]">
                <strong>Duino-Coin DUCO-S1 CPU Mining:</strong> Enter your registered Duino-Coin account username in the Wallet field. Official server: <code className="bg-black px-1 py-0.5 rounded text-white">server.duinocoin.com:2811</code>.
              </div>
            )}

            {currentPool.algo === 'duco-avr' && (
              <div className="mt-2 p-2.5 bg-[#00FF41]/10 border border-[#00FF41]/30 rounded-sm text-[11px] font-mono text-[#00FF41]">
                <strong>Duino-Coin AVR Arduino USB Rig:</strong> Connect Arduino Nano/Uno boards via USB. Set Worker to your serial port (e.g. <code className="bg-black px-1 py-0.5 rounded text-white">/dev/ttyUSB0</code>), Password to baudrate (<code className="bg-black px-1 py-0.5 rounded text-white">115200</code>), and Wallet to your Duino-Coin username.
              </div>
            )}
          </div>

          <div>
            <label className="block text-[#555] font-semibold mb-1.5 uppercase text-[10px] tracking-widest">
              Pool Server Address:
            </label>
            <input
              type="text"
              value={currentPool.addr || ''}
              onChange={(e) => handleFieldChange(activeTab, 'addr', e.target.value)}
              placeholder="e.g. verushash.mine.zergpool.com"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-[#555] font-semibold mb-1.5 uppercase text-[10px] tracking-widest">
              Port:
            </label>
            <input
              type="text"
              value={currentPool.port || ''}
              onChange={(e) => handleFieldChange(activeTab, 'port', e.target.value)}
              placeholder="e.g. 3300"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-[#555] font-semibold mb-1.5 uppercase text-[10px] tracking-widest">
              Worker Name:
            </label>
            <input
              type="text"
              value={currentPool.worker || ''}
              onChange={(e) => handleFieldChange(activeTab, 'worker', e.target.value)}
              placeholder="e.g. Pi5_Rig_01"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-[#555] font-semibold mb-1.5 uppercase text-[10px] tracking-widest">
              Password:
            </label>
            <input
              type="text"
              value={currentPool.pass || ''}
              onChange={(e) => handleFieldChange(activeTab, 'pass', e.target.value)}
              placeholder="e.g. x or c=VRSC"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-medium text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#555] font-semibold mb-1.5 uppercase text-[10px] tracking-widest">
              Wallet Address:
            </label>
            <input
              type="text"
              value={currentPool.wallet || ''}
              onChange={(e) => handleFieldChange(activeTab, 'wallet', e.target.value)}
              placeholder="e.g. R9xW5jS4sQy4vM1284u9xXz1234567890"
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm px-3.5 py-2.5 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] transition-colors font-mono text-sm"
            />
          </div>
        </div>

        {/* Taskset CPU Core Allocation Matrix */}
        <div className="pt-4 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#e0e0e0] mb-2 uppercase">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#00FF41]" />
              <span>Taskset CPU Core Affinity (4 Cores Max):</span>
            </div>
            <span className="text-[10px] text-[#00FF41] bg-[#00FF41]/10 px-2 py-0.5 rounded-sm border border-[#00FF41]/30">
              Raspberry Pi Quad-Core
            </span>
          </div>

          <p className="text-xs text-[#555] font-mono mb-3">
            Select which of the 4 Cortex-A76 cores to pin to this mining profile. Cores claimed by another active pool are locked to prevent resource contention.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {totalSystemCores.map((cid) => {
              const isAssignedToThisPool = (currentPool.cores || []).includes(cid);
              const ownerPoolKey = coreOwnerMap[cid];
              const isClaimedByOther =
                ownerPoolKey && ownerPoolKey !== activeTab && localPools[ownerPoolKey]?.enabled;

              return (
                <button
                  key={cid}
                  type="button"
                  disabled={isClaimedByOther}
                  onClick={() => handleToggleCore(activeTab, cid)}
                  className={`flex flex-col items-center justify-center p-3 rounded-sm font-mono text-xs font-bold border transition-all uppercase ${
                    isAssignedToThisPool
                      ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                      : isClaimedByOther
                      ? 'bg-[#080808] text-[#444] border-[#1a1a1a] cursor-not-allowed opacity-50'
                      : 'bg-[#080808] text-[#e0e0e0] border-[#1a1a1a] hover:border-[#00FF41]/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-1 mb-1">
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm">Core {cid}</span>
                  </div>
                  {isAssignedToThisPool && (
                    <span className="text-[10px] bg-black text-[#00FF41] px-2 py-0.5 rounded-sm font-extrabold mt-0.5">
                      ASSIGNED
                    </span>
                  )}
                  {isClaimedByOther && (
                    <span className="text-[9px] text-rose-400 mt-0.5 truncate max-w-[100px]">
                      Locked ({ownerPoolKey})
                    </span>
                  )}
                  {!isAssignedToThisPool && !isClaimedByOther && (
                    <span className="text-[9px] text-[#555] mt-0.5">Available</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

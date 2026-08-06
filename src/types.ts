export interface PoolConfig {
  name: string;
  addr: string;
  port: string;
  worker: string;
  pass: string;
  wallet: string;
  enabled: boolean;
  log_enabled: boolean;
  cores: number[]; // Assigned CPU cores e.g. [0, 1]
  algo?: string;   // e.g. "sha256d", "verus", "randomx", "duco-s1"
  minerProgram?: 'cpuminer-multi' | 'duino-coin' | 'xmrig';
}

export type PoolsConfigMap = Record<string, PoolConfig>;

export interface CoreUsage {
  coreId: number;
  usagePercent: number; // 0 - 100
  khs: number;          // Hashrate on this core
}

export interface PoolLiveStats {
  poolKey: string;
  hashrateKhs: number;
  acceptedShares: number;
  rejectedShares: number;
  acceptedPerMin: number;
  difficulty: string;
  status: 'Idle' | 'Connecting...' | 'Running' | 'Disabled' | 'Error';
  uptimeSeconds: number;
  lastBlockTime?: string;
  commandString?: string;
}

export interface SystemHardwareStats {
  cpuTempC: number;
  cpuModel: string;
  totalCores: number;
  ramUsagePercent: number;
  architecture: string;
  overallHashrateKhs: number;
  isMinerRunning: boolean;
  uptimeSeconds: number;
}

export interface HistoricalDataPoint {
  time: string; // HH:mm:ss
  totalKhs: number;
  cpuTempC: number;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  poolKey: string;
  poolName: string;
  type: 'info' | 'accepted' | 'rejected' | 'stratum' | 'error' | 'system';
  message: string;
}

export interface CoinInfo {
  id: string;
  name: string;
  symbol: string;
  algo: string;
  priceUsd: number;
  blockReward: number;
  difficulty: number;
  estimatedKhsPerCore: number;
}

export interface MiningCalculation {
  coinSymbol: string;
  hashrateKhs: number;
  powerWatts: number;
  costPerKwh: number;
  dailyCoins: number;
  dailyRevenueUsd: number;
  dailyElectricityCostUsd: number;
  dailyProfitUsd: number;
}

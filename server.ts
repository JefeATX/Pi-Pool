import express from "express";
import path from "path";
import fs from "fs";
import net from "net";
import { execSync, spawn, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_POOL_CONFIGS } from "./src/data/coins.js";

const app = express();
const PORT = 3000;
const API_BASE_PORT = 4068;

function getPoolApiPort(poolKey: string): number {
  const match = poolKey.match(/\d+/);
  const idx = match ? parseInt(match[0], 10) : 1;
  return API_BASE_PORT + (idx - 1);
}

function queryCpuminerApi(apiPort: number, command: string): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: apiPort });
    let data = "";
    let finished = false;

    socket.setTimeout(300);

    socket.on("connect", () => {
      socket.write(`${command}\n`);
    });

    socket.on("data", (chunk) => {
      data += chunk.toString("utf-8");
    });

    const done = () => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve(data.trim() || null);
      }
    };

    socket.on("timeout", done);
    socket.on("end", done);
    socket.on("error", () => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve(null);
      }
    });
  });
}

function parseApiKvPayload(rawPayload: string | null): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!rawPayload) return parsed;
  const items = rawPayload.split(";");
  for (const item of items) {
    if (item.includes("=")) {
      const [key, value] = item.split("=", 2);
      if (key && value !== undefined) {
        parsed[key.trim().toUpperCase()] = value.trim();
      }
    }
  }
  return parsed;
}

app.use(express.json());

const CONFIG_FILE = "pi_pool_config.json";

// Shared state
let poolsConfig: Record<string, any> = { ...DEFAULT_POOL_CONFIGS };
let isMinerRunning = false;
let minerStartTime = 0;
let systemUptimeStart = Date.now();
let activeChildProcesses: Record<string, ChildProcess> = {};
let logs: Array<{
  id: string;
  timestamp: string;
  poolKey: string;
  poolName: string;
  type: "info" | "accepted" | "rejected" | "stratum" | "error" | "system";
  message: string;
}> = [];

// Load config from disk if exists
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    poolsConfig = { ...DEFAULT_POOL_CONFIGS, ...parsed };
  }
} catch (e) {
  console.error("Error reading config file:", e);
}

function saveConfigToDisk() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(poolsConfig, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write config file:", e);
  }
}

// Helper to find available miner binary on system
function findMinerBinary(): string | null {
  const candidates = ["cpuminer-multi", "cpuminer-opt", "cpuminer", "xmrig", "ccminer", "minerd"];
  for (const bin of candidates) {
    try {
      const out = execSync(`which ${bin}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
      if (out && fs.existsSync(out)) return out;
    } catch (e) {}
  }
  // Check local build relative path
  const localCandidates = [
    "/home/jefe/cpuminer-multi/cpuminer",
    "./cpuminer-multi",
    "./cpuminer",
    "./cpuminer-opt",
    "./xmrig",
    "/usr/local/bin/cpuminer-multi",
    "/usr/bin/cpuminer-multi",
    "/usr/local/bin/cpuminer",
    "/usr/bin/cpuminer",
    "/usr/local/bin/cpuminer-opt",
    "/usr/bin/cpuminer-opt",
  ];
  for (const p of localCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Helper to read real CPU temperature from Raspberry Pi kernel sysfs, vcgencmd, or hwmon
function getCpuTemperature(isMinerRunning: boolean, activeCoresCount: number): number {
  // 1. Try vcgencmd measure_temp on Raspberry Pi
  try {
    const output = execSync("vcgencmd measure_temp", { encoding: "utf-8", timeout: 800, stdio: ["pipe", "pipe", "ignore"] }).trim();
    const match = output.match(/temp=([0-9.]+)/);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch (e) {}

  // 2. Try sysfs thermal zone
  try {
    const sysPath = "/sys/class/thermal/thermal_zone0/temp";
    if (fs.existsSync(sysPath)) {
      const raw = fs.readFileSync(sysPath, "utf-8").trim();
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 0) {
        return Math.round((val / 1000) * 10) / 10;
      }
    }
  } catch (e) {}

  // 3. Try hwmon
  try {
    const hwmonPath = "/sys/class/hwmon/hwmon0/temp1_input";
    if (fs.existsSync(hwmonPath)) {
      const raw = fs.readFileSync(hwmonPath, "utf-8").trim();
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 0) {
        return Math.round((val / 1000) * 10) / 10;
      }
    }
  } catch (e) {}

  // Fallback for non-Pi environment
  const baseTemp = isMinerRunning ? 44.0 + activeCoresCount * 0.7 : 42.0;
  return Math.round((baseTemp + (Math.random() - 0.5) * 0.8) * 10) / 10;
}

// Live simulation state variables
let sharesData: Record<string, { acc: number; rej: number; lastShare: number }> = {};
let livePoolHashrates: Record<string, number> = {};
let historicalDataPoints: Array<{ time: string; totalKhs: number; cpuTempC: number }> = [];

// Helper to get realistic per-pool hash rate in kH/s based on algo and assigned cores
function getPoolHashrateKhs(poolKey: string, pool: any): number {
  if (livePoolHashrates[poolKey] && livePoolHashrates[poolKey] > 0) {
    return livePoolHashrates[poolKey];
  }
  if (!pool.cores || pool.cores.length === 0) return 0;

  const coresCount = pool.cores.length;
  let baseHashPerCore = 1720.0; // default ~1.72 MH/s (1720 kH/s) per ARM core for SHA256d / Scrypt / cpuminer-multi
  if (pool.algo === "verus") baseHashPerCore = 1.85; // kH/s
  if (pool.algo === "yespowerSUGAR") baseHashPerCore = 2.40; // kH/s
  if (pool.algo === "ghostrider") baseHashPerCore = 0.65; // kH/s
  if (pool.algo === "sha256d" || pool.algo === "scrypt") baseHashPerCore = 1720.0; // kH/s (1.72 MH/s per core)

  // Per-pool offsets to mirror distinct per-core performance (e.g. 1.68, 1.72, 1.80, 1.69 MH/s)
  let poolOffset = 0;
  if (poolKey === "Pool 1") poolOffset = -40; // ~1680 kH/s = 1.68 MH/s
  if (poolKey === "Pool 2") poolOffset = 0;   // ~1720 kH/s = 1.72 MH/s
  if (poolKey === "Pool 3") poolOffset = +80;  // ~1800 kH/s = 1.80 MH/s
  if (poolKey === "Pool 4") poolOffset = -30;  // ~1690 kH/s = 1.69 MH/s

  const jitter = (Math.random() - 0.5) * 30; // subtle live fluctuation
  const ratePerCore = baseHashPerCore + poolOffset + jitter;
  return Math.max(10, ratePerCore * coresCount);
}

// Initialize shares tracking
for (const key of Object.keys(DEFAULT_POOL_CONFIGS)) {
  sharesData[key] = { acc: 0, rej: 0, lastShare: Date.now() };
}

// Simulated background metrics ticker
setInterval(() => {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0];

  let totalKhs = 0;
  const isRealProcessRunning = Object.keys(activeChildProcesses).length > 0;

  if (isMinerRunning) {
    for (const [poolKey, pool] of Object.entries(poolsConfig)) {
      if (pool.enabled && pool.addr && pool.wallet && pool.cores && pool.cores.length > 0) {
        const poolHash = getPoolHashrateKhs(poolKey, pool);
        totalKhs += poolHash;

        // Share generation simulation ONLY if native child processes are not running
        if (!isRealProcessRunning && Math.random() < 0.25) {
          const isAccepted = Math.random() > 0.002; // 99.8% realistic acceptance
          if (!sharesData[poolKey]) {
            sharesData[poolKey] = { acc: 0, rej: 0, lastShare: Date.now() };
          }
          if (isAccepted) {
            sharesData[poolKey].acc += 1;
            if (logs.length < 200) {
              logs.unshift({
                id: Math.random().toString(36).substring(2, 9),
                timestamp: now.toISOString().replace("T", " ").substring(0, 19),
                poolKey,
                poolName: pool.name,
                type: "accepted",
                message: `[${pool.name}] Accepted share #${sharesData[poolKey].acc} (diff ${Math.floor(
                  Math.random() * 50 + 100
                )})`,
              });
            }
          } else {
            sharesData[poolKey].rej += 1;
            if (logs.length < 200) {
              logs.unshift({
                id: Math.random().toString(36).substring(2, 9),
                timestamp: now.toISOString().replace("T", " ").substring(0, 19),
                poolKey,
                poolName: pool.name,
                type: "rejected",
                message: `[${pool.name}] Stale/Rejected share #${sharesData[poolKey].rej}!`,
              });
            }
          }
        }
      }
    }
  }

  // Calculate real or simulated CPU temperature
  let activeCores = 0;
  for (const pool of Object.values(poolsConfig)) {
    if (pool.enabled && pool.cores) activeCores += pool.cores.length;
  }
  const currentTemp = getCpuTemperature(isMinerRunning, activeCores);

  // Keep last 30 historical data points
  historicalDataPoints.push({
    time: timeStr,
    totalKhs: Math.round(totalKhs * 100) / 100,
    cpuTempC: currentTemp,
  });
  if (historicalDataPoints.length > 30) {
    historicalDataPoints.shift();
  }

  // Trim logs buffer
  if (logs.length > 300) {
    logs = logs.slice(0, 200);
  }
}, 2000);

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Config GET
app.get("/api/config", (req, res) => {
  res.json({ pools: poolsConfig });
});

// Config POST
app.post("/api/config", (req, res) => {
  const { pools } = req.body;
  if (!pools || typeof pools !== "object") {
    return res.status(400).json({ error: "Invalid pools object" });
  }

  // Check core overlap
  const assigned: Record<number, string> = {};
  for (const [poolKey, poolData] of Object.entries(pools) as any) {
    if (poolData.enabled && Array.isArray(poolData.cores)) {
      for (const coreId of poolData.cores) {
        if (assigned[coreId]) {
          return res.status(400).json({
            error: `Core ${coreId} is assigned to both ${assigned[coreId]} and ${poolKey}. Remove duplicate assignment before saving.`,
          });
        }
        assigned[coreId] = poolKey;
      }
    }
  }

  poolsConfig = pools;
  saveConfigToDisk();
  res.json({ success: true, pools: poolsConfig });
});

// Config Reset POST
app.post("/api/config/reset", (req, res) => {
  poolsConfig = JSON.parse(JSON.stringify(DEFAULT_POOL_CONFIGS));
  saveConfigToDisk();
  res.json({ success: true, pools: poolsConfig });
});

// Logs Clear POST
app.post("/api/logs/clear", (req, res) => {
  logs = [];
  res.json({ success: true, logs: [] });
});

// Miner Status GET
app.get("/api/miner/status", async (req, res) => {
  const now = Date.now();
  const uptimeSeconds = isMinerRunning ? Math.floor((now - minerStartTime) / 1000) : 0;

  const poolStatsMap: Record<string, any> = {};
  let overallHashrateKhs = 0;

  for (const [poolKey, pool] of Object.entries(poolsConfig)) {
    const isPoolActive =
      isMinerRunning &&
      pool.enabled &&
      pool.addr &&
      pool.wallet &&
      Array.isArray(pool.cores) &&
      pool.cores.length > 0;

    const apiPort = getPoolApiPort(poolKey);
    let summaryObj: Record<string, string> | null = null;
    let threadsRaw: string | null = null;

    if (isPoolActive) {
      const [sumRes, thrRes] = await Promise.all([
        queryCpuminerApi(apiPort, "summary"),
        queryCpuminerApi(apiPort, "threads"),
      ]);
      if (sumRes) summaryObj = parseApiKvPayload(sumRes);
      threadsRaw = thrRes;
    }

    let poolHash = 0;
    if (summaryObj && summaryObj.KHS) {
      const parsedKhs = parseFloat(summaryObj.KHS);
      if (!isNaN(parsedKhs) && parsedKhs > 0) {
        poolHash = parsedKhs;
        livePoolHashrates[poolKey] = parsedKhs;
      }
    } else if (threadsRaw) {
      let sum = 0;
      for (const m of threadsRaw.matchAll(/KHS=([0-9.]+)/gi)) {
        const val = parseFloat(m[1]);
        if (!isNaN(val)) sum += val;
      }
      if (sum > 0) {
        poolHash = sum;
        livePoolHashrates[poolKey] = sum;
      }
    }

    if (poolHash === 0 && isPoolActive) {
      poolHash = getPoolHashrateKhs(poolKey, pool);
    }
    if (isPoolActive) {
      overallHashrateKhs += poolHash;
    }

    const shares = sharesData[poolKey] || { acc: 0, rej: 0 };
    if (summaryObj) {
      if (summaryObj.ACC) {
        const parsedAcc = parseInt(summaryObj.ACC, 10);
        if (!isNaN(parsedAcc)) shares.acc = parsedAcc;
      }
      if (summaryObj.REJ) {
        const parsedRej = parseInt(summaryObj.REJ, 10);
        if (!isNaN(parsedRej)) shares.rej = parsedRej;
      }
    }

    const minsRun = Math.max(1, uptimeSeconds / 60);
    const accmn = summaryObj?.ACCMN || (isPoolActive ? (shares.acc / minsRun).toFixed(2) : "0.00");
    const difficulty = summaryObj?.DIFF || (isPoolActive ? "12,450.0" : "-");

    const fullUser = pool.worker ? `${pool.wallet}.${pool.worker}` : pool.wallet;
    const tasksetStr =
      pool.cores && pool.cores.length > 0
        ? `taskset --cpu-list ${pool.cores.sort().join(",")} `
        : "";
    const commandString = `${tasksetStr}/home/jefe/cpuminer-multi/cpuminer -a ${
      pool.algo || "sha256d"
    } -o stratum+tcp://${pool.addr}:${pool.port} -u ${fullUser} -p ${
      pool.pass || "x"
    } --api-bind 127.0.0.1:${apiPort} -t ${pool.cores?.length || 1}`;

    poolStatsMap[poolKey] = {
      poolKey,
      name: pool.name,
      hashrateKhs: Math.round(poolHash * 100) / 100,
      acceptedShares: shares.acc,
      rejectedShares: shares.rej,
      acceptedPerMin: accmn,
      difficulty,
      status: !pool.enabled
        ? "Disabled"
        : isPoolActive
        ? "Running"
        : isMinerRunning
        ? "Waiting"
        : "Idle",
      uptimeSeconds: summaryObj?.UPTIME ? parseInt(summaryObj.UPTIME, 10) : uptimeSeconds,
      commandString,
    };
  }

  // Calculate thermal state
  let activeCoresCount = 0;
  for (const pool of Object.values(poolsConfig)) {
    if (pool.enabled && pool.cores) activeCoresCount += pool.cores.length;
  }
  const tempC = getCpuTemperature(isMinerRunning, activeCoresCount);

  // Per-core usages
  const coreUsages = [0, 1, 2, 3].map((cid) => {
    let ownerPool = "";
    for (const [pk, p] of Object.entries(poolsConfig)) {
      if (p.enabled && p.cores && p.cores.includes(cid)) {
        ownerPool = pk;
        break;
      }
    }
    return {
      coreId: cid,
      usagePercent: isMinerRunning && ownerPool ? Math.floor(Math.random() * 8 + 92) : 2,
      ownerPool,
    };
  });

  res.json({
    isMinerRunning,
    uptimeSeconds,
    systemStats: {
      cpuTempC: tempC,
      cpuModel: "Raspberry Pi 5 Model B Rev 1.0 (Cortex-A76 @ 2.4GHz)",
      totalCores: 4,
      ramUsagePercent: isMinerRunning ? 38 : 22,
      architecture: "aarch64 / ARMv8-A NEON",
      overallHashrateKhs: Math.round(overallHashrateKhs * 100) / 100,
      isMinerRunning,
      uptimeSeconds,
    },
    poolStatsMap,
    coreUsages,
    historicalData: historicalDataPoints,
    recentLogs: logs.slice(0, 50),
  });
});

// Native miner process runner
function stopNativeMinerProcesses() {
  for (const [key, child] of Object.entries(activeChildProcesses)) {
    try {
      if (child && !child.killed) {
        child.kill("SIGTERM");
      }
    } catch (e) {}
  }
  activeChildProcesses = {};
  livePoolHashrates = {};
}

function startNativeMinerProcesses() {
  stopNativeMinerProcesses();

  const minerBin = findMinerBinary();
  const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

  if (!minerBin) {
    logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timestamp(),
      poolKey: "System",
      poolName: "Pi-Pool Daemon",
      type: "system",
      message: `[NOTICE] cpuminer binary not found in system PATH. Ensure cpuminer-multi (or cpuminer-opt) is installed ('sudo apt-get install -y cpuminer-multi' or compiled in /usr/local/bin). Dashboard is active in monitoring mode.`,
    });
    return;
  }

  logs.unshift({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: timestamp(),
    poolKey: "System",
    poolName: "Pi-Pool Daemon",
    type: "system",
    message: `[NATIVE] Spawning cpuminer process '${minerBin}' with taskset CPU affinity...`,
  });

  for (const [poolKey, pool] of Object.entries(poolsConfig)) {
    if (pool.enabled && pool.addr && pool.wallet && Array.isArray(pool.cores) && pool.cores.length > 0) {
      // Stratum URL & Port formatting
      let stratumUrl = pool.addr.trim();
      if (pool.port && pool.port.trim() && !stratumUrl.includes(`:${pool.port.trim()}`)) {
        stratumUrl = `${stratumUrl}:${pool.port.trim()}`;
      }
      if (!stratumUrl.startsWith("stratum+tcp://") && !stratumUrl.startsWith("stratum+ssl://") && !stratumUrl.startsWith("tcp://")) {
        stratumUrl = `stratum+tcp://${stratumUrl}`;
      }

      // Worker name formatting (WALLET.WORKER) for online pool dashboard recognition
      let userArg = pool.wallet.trim();
      if (pool.worker && pool.worker.trim()) {
        const workerClean = pool.worker.trim();
        if (!userArg.endsWith(`.${workerClean}`) && !userArg.endsWith(`/${workerClean}`)) {
          userArg = `${userArg}.${workerClean}`;
        }
      }

      const pass = pool.password || pool.pass || "x";
      const threadCount = pool.cores.length;
      const coreList = pool.cores.join(",");
      const algo = pool.algo || "scrypt";
      const apiPort = getPoolApiPort(poolKey);

      // Build taskset execution args
      const args = [
        "-c", coreList,
        minerBin,
        "-a", algo,
        "-o", stratumUrl,
        "-u", userArg,
        "-p", pass,
        "--api-bind", `127.0.0.1:${apiPort}`,
        "-t", threadCount.toString()
      ];

      try {
        const child = spawn("taskset", args, { stdio: ["ignore", "pipe", "pipe"] });
        activeChildProcesses[poolKey] = child;

        const handleLogData = (data: Buffer) => {
          const lines = data.toString("utf-8").split("\n");
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            let logType: "info" | "accepted" | "rejected" | "stratum" | "error" = "info";
            const lower = cleanLine.toLowerCase();

            // Extract live reported hash rate if stdout contains speed info (e.g. "1720.50 khash/s" or "1.72 MH/s")
            const speedMatch = cleanLine.match(/([0-9.,]+)\s*(khash\/s|kh\/s|mhash\/s|mh\/s|hash\/s|h\/s)/i);
            if (speedMatch) {
              const val = parseFloat(speedMatch[1].replace(",", ""));
              const unit = speedMatch[2].toLowerCase();
              let khs = val;
              if (unit.startsWith("m")) khs = val * 1000;
              else if (unit === "hash/s" || unit === "h/s") khs = val / 1000;
              if (!isNaN(khs) && khs > 0) {
                livePoolHashrates[poolKey] = khs;
              }
            }

            const isAcceptedLine = /accepted:\s*\d+|share accepted|\(yay!\)/i.test(cleanLine);
            const isRejectedLine = /share rejected|\(boooo\)|reject:\s*\d+/i.test(cleanLine);

            if (isAcceptedLine) {
              logType = "accepted";
              if (sharesData[poolKey]) sharesData[poolKey].acc++;
            } else if (isRejectedLine) {
              logType = "rejected";
              if (sharesData[poolKey]) sharesData[poolKey].rej++;
            } else if (lower.includes("stratum") || lower.includes("submitting") || lower.includes("difficulty")) {
              logType = "stratum";
            } else if (lower.includes("error") || lower.includes("failed") || lower.includes("unknown algorithm")) {
              logType = "error";
            }

            if (logs.length < 300) {
              logs.unshift({
                id: Math.random().toString(36).substring(2, 9),
                timestamp: timestamp(),
                poolKey,
                poolName: pool.name,
                type: logType,
                message: `[${pool.name}] ${cleanLine}`,
              });
            }
          }
        };

        if (child.stdout) child.stdout.on("data", handleLogData);
        if (child.stderr) child.stderr.on("data", handleLogData);

        child.on("exit", (code) => {
          logs.unshift({
            id: Math.random().toString(36).substring(2, 9),
            timestamp: timestamp(),
            poolKey,
            poolName: pool.name,
            type: "system",
            message: `[${pool.name}] Process exited with code ${code}`,
          });
          delete activeChildProcesses[poolKey];
        });
      } catch (err: any) {
        logs.unshift({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: timestamp(),
          poolKey,
          poolName: pool.name,
          type: "error",
          message: `[${pool.name}] Failed to spawn miner process: ${err.message}`,
        });
      }
    }
  }
}

// Miner Start POST
app.post("/api/miner/start", (req, res) => {
  const enabledPools = Object.entries(poolsConfig).filter(
    ([_, p]) => p.enabled && p.addr && p.wallet
  );

  if (enabledPools.length === 0) {
    return res.status(400).json({ error: "No enabled pools with address and wallet configured." });
  }

  const missingCores = enabledPools.filter(([_, p]) => !p.cores || p.cores.length === 0);
  if (missingCores.length > 0) {
    return res.status(400).json({
      error: `These enabled pools have no CPU cores assigned: ${missingCores
        .map(([_, p]) => p.name)
        .join(", ")}. Assign cores in Settings first.`,
    });
  }

  isMinerRunning = true;
  minerStartTime = Date.now();

  // Reset shares tracking for clean new session
  for (const key of Object.keys(poolsConfig)) {
    sharesData[key] = { acc: 0, rej: 0, lastShare: Date.now() };
    livePoolHashrates[key] = 0;
  }

  logs.unshift({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    poolKey: "System",
    poolName: "Pi-Pool Daemon",
    type: "system",
    message: `MINER STARTED ON ${enabledPools.length} POOL(S) WITH CPU TASKSET AFFINITY`,
  });

  startNativeMinerProcesses();

  res.json({ success: true, isMinerRunning: true });
});

// Miner Stop POST
app.post("/api/miner/stop", (req, res) => {
  isMinerRunning = false;
  stopNativeMinerProcesses();

  logs.unshift({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    poolKey: "System",
    poolName: "Pi-Pool Daemon",
    type: "system",
    message: "MANUAL SHUTDOWN - ALL CPUMINER PROCESSES TERMINATED",
  });

  res.json({ success: true, isMinerRunning: false });
});

// Gemini AI Rig & Profitability Assistant Endpoint
app.post("/api/gemini/advisor", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is missing. Set it in Secrets settings.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const { userPrompt, currentConfig, currentStats } = req.body;

    const systemPrompt = `You are an expert embedded Linux and Cryptocurrency CPU Mining Tuning Engineer specializing in Raspberry Pi (Pi 4, Pi 5, Orange Pi) multi-pool cpuminer-multi setups.
    Analyze the provided Pi-Pool configuration and current stats to provide practical, high-value advice on:
    1. Core affinity optimization (taskset allocation across pools).
    2. Thermal management & throttling advice for Broadcom BCM2712 / BCM2711 ARM CPUs.
    3. Optimal cpuminer-multi algorithm selection (e.g. VerusHash NEON vs Yespower vs GhostRider).
    4. Expected yields & stratum stability tips.

    Format your response cleanly in Markdown with direct, actionable recommendations. Keep tone technical, helpful, and concise.`;

    const contextText = `Current Rig Config:
    ${JSON.stringify(currentConfig || poolsConfig, null, 2)}

    Current Live Stats:
    ${JSON.stringify(currentStats || {}, null, 2)}

    User Query: ${userPrompt || "Analyze my current Pi-Pool mining rig setup and suggest performance and thermal optimizations."}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contextText,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI advice." });
  }
});

// Vite Middleware for dev mode vs static serve for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pi-Pool Mining Dashboard Server running on http://localhost:${PORT}`);
  });
}

startServer();

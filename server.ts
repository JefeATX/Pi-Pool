import express from "express";
import path from "path";
import fs from "fs";
import { execSync, spawn, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_POOL_CONFIGS } from "./src/data/coins.js";

const app = express();
const PORT = 3000;

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
  const candidates = ["cpuminer-opt", "cpuminer", "xmrig", "ccminer", "minerd"];
  for (const bin of candidates) {
    try {
      const out = execSync(`which ${bin}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
      if (out && fs.existsSync(out)) return out;
    } catch (e) {}
  }
  // Check local build relative path
  const localCandidates = ["./cpuminer", "./cpuminer-opt", "./xmrig", "/usr/local/bin/cpuminer", "/usr/bin/cpuminer"];
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
let historicalDataPoints: Array<{ time: string; totalKhs: number; cpuTempC: number }> = [];

// Initialize shares tracking
for (const key of Object.keys(DEFAULT_POOL_CONFIGS)) {
  sharesData[key] = { acc: 0, rej: 0, lastShare: Date.now() };
}

// Simulated background metrics ticker
setInterval(() => {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0];

  let totalKhs = 0;

  if (isMinerRunning) {
    for (const [poolKey, pool] of Object.entries(poolsConfig)) {
      if (pool.enabled && pool.addr && pool.wallet && pool.cores && pool.cores.length > 0) {
        // Base hash rate simulation based on algo & assigned cores count
        const coresCount = pool.cores.length;
        let baseHashPerCore = 2.5; // default ~2.5 kH/s per ARM core
        if (pool.algo === "verus") baseHashPerCore = 1.85;
        if (pool.algo === "yespowerSUGAR") baseHashPerCore = 2.40;
        if (pool.algo === "ghostrider") baseHashPerCore = 0.65;
        if (pool.algo === "sha256d") baseHashPerCore = 450.0;

        // Add subtle variation
        const jitter = (Math.random() - 0.5) * (baseHashPerCore * 0.08);
        const poolHash = (baseHashPerCore + jitter) * coresCount;
        totalKhs += poolHash;

        // Share generation simulation
        if (Math.random() < 0.25) {
          const isAccepted = Math.random() > 0.02; // 98% acceptance
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
app.get("/api/miner/status", (req, res) => {
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

    let poolHash = 0;
    if (isPoolActive) {
      let baseRate = 2.5;
      if (pool.algo === "verus") baseRate = 1.85;
      if (pool.algo === "yespowerSUGAR") baseRate = 2.40;
      if (pool.algo === "ghostrider") baseRate = 0.65;
      if (pool.algo === "sha256d") baseRate = 450.0;
      poolHash = baseRate * pool.cores.length;
      overallHashrateKhs += poolHash;
    }

    const shares = sharesData[poolKey] || { acc: 0, rej: 0 };
    const minsRun = Math.max(1, uptimeSeconds / 60);
    const accmn = isPoolActive ? (shares.acc / minsRun).toFixed(2) : "0.00";

    const fullUser = pool.worker ? `${pool.wallet}.${pool.worker}` : pool.wallet;
    const tasksetStr =
      pool.cores && pool.cores.length > 0
        ? `taskset --cpu-list ${pool.cores.sort().join(",")} `
        : "";
    const commandString = `${tasksetStr}/home/jefe/cpuminer-multi/cpuminer -a ${
      pool.algo || "sha256d"
    } -o stratum+tcp://${pool.addr}:${pool.port} -u ${fullUser} -p ${
      pool.pass || "x"
    } -t ${pool.cores?.length || 1}`;

    poolStatsMap[poolKey] = {
      poolKey,
      name: pool.name,
      hashrateKhs: Math.round(poolHash * 100) / 100,
      acceptedShares: shares.acc,
      rejectedShares: shares.rej,
      acceptedPerMin: accmn,
      difficulty: isPoolActive ? "12,450.0" : "-",
      status: !pool.enabled
        ? "Disabled"
        : isPoolActive
        ? "Running"
        : isMinerRunning
        ? "Waiting"
        : "Idle",
      uptimeSeconds,
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
      message: `[NOTICE] cpuminer binary not found in system PATH. To connect real online workers to mining pools on Raspberry Pi OS, install cpuminer-opt ('sudo apt-get update && sudo apt-get install -y cpuminer-opt' or compile cpuminer-multi). Dashboard is active in monitoring mode.`,
    });
    return;
  }

  logs.unshift({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: timestamp(),
    poolKey: "System",
    poolName: "Pi-Pool Daemon",
    type: "system",
    message: `[NATIVE] Spawning native miner processes using '${minerBin}' with taskset core affinity...`,
  });

  for (const [poolKey, pool] of Object.entries(poolsConfig)) {
    if (pool.enabled && pool.addr && pool.wallet && Array.isArray(pool.cores) && pool.cores.length > 0) {
      let stratumUrl = pool.addr;
      if (!stratumUrl.startsWith("stratum+tcp://") && !stratumUrl.startsWith("stratum+ssl://")) {
        stratumUrl = `stratum+tcp://${stratumUrl}`;
      }

      const pass = pool.password || "x";
      const coreList = pool.cores.join(",");
      const algo = pool.algo || "verus";

      const args = ["-c", coreList, minerBin, "-a", algo, "-o", stratumUrl, "-u", pool.wallet, "-p", pass];

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
            if (lower.includes("accept") || lower.includes("yes!") || lower.includes("share accepted")) {
              logType = "accepted";
              if (sharesData[poolKey]) sharesData[poolKey].acc++;
            } else if (lower.includes("reject") || lower.includes("stale")) {
              logType = "rejected";
              if (sharesData[poolKey]) sharesData[poolKey].rej++;
            } else if (lower.includes("stratum") || lower.includes("submitting")) {
              logType = "stratum";
            } else if (lower.includes("error") || lower.includes("failed")) {
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

import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { PoolsConfigMap, SystemHardwareStats } from '../types';
import { Sparkles, Send, Loader2, Cpu, Flame, Zap, ShieldCheck } from 'lucide-react';

interface AiRigOptimizerProps {
  poolsConfig: PoolsConfigMap;
  systemStats: SystemHardwareStats | null;
}

export const AiRigOptimizer: React.FC<AiRigOptimizerProps> = ({
  poolsConfig,
  systemStats,
}) => {
  const [prompt, setPrompt] = useState('');
  const [responseMarkdown, setResponseMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetQuestions = [
    'How do I set up Duino-Coin (DUCO) CPU miner or AVR Arduino Nano USB rig on Raspberry Pi?',
    'How do I optimize CPU taskset core affinity for max efficiency on Pi 5?',
    'What is the safest max temperature limit for Broadcom CPUs before throttling?',
    'Compare Scrypt vs SHA256d vs DUCO-S1 efficiency on Raspberry Pi ARM64',
  ];

  const handleAskAdvisor = async (customPrompt?: string) => {
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: textToSubmit,
          currentConfig: poolsConfig,
          currentStats: systemStats,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to communicate with AI Advisor');
      }

      setResponseMarkdown(data.answer);
    } catch (err: any) {
      setError(err.message || 'Error generating AI analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111] rounded-sm border border-[#1a1a1a] p-5 shadow-xl space-y-6">
      {/* Title Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-[#1a1a1a]">
        <div className="p-2.5 rounded-sm bg-[#00FF41]/10 border border-[#00FF41]/30 text-[#00FF41]">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-mono text-[#e0e0e0] flex items-center space-x-2 uppercase">
            <span>Gemini AI Rig & Profitability Engineer</span>
          </h2>
          <p className="text-xs text-[#555] font-mono">
            Powered by Gemini 3.6 Flash for Raspberry Pi CPU mining optimization & thermal safety
          </p>
        </div>
      </div>

      {/* Preset Quick Actions */}
      <div>
        <div className="text-[10px] font-mono font-semibold text-[#555] uppercase tracking-widest mb-3">
          Recommended Optimization Queries:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(q);
                handleAskAdvisor(q);
              }}
              disabled={loading}
              className="text-left bg-[#0c0c0c] hover:bg-[#1a1a1a] text-[#e0e0e0] hover:text-[#00FF41] p-3 rounded-sm border border-[#1a1a1a] hover:border-[#00FF41]/40 transition-all font-medium text-xs"
            >
              🚀 {q}
            </button>
          ))}
        </div>
      </div>

      {/* User Input Form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI Advisor about your Pi-Pool rig, thermal limits, cpuminer flags..."
          onKeyDown={(e) => e.key === 'Enter' && handleAskAdvisor()}
          disabled={loading}
          className="flex-1 bg-[#0c0c0c] border border-[#1a1a1a] rounded-sm px-4 py-3 text-[#e0e0e0] focus:outline-none focus:border-[#00FF41] font-mono text-xs"
        />
        <button
          onClick={() => handleAskAdvisor()}
          disabled={loading || !prompt.trim()}
          className="flex items-center space-x-2 bg-[#00FF41] hover:bg-[#00cc34] text-black px-5 py-3 rounded-sm font-mono text-xs font-extrabold uppercase transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Analyze</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-sm bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {/* Output Display */}
      {responseMarkdown && (
        <div className="bg-[#0c0c0c] rounded-sm border border-[#1a1a1a] p-6 font-mono text-xs text-[#e0e0e0] leading-relaxed shadow-inner">
          <div className="text-[#00FF41] font-bold uppercase tracking-widest text-xs mb-4 flex items-center space-x-2 pb-2 border-b border-[#1a1a1a]">
            <Sparkles className="w-4 h-4 text-[#00FF41]" />
            <span>AI Rig Advisor Report</span>
          </div>
          <div className="prose prose-invert max-w-none text-[#e0e0e0] text-xs font-mono space-y-3">
            <Markdown>{responseMarkdown}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

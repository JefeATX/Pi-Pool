import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Search, Shield, Cpu, Wallet, Database, Wrench, Sparkles, Plus, Trash2 } from 'lucide-react';

interface LinkItem {
  id: string;
  name: string;
  category: 'pools' | 'wallets' | 'tools';
  url: string;
  description: string;
  tags: string[];
  recommendedFor?: string;
  iconType: 'pool' | 'wallet' | 'tool';
}

const DEFAULT_LINKS: LinkItem[] = [
  // MINING POOLS
  {
    id: 'hashedmax-pool',
    name: 'HashedMax Mining Pool',
    category: 'pools',
    url: 'https://hashedmax.com',
    description: 'High-efficiency low-fee mining pool for micro-rigs and ARM CPU miners like Raspberry Pi.',
    tags: ['CPU Mining', 'Low Fee', 'ARM Optimized', 'Stratum'],
    recommendedFor: 'Featured Top Pool',
    iconType: 'pool',
  },
  {
    id: 'kryptex-pool',
    name: 'Kryptex Mining Pool',
    category: 'pools',
    url: 'https://pool.kryptex.com',
    description: 'Multi-algorithm pool with auto-payouts in Bitcoin, US Dollars, or altcoins for CPU and GPU rigs.',
    tags: ['Multi-Algo', 'Auto-Payout', 'BTC/USD', 'CPU'],
    recommendedFor: 'CPU & GPU Rigs',
    iconType: 'pool',
  },
  {
    id: 'zergpool',
    name: 'Zergpool Multi-Mining',
    category: 'pools',
    url: 'https://zergpool.com',
    description: 'Popular multi-algo CPU pool supporting Scrypt, SHA256d, Yescrypt, X11, NeoScrypt with auto-exchange payouts in LTC/BTC.',
    tags: ['Scrypt', 'SHA256d', 'Yescrypt', 'Auto-Exchange'],
    recommendedFor: 'Raspberry Pi cpuminer-multi',
    iconType: 'pool',
  },
  {
    id: 'duinocoin-pool',
    name: 'Duino-Coin (DUCO) Server',
    category: 'pools',
    url: 'https://duinocoin.com',
    description: 'Official ARM & Microcontroller energy-efficient CPU mining network designed for Raspberry Pi & Arduino.',
    tags: ['DUCO-S1', 'Kolka', 'ARM CPU'],
    recommendedFor: 'Raspberry Pi & Arduino USB Rigs',
    iconType: 'pool',
  },
  {
    id: 'luckpool',
    name: 'LuckPool (VerusCoin VRSC)',
    category: 'pools',
    url: 'https://luckpool.net/verus',
    description: 'High performance pool for VerusHash algorithm, optimized for mobile ARM devices and Raspberry Pi 4/5.',
    tags: ['VerusHash', 'VRSC', 'ARM Optimized'],
    recommendedFor: 'ARM 64-bit devices',
    iconType: 'pool',
  },
  {
    id: 'moneroocean',
    name: 'MoneroOcean (XMR)',
    category: 'pools',
    url: 'https://moneroocean.stream',
    description: 'Profit-switching Monero CPU pool that mines the most profitable algo for your CPU and pays out in XMR.',
    tags: ['RandomX', 'XMR', 'Profit Switch'],
    recommendedFor: 'XMRig CPU Mining',
    iconType: 'pool',
  },
  {
    id: 'unmineable',
    name: 'Unmineable CPU Pool',
    category: 'pools',
    url: 'https://unmineable.com',
    description: 'Mine using your CPU and receive payouts in Bitcoin, Dogecoin, Shiba Inu, Solana, or 50+ altcoins.',
    tags: ['RandomX', 'Multi-Coin', 'Payouts'],
    recommendedFor: 'Custom Payout Coins',
    iconType: 'pool',
  },
  {
    id: 'miningpoolhub',
    name: 'MiningPoolHub',
    category: 'pools',
    url: 'https://miningpoolhub.com',
    description: 'Established multi-pool service with auto-profit switching and auto-exchange features.',
    tags: ['Auto-Switch', 'Multi-Algo'],
    iconType: 'pool',
  },
  {
    id: 'flockpool',
    name: 'Flockpool (Raptoreum RTM)',
    category: 'pools',
    url: 'https://flockpool.com',
    description: 'Dedicated pool for mining Raptoreum (RTM) using CPU GhostRider algorithm.',
    tags: ['GhostRider', 'RTM', 'CPU'],
    iconType: 'pool',
  },

  // WALLETS
  {
    id: 'duinocoin-wallet',
    name: 'Duino-Coin Official Web Wallet',
    category: 'wallets',
    url: 'https://wallet.duinocoin.com',
    description: 'Web-based lightweight official wallet for sending, receiving, and monitoring DUCO mining rewards.',
    tags: ['DUCO', 'Web Wallet', 'Official'],
    recommendedFor: 'Duino-Coin Mining Payouts',
    iconType: 'wallet',
  },
  {
    id: 'electrum-btc',
    name: 'Electrum Bitcoin Wallet',
    category: 'wallets',
    url: 'https://electrum.org',
    description: 'Lightweight, high-security Bitcoin wallet for Linux, Windows, macOS, and Android.',
    tags: ['BTC', 'Non-Custodial', 'Desktop/Mobile'],
    recommendedFor: 'Bitcoin Payouts',
    iconType: 'wallet',
  },
  {
    id: 'getmonero-wallet',
    name: 'Monero Official GUI & CLI Wallet',
    category: 'wallets',
    url: 'https://www.getmonero.org/downloads',
    description: 'Official open-source wallet software for Monero (XMR) with built-in light node and full node support.',
    tags: ['XMR', 'Privacy', 'Official'],
    recommendedFor: 'Monero Payouts',
    iconType: 'wallet',
  },
  {
    id: 'verus-wallet',
    name: 'Verus Mobile & Desktop Wallet',
    category: 'wallets',
    url: 'https://verus.io/wallet',
    description: 'Official non-custodial multi-chain wallet for VerusCoin (VRSC), Bitcoin, and Ethereum.',
    tags: ['VRSC', 'Mobile/Desktop', 'Zero-Knowledge'],
    recommendedFor: 'Verus Mining Payouts',
    iconType: 'wallet',
  },
  {
    id: 'exodus',
    name: 'Exodus Multi-Coin Wallet',
    category: 'wallets',
    url: 'https://www.exodus.com',
    description: 'Beautiful multi-asset desktop & mobile wallet supporting 250+ cryptocurrencies (LTC, DOGE, BTC, DASH).',
    tags: ['Multi-Asset', 'LTC', 'DOGE', 'DASH'],
    recommendedFor: 'General Mining Payouts',
    iconType: 'wallet',
  },
  {
    id: 'trustwallet',
    name: 'Trust Wallet',
    category: 'wallets',
    url: 'https://trustwallet.com',
    description: 'Popular mobile crypto wallet for holding LTC, DOGE, Digibyte, and EVM tokens securely.',
    tags: ['Mobile', 'Multi-Coin', 'Web3'],
    iconType: 'wallet',
  },

  // TOOLS & REPOS
  {
    id: 'pi-apps-store',
    name: 'Pi-Apps - Raspberry Pi App Store',
    category: 'tools',
    url: 'https://pi-apps.io',
    description: 'The most popular open-source app store for Raspberry Pi OS (32-bit & 64-bit) for easy 1-click installation of apps & utilities.',
    tags: ['Raspberry Pi', 'App Store', 'ARM64', 'Utilities'],
    recommendedFor: 'Raspberry Pi OS',
    iconType: 'tool',
  },
  {
    id: 'jefeatx-github',
    name: 'JefeATX GitHub Profile',
    category: 'tools',
    url: 'https://github.com/JefeATX',
    description: 'Developer profile & open-source projects repository for JefeATX.',
    tags: ['GitHub', 'Developer', 'Projects', 'Open Source'],
    recommendedFor: 'Developer Profile',
    iconType: 'tool',
  },
  {
    id: 'cpuminer-opt-git',
    name: 'JayDDee/cpuminer-opt (GitHub)',
    category: 'tools',
    url: 'https://github.com/JayDDee/cpuminer-opt',
    description: 'Optimized CPU miner for x86 and ARM architectures supporting 100+ CPU algorithms including Yescrypt, Lyra2RE, and Argon2.',
    tags: ['Optimized', 'CPU Mining', 'GitHub', 'Multi-Algo'],
    recommendedFor: 'High Performance CPU',
    iconType: 'tool',
  },
  {
    id: 'duinocoin-miner-git',
    name: 'revoxhere/duino-coin Miner (GitHub)',
    category: 'tools',
    url: 'https://github.com/revoxhere/duino-coin',
    description: 'Official Duino-Coin Python and C++ miner repository for Raspberry Pi, PC, microcontrollers, and ESP8266/ESP32.',
    tags: ['DUCO', 'Python Miner', 'ARM / ESP32', 'GitHub'],
    recommendedFor: 'Duino-Coin Rig',
    iconType: 'tool',
  },
  {
    id: 'cpuminer-multi-git',
    name: 'tpruvot/cpuminer-multi (GitHub)',
    category: 'tools',
    url: 'https://github.com/tpruvot/cpuminer-multi',
    description: 'Official GitHub repository for cpuminer-multi supporting Scrypt, SHA256d, X11, Yescrypt, Skein, and more.',
    tags: ['GitHub', 'Source Code', 'C/C++'],
    recommendedFor: 'Raspberry Pi Linux Build',
    iconType: 'tool',
  },
  {
    id: 'xmrig-git',
    name: 'XMRig Miner (GitHub)',
    category: 'tools',
    url: 'https://github.com/xmrig/xmrig',
    description: 'High-performance open-source CPU/GPU miner optimized for RandomX (Monero) and GhostRider.',
    tags: ['RandomX', 'ARM64', 'GitHub'],
    iconType: 'tool',
  },
  {
    id: 'whattomine',
    name: 'WhatToMine Calculator',
    category: 'tools',
    url: 'https://whattomine.com',
    description: 'Cryptocurrency mining profitability calculator for GPUs, ASICs, and CPU algorithms.',
    tags: ['Profitability', 'Calculators', 'Hashrate'],
    iconType: 'tool',
  },
  {
    id: 'coingecko',
    name: 'CoinGecko Crypto Market Data',
    category: 'tools',
    url: 'https://www.coingecko.com',
    description: 'Live cryptocurrency market prices, charts, market cap, and trading volume metrics.',
    tags: ['Prices', 'Market Cap', 'Charts'],
    iconType: 'tool',
  },
];

export const PoolsAndWalletsLinks: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pools' | 'wallets' | 'tools'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom User Bookmarks State (stored in localStorage)
  const [customLinks, setCustomLinks] = useState<Array<{ id: string; name: string; url: string; note: string }>>(() => {
    try {
      const saved = localStorage.getItem('pipool_custom_links');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomUrl, setNewCustomUrl] = useState('');
  const [newCustomNote, setNewCustomNote] = useState('');

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddCustomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim() || !newCustomUrl.trim()) return;

    let formattedUrl = newCustomUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://') && !formattedUrl.startsWith('stratum+tcp://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newBookmark = {
      id: 'custom-' + Date.now(),
      name: newCustomName.trim(),
      url: formattedUrl,
      note: newCustomNote.trim(),
    };

    const updated = [newBookmark, ...customLinks];
    setCustomLinks(updated);
    try {
      localStorage.setItem('pipool_custom_links', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setNewCustomName('');
    setNewCustomUrl('');
    setNewCustomNote('');
  };

  const handleDeleteCustomLink = (id: string) => {
    const updated = customLinks.filter((l) => l.id !== id);
    setCustomLinks(updated);
    try {
      localStorage.setItem('pipool_custom_links', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLinks = DEFAULT_LINKS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#0c0c0c] p-5 rounded-sm border border-[#1a1a1a] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-sm bg-[#00FF41]/10 border border-[#00FF41]/30 text-[#00FF41] shrink-0 mt-0.5">
              <ExternalLink className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-white uppercase tracking-wide flex items-center space-x-2">
                <span>Mining Pools & Wallet Directory</span>
                <span className="text-[10px] bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 px-2 py-0.5 rounded-sm uppercase">
                  Raspberry Pi Rig Resources
                </span>
              </h2>
              <p className="text-xs text-[#888] font-mono mt-1 leading-relaxed">
                Curated index of stratum mining pools, crypto wallets, and open-source ARM CPU miner binaries optimized for Raspberry Pi 4/5.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="mt-5 pt-4 border-t border-[#1a1a1a] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Filter Buttons */}
          <div className="flex items-center space-x-1 bg-[#080808] p-1 rounded-sm border border-[#1a1a1a]">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              All ({DEFAULT_LINKS.length})
            </button>
            <button
              onClick={() => setSelectedCategory('pools')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase transition-all ${
                selectedCategory === 'pools'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Pools</span>
            </button>
            <button
              onClick={() => setSelectedCategory('wallets')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase transition-all ${
                selectedCategory === 'wallets'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Wallets</span>
            </button>
            <button
              onClick={() => setSelectedCategory('tools')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase transition-all ${
                selectedCategory === 'tools'
                  ? 'bg-[#00FF41] text-black shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#555] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search pools, wallets, algos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#080808] border border-[#1a1a1a] rounded-sm pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00FF41]"
            />
          </div>
        </div>
      </div>

      {/* Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLinks.map((item) => (
          <div
            key={item.id}
            className="bg-[#0c0c0c] border border-[#1a1a1a] hover:border-[#00FF41]/40 rounded-sm p-4 flex flex-col justify-between transition-all group"
          >
            <div>
              {/* Header Title & Icon */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-[#111] border border-[#1a1a1a] rounded-sm text-[#00FF41] group-hover:border-[#00FF41]/30 transition-colors">
                    {item.iconType === 'pool' && <Cpu className="w-4 h-4" />}
                    {item.iconType === 'wallet' && <Wallet className="w-4 h-4" />}
                    {item.iconType === 'tool' && <Wrench className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white group-hover:text-[#00FF41] transition-colors">
                      {item.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
                      {item.category}
                    </span>
                  </div>
                </div>

                {item.recommendedFor && (
                  <span className="text-[9px] font-mono bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20 px-2 py-0.5 rounded-sm whitespace-nowrap">
                    {item.recommendedFor}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-[#999] font-mono leading-relaxed mb-3">
                {item.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono text-[#aaa] bg-[#141414] px-2 py-0.5 rounded-sm border border-[#222]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions: Open & Copy Link */}
            <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#555] truncate max-w-[200px] select-all">
                {item.url}
              </span>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleCopyUrl(item.id, item.url)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-sm text-xs font-mono bg-[#111] hover:bg-[#1a1a1a] text-[#aaa] border border-[#222] transition-colors uppercase text-[10px]"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3 h-3 text-[#00FF41]" />
                      <span className="text-[#00FF41]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-3 py-1 rounded-sm text-xs font-mono font-bold bg-[#00FF41] hover:bg-[#00cc34] text-black transition-all uppercase text-[10px] shadow-sm"
                >
                  <span>Visit</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}

        {filteredLinks.length === 0 && (
          <div className="col-span-full bg-[#0c0c0c] border border-[#1a1a1a] p-8 text-center rounded-sm">
            <Search className="w-8 h-8 text-[#444] mx-auto mb-2" />
            <p className="text-sm font-mono text-[#888]">No matching mining pools or wallets found.</p>
          </div>
        )}
      </div>

      {/* CUSTOM USER BOOKMARKS SECTION */}
      <div className="bg-[#0c0c0c] p-5 rounded-sm border border-[#1a1a1a] shadow-lg">
        <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
          <Plus className="w-4 h-4 text-[#00FF41]" />
          <span>Add Custom Stratum Pool or Wallet Bookmark</span>
        </h3>
        <p className="text-xs text-[#777] font-mono mb-4">
          Save your personal mining pool stratum endpoints or private wallet Explorer links directly to local browser storage.
        </p>

        {/* Add Form */}
        <form onSubmit={handleAddCustomLink} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <input
            type="text"
            placeholder="Name e.g. My Zergpool LTC Stratum"
            value={newCustomName}
            onChange={(e) => setNewCustomName(e.target.value)}
            className="bg-[#080808] border border-[#1a1a1a] rounded-sm px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00FF41]"
          />
          <input
            type="text"
            placeholder="URL or Stratum (https:// or stratum+tcp://)"
            value={newCustomUrl}
            onChange={(e) => setNewCustomUrl(e.target.value)}
            className="bg-[#080808] border border-[#1a1a1a] rounded-sm px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00FF41]"
          />
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Notes / Wallet Tag (optional)"
              value={newCustomNote}
              onChange={(e) => setNewCustomNote(e.target.value)}
              className="flex-1 bg-[#080808] border border-[#1a1a1a] rounded-sm px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00FF41]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#00FF41] hover:bg-[#00cc34] text-black font-mono font-bold text-xs uppercase rounded-sm shrink-0"
            >
              Add Link
            </button>
          </div>
        </form>

        {/* Custom Links List */}
        {customLinks.length > 0 ? (
          <div className="space-y-2">
            {customLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between bg-[#080808] p-3 rounded-sm border border-[#1a1a1a] text-xs font-mono"
              >
                <div className="flex items-center space-x-3 truncate pr-4">
                  <div className="w-2 h-2 rounded-full bg-[#00FF41] shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-white mr-2">{link.name}</span>
                    <span className="text-[#666] select-all mr-2">{link.url}</span>
                    {link.note && (
                      <span className="text-[10px] bg-[#141414] text-[#aaa] border border-[#222] px-1.5 py-0.5 rounded-sm">
                        {link.note}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(link.id, link.url)}
                    className="p-1.5 text-[#888] hover:text-[#00FF41] transition-colors"
                    title="Copy URL"
                  >
                    {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-[#00FF41]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-[#888] hover:text-[#00FF41] transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomLink(link.id)}
                    className="p-1.5 text-[#888] hover:text-rose-500 transition-colors"
                    title="Delete link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#080808] p-4 rounded-sm border border-[#1a1a1a] text-center text-xs text-[#555] font-mono">
            No custom bookmarks added yet. Use the form above to save your custom stratum URLs.
          </div>
        )}
      </div>
    </div>
  );
};

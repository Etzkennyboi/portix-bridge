import { ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/30 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-bitcoin to-burnt flex items-center justify-center">
            <span className="text-white font-heading font-bold text-xs">P</span>
          </div>
          <div>
            <p className="text-xs font-heading text-white">Portix AI</p>
            <p className="text-[10px] font-mono text-slate-600">OKX Hackathon 2025 — Agent #5119</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <a href="https://layerzeroscan.com" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-slate-600 hover:text-bitcoin transition-colors flex items-center gap-1">
            LayerZero Scan <ArrowUpRight size={10} />
          </a>
          <a href="https://www.okx.com/ai" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-slate-600 hover:text-bitcoin transition-colors flex items-center gap-1">
            OKX.AI <ArrowUpRight size={10} />
          </a>
          <a href="https://docs.layerzero.network/v2" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-slate-600 hover:text-bitcoin transition-colors flex items-center gap-1">
            LZ Docs <ArrowUpRight size={10} />
          </a>
        </div>
      </div>
    </footer>
  );
}

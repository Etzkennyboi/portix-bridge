import { useState, useEffect } from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import logoImg from '../assets/logo.png';

export function Footer() {
  const [serviceOk, setServiceOk] = useState(null);

  useEffect(() => {
    fetch('https://portix-bridge-production.up.railway.app/health', { cache: 'no-store' })
      .then(r => setServiceOk(r.ok))
      .catch(() => setServiceOk(false));
  }, []);

  return (
    <footer className="border-t border-slate-800/30 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Portix AI" className="w-7 h-7 rounded-lg object-cover border border-slate-800" style={{ filter: 'brightness(1.4)' }} />
          <div>
            <p className="text-xs font-heading text-white">Portix AI</p>
            <p className="text-[10px] font-mono text-slate-600">OKX Hackathon 2025 · Agent #5119</p>
          </div>
          {/* Live service dot */}
          {serviceOk !== null && (
            <span className="flex items-center gap-1.5 ml-2 text-[10px] font-mono" style={{ color: serviceOk ? '#34d399' : '#f87171' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${serviceOk ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {serviceOk ? 'Live' : 'Offline'}
            </span>
          )}
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a
            href="https://www.okx.com/web3/marketplace/ai-agent/5119"
            target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-slate-600 hover:text-white transition-colors flex items-center gap-1"
          >
            OKX Marketplace <ArrowUpRight size={10} />
          </a>
          <a
            href="https://layerzeroscan.com"
            target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-slate-600 hover:text-white transition-colors flex items-center gap-1"
          >
            LayerZero Scan <ArrowUpRight size={10} />
          </a>
          <a
            href="https://github.com/Etzkennyboi/portix-bridge"
            target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-slate-600 hover:text-white transition-colors flex items-center gap-1"
          >
            <ExternalLink size={10} /> GitHub
          </a>
          <a
            href="https://docs.layerzero.network/v2"
            target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-slate-600 hover:text-white transition-colors flex items-center gap-1"
          >
            LZ Docs <ArrowUpRight size={10} />
          </a>
        </div>
      </div>
    </footer>
  );
}

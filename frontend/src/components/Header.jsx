import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import logoImg from '../assets/logo.png';

export function Header() {
  return (
    <nav className="w-full border-b border-slate-800/30 backdrop-blur-md sticky top-0 z-40" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Portix AI Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-800" />

          <div>
            <span className="font-heading font-semibold text-white text-sm">Portix AI</span>
            <span className="ml-2 text-[10px] font-mono text-slate-600">Agent Service Provider</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <a href="#agent-flow" className="text-sm font-heading text-slate-500 hover:text-white transition-colors">How It Works</a>
          <a href="#playground" className="text-sm font-heading text-slate-500 hover:text-white transition-colors">API Playground</a>
          <a href="#live-demo" className="text-sm font-heading text-slate-500 hover:text-white transition-colors">Live Demo</a>
          <a href="#skill-manifest" className="text-sm font-heading text-slate-500 hover:text-white transition-colors">SKILL.md</a>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-800/40 bg-emerald-950/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-400">Agent #5119</span>
        </div>
      </div>
    </nav>
  );
}

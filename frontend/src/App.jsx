import { motion } from 'framer-motion';
import { Zap, Shield, ArrowRight } from 'lucide-react';

import { Header } from './components/Header';
import { AgentFlowVisualizer } from './components/AgentFlowVisualizer';
import { ApiPlayground } from './components/ApiPlayground';
import { LiveBridgeDemo } from './components/LiveBridgeDemo';
import { SkillManifest } from './components/SkillManifest';
import { Footer } from './components/Footer';
import './index.css';

export default function App() {
  return (
    <div className="min-h-screen w-full" style={{ background: 'radial-gradient(ellipse at 50% -10%, #1c1149 0%, #030304 60%)' }}>
      <Header />

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-bitcoin/20 bg-bitcoin/5">
            <span className="w-1.5 h-1.5 rounded-full bg-bitcoin" />
            <span className="text-[11px] font-mono text-bitcoin tracking-widest uppercase">Agent Service Provider</span>
          </div>

          <h1 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-tight tracking-tight">
            Cross-Chain Bridge<br />
            <span style={{ background: 'linear-gradient(135deg, #f7931a, #ffd600)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              for AI Agents
            </span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Portix AI is an Agent Service Provider that lets any AI agent bridge USDT0 across 6 chains using LayerZero OFT v2. 
            Agents call a single endpoint, sign the returned transactions, and track delivery — no human intervention needed.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="#agent-flow"
              className="glow-btn-orange px-6 py-3 rounded-xl text-white font-heading font-semibold text-sm tracking-wide flex items-center gap-2"
            >
              How It Works <ArrowRight size={14} />
            </a>
            <a
              href="#live-demo"
              className="px-6 py-3 rounded-xl border border-slate-700/50 bg-darkmatter text-slate-300 font-heading font-semibold text-sm hover:border-bitcoin/40 hover:text-white transition-colors flex items-center gap-2"
            >
              <Zap size={14} /> Try Live Demo
            </a>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm font-mono">
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-white">6</p>
              <p className="text-xs text-slate-600">Chains</p>
            </div>
            <div className="w-px h-8 bg-slate-800/50" />
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-white">1</p>
              <p className="text-xs text-slate-600">API Call</p>
            </div>
            <div className="w-px h-8 bg-slate-800/50" />
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-white">30-90s</p>
              <p className="text-xs text-slate-600">Delivery</p>
            </div>
            <div className="w-px h-8 bg-slate-800/50" />
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-white">Free</p>
              <p className="text-xs text-slate-600">No Markup</p>
            </div>
          </div>

          {/* Supported Chains */}
          <div className="flex items-center justify-center gap-3 pt-4">
            {['Ethereum', 'X Layer', 'Arbitrum', 'Optimism', 'Polygon', 'Mantle'].map(name => (
              <span key={name} className="px-3 py-1.5 rounded-full bg-darkmatter border border-slate-800/40 text-[11px] font-mono text-slate-500">
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── SECTIONS ── */}
      <AgentFlowVisualizer />

      <div className="w-full border-t border-slate-800/20" />

      <ApiPlayground />

      <div className="w-full border-t border-slate-800/20" />

      <LiveBridgeDemo />

      <div className="w-full border-t border-slate-800/20" />

      <SkillManifest />

      <Footer />
    </div>
  );
}

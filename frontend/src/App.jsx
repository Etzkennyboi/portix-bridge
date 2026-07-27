import { motion } from 'framer-motion';
import { Zap, ArrowRight, Shield, Activity } from 'lucide-react';

import { Header }              from './components/Header';
import { ServiceStatus }       from './components/ServiceStatus';
import { AgentFlowVisualizer } from './components/AgentFlowVisualizer';
import { RouteMap }            from './components/RouteMap';
import { ApiPlayground }       from './components/ApiPlayground';
import { LiveBridgeDemo }      from './components/LiveBridgeDemo';
import { SkillManifest }       from './components/SkillManifest';
import { Footer }              from './components/Footer';
import './index.css';

/* Chain logo pills shown in hero */
const CHAIN_LOGOS = [
  { label: 'Ethereum', color: '#627EEA', icon: 'ETH' },
  { label: 'X Layer',  color: '#0052FE', icon: 'XLY' },
  { label: 'Arbitrum', color: '#12AAFF', icon: 'ARB' },
  { label: 'Optimism', color: '#FF0420', icon: 'OP'  },
  { label: 'Polygon',  color: '#8247E5', icon: 'POL' },
  { label: 'Mantle',   color: '#a5b4fc', icon: 'MNT' },
];

export default function App() {
  return (
    <div className="min-h-screen w-full" style={{ background: 'radial-gradient(ellipse at 50% -10%, #1a0a00 0%, #0a0500 35%, #000000 70%)' }}>
      <Header />

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
          className="text-center space-y-6"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-mono text-primary tracking-widest uppercase">Agent Service Provider · OKX Hackathon</span>
          </div>

          {/* Headline */}
          <h1 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-tight tracking-tight">
            Cross-Chain Bridging<br />
            <span className="shimmer-text">for AI Agents</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Portix AI is an Agent Service Provider (ASP) that lets any AI agent bridge USDT0
            across 6 chains via LayerZero OFT v2 — in a single API call.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a href="#live-demo" className="glow-btn-orange px-6 py-3 rounded-xl font-heading font-semibold text-sm tracking-wide flex items-center gap-2">
              <Zap size={14} /> Try Demo
            </a>
            <a href="#agent-flow" className="px-6 py-3 rounded-xl border border-slate-700/50 bg-darkmatter text-slate-300 font-heading font-semibold text-sm hover:border-primary/40 hover:text-white transition-colors flex items-center gap-2">
              How It Works <ArrowRight size={14} />
            </a>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-6 text-sm font-mono">
            {[
              { value: '6',    label: 'Chains' },
              { value: '30',   label: 'Routes' },
              { value: '1',    label: 'API Call' },
              { value: '30–90s', label: 'Delivery' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-heading font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Chain pills */}
          <div className="pt-8 border-t border-slate-800/15 max-w-3xl mx-auto">
            <p className="text-[10px] font-mono text-slate-700 uppercase tracking-widest mb-5">Supported Chains</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {CHAIN_LOGOS.map(c => (
                <div
                  key={c.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold"
                  style={{ borderColor: `${c.color}30`, background: `${c.color}10`, color: c.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── SERVICE STATUS TICKER ── */}
      <ServiceStatus />

      {/* ── ROUTE MAP ── */}
      <RouteMap />

      <div className="w-full border-t border-slate-800/15" />

      {/* ── HOW IT WORKS ── */}
      <AgentFlowVisualizer />

      <div className="w-full border-t border-slate-800/15" />

      {/* ── API PLAYGROUND ── */}
      <ApiPlayground />

      <div className="w-full border-t border-slate-800/15" />

      {/* ── LIVE DEMO ── */}
      <LiveBridgeDemo />

      <div className="w-full border-t border-slate-800/15" />

      {/* ── SKILL MANIFEST ── */}
      <SkillManifest />

      <Footer />
    </div>
  );
}

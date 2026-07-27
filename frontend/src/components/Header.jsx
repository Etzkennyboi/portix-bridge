import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logoImg from '../assets/logo.png';

const NAV_LINKS = [
  { href: '#agent-flow',    label: 'How It Works' },
  { href: '#playground',    label: 'API Playground' },
  { href: '#live-demo',     label: 'Live Demo' },
  { href: '#skill-manifest',label: 'SKILL.md' },
];

export function Header() {
  const [activeSection, setActiveSection] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ids = NAV_LINKS.map(l => l.href.slice(1));
    const observers = ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-30% 0px -60% 0px' }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  return (
    <nav
      className="w-full sticky top-0 z-40 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(0,0,0,0.90)' : 'rgba(0,0,0,0.50)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3">
          <img src={logoImg} alt="Portix AI" className="w-8 h-8 rounded-lg object-cover border border-slate-800" style={{ filter: 'brightness(1.4)' }} />
          <div>
            <span className="font-heading font-semibold text-white text-sm">Portix AI</span>
            <span className="ml-2 text-[10px] font-mono text-slate-600">ASP</span>
          </div>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => {
            const id = link.href.slice(1);
            const isActive = activeSection === id;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 text-sm font-heading rounded-lg transition-colors ${
                  isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-white/10 border border-white/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </a>
            );
          })}
        </div>

        {/* Agent badge — links to OKX marketplace */}
        <a
          href="https://www.okx.com/web3/marketplace/ai-agent/5119"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800/40 bg-slate-900/20 hover:border-slate-600/50 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-400">Agent #5119</span>
        </a>
      </div>
    </nav>
  );
}

/**
 * RouteMap.jsx
 * Visual 6×6 chain route capability matrix.
 * Green = supported, dark = self-route (not applicable).
 * Hover = shows live quote estimate from the backend.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';

const CHAINS = [
  { key: 'ethereum', label: 'Ethereum', short: 'ETH',  color: '#627EEA', bg: 'rgba(98,126,234,0.15)' },
  { key: 'xlayer',   label: 'X Layer',  short: 'XLY',  color: '#0052FE', bg: 'rgba(0,82,254,0.15)' },
  { key: 'arbitrum', label: 'Arbitrum', short: 'ARB',  color: '#12AAFF', bg: 'rgba(18,170,255,0.15)' },
  { key: 'optimism', label: 'Optimism', short: 'OP',   color: '#FF0420', bg: 'rgba(255,4,32,0.15)' },
  { key: 'polygon',  label: 'Polygon',  short: 'POL',  color: '#8247E5', bg: 'rgba(130,71,229,0.15)' },
  { key: 'mantle',   label: 'Mantle',   short: 'MNT',  color: '#a5b4fc', bg: 'rgba(165,180,252,0.15)' },
];

const QUOTE_CACHE = {};

export function RouteMap() {
  const [hoveredCell, setHoveredCell] = useState(null); // { src, dst }
  const [quoteData, setQuoteData] = useState({}); // key: "src-dst"

  const fetchQuote = useCallback(async (src, dst) => {
    const key = `${src}-${dst}`;
    if (QUOTE_CACHE[key]) {
      setQuoteData(prev => ({ ...prev, [key]: QUOTE_CACHE[key] }));
      return;
    }
    try {
      const url = `https://portix-bridge-production.up.railway.app/api/skills/bridge/quote?srcChain=${src}&dstChain=${dst}&token=USDT0&amount=100&recipient=0x0000000000000000000000000000000000000001`;
      // We pass payment-signature as dummy so endpoint skips x402 for quote preview
      const res = await fetch(url, { headers: { 'payment-signature': 'preview' } });
      const data = await res.json();
      const result = res.status === 200
        ? { fee: data.nativeFeeFormatted || '~fee', time: data.transferTimeEstimate || '30-90s' }
        : { fee: '—', time: '—' };
      QUOTE_CACHE[key] = result;
      setQuoteData(prev => ({ ...prev, [key]: result }));
    } catch {
      QUOTE_CACHE[`${src}-${dst}`] = { fee: '—', time: '—' };
    }
  }, []);

  const handleEnter = (src, dst) => {
    setHoveredCell({ src, dst });
    fetchQuote(src, dst);
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-4">
          <Zap size={12} className="text-primary" />
          <span className="text-[11px] font-mono text-primary tracking-widest uppercase">30 Bidirectional Routes</span>
        </div>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white">
          Bridge From Any Chain to Any Chain
        </h2>
        <p className="text-sm text-slate-500 mt-3 max-w-lg mx-auto">
          Every supported chain connects to every other. Hover a cell to preview the estimated fee.
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[520px]">
          {/* Column headers */}
          <div className="flex items-center mb-2 ml-24 gap-1.5">
            {CHAINS.map(c => (
              <div key={c.key} className="flex-1 text-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide" style={{ color: c.color }}>{c.short}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {CHAINS.map(srcChain => (
            <div key={srcChain.key} className="flex items-center gap-1.5 mb-1.5">
              {/* Row label */}
              <div className="w-24 flex-shrink-0 flex items-center gap-2 pr-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: srcChain.color }} />
                <span className="text-[11px] font-mono text-slate-400 truncate">{srcChain.label}</span>
              </div>

              {/* Cells */}
              {CHAINS.map(dstChain => {
                const isSelf = srcChain.key === dstChain.key;
                const key = `${srcChain.key}-${dstChain.key}`;
                const isHovered = hoveredCell?.src === srcChain.key && hoveredCell?.dst === dstChain.key;
                const qd = quoteData[key];

                return (
                  <div key={dstChain.key} className="flex-1 relative">
                    <motion.div
                      onMouseEnter={() => !isSelf && handleEnter(srcChain.key, dstChain.key)}
                      onMouseLeave={() => setHoveredCell(null)}
                      whileHover={!isSelf ? { scale: 1.08 } : {}}
                      className={`
                        h-9 rounded-lg flex items-center justify-center text-[10px] font-mono
                        transition-all duration-150 relative
                        ${isSelf
                          ? 'bg-slate-900/30 border border-slate-800/20 cursor-not-allowed'
                          : 'bg-emerald-900/20 border border-emerald-800/30 cursor-pointer hover:border-emerald-600/50 hover:bg-emerald-900/30'
                        }
                      `}
                    >
                      {isSelf ? (
                        <span className="text-slate-800">—</span>
                      ) : (
                        <span className="text-emerald-500">✓</span>
                      )}
                    </motion.div>

                    {/* Tooltip */}
                    <AnimatePresence>
                      {isHovered && !isSelf && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-xl border border-slate-700/60 bg-darkmatter shadow-xl p-3"
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-mono" style={{ color: srcChain.color }}>{srcChain.short}</span>
                            <ArrowRight size={9} className="text-slate-600" />
                            <span className="text-[10px] font-mono" style={{ color: dstChain.color }}>{dstChain.short}</span>
                          </div>
                          {qd ? (
                            <>
                              <p className="text-[10px] font-mono text-slate-500">Fee: <span className="text-white">{qd.fee}</span></p>
                              <p className="text-[10px] font-mono text-slate-500">Time: <span className="text-white">{qd.time}</span></p>
                            </>
                          ) : (
                            <p className="text-[10px] font-mono text-slate-600 animate-pulse">Loading quote...</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 ml-24 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-3 h-3 rounded bg-emerald-900/30 border border-emerald-800/40 flex items-center justify-center text-[8px]">✓</span>
              Supported
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded bg-slate-900/30 border border-slate-800/20" />
              Same chain
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

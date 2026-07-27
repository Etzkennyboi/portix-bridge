/**
 * ServiceStatus.jsx
 * Live health ticker — fetches /health from the Railway backend and
 * displays service status, version, and supported chain count.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, RefreshCw } from 'lucide-react';

const HEALTH_URL = 'https://portix-bridge-production.up.railway.app/health';

export function ServiceStatus() {
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [data, setData] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setStatus('loading');
    try {
      const res = await fetch(HEALTH_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('non-ok');
      const json = await res.json();
      setData(json);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
    setLastChecked(new Date());
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 60_000);
    return () => clearInterval(id);
  }, []);

  const isOk = status === 'ok';
  const isLoading = status === 'loading';

  return (
    <div className="max-w-6xl mx-auto px-6 pb-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 rounded-xl border border-slate-800/40 bg-darkmatter/50 backdrop-blur-sm"
      >
        {/* Status dot + label */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOk ? 'bg-white' : isLoading ? 'bg-slate-400' : 'bg-zinc-600'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOk ? 'bg-white' : isLoading ? 'bg-slate-400' : 'bg-zinc-600'}`} />
          </span>
          <span className={`text-xs font-mono font-medium ${isOk ? 'text-white' : isLoading ? 'text-slate-400' : 'text-zinc-500'}`}>
            {isOk ? 'Service Online' : isLoading ? 'Checking...' : 'Service Offline'}
          </span>
        </div>

        {/* Stats from /health */}
        <AnimatePresence>
          {isOk && data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-1"
            >
              <span className="text-[11px] font-mono text-slate-500">
                v<span className="text-slate-300">{data.version}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Chains: <span className="text-slate-300">{data.supportedChains?.length ?? 6}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Token: <span className="text-slate-300">{data.supportedTokens?.join(', ') ?? 'USDT0'}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Agent: <span className="text-primary">#5119</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last checked + refresh */}
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[10px] font-mono text-slate-700">
              {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchHealth}
            className="text-slate-700 hover:text-slate-400 transition-colors cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

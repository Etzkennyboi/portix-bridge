import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Check, Loader2, AlertTriangle, Clock, Info } from 'lucide-react';

const TABS = [
  {
    id: 'quote',
    label: 'Quote',
    method: 'GET',
    path: '/api/skills/bridge/quote',
    description: 'Get a real-time fee estimate for bridging without executing',
    defaultParams: { srcChain: 'xlayer', dstChain: 'arbitrum', token: 'USDT0', amount: '10', recipient: '0x0000000000000000000000000000000000000001' },
  },
  {
    id: 'route',
    label: 'Route',
    method: 'POST',
    path: '/api/skills/bridge/route',
    description: 'Find the cheapest or fastest bridge route across all supported chains',
    defaultParams: { fromChain: 'xlayer', toChainOptions: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'mantle'], token: 'USDT0', amount: '10', priority: 'cheapest' },
  },
  {
    id: 'intent',
    label: 'Intent',
    method: 'POST',
    path: '/api/skills/bridge/intent',
    description: 'Build the full transaction sequence an AI agent would sign (read-only preview)',
    defaultParams: { srcChain: 'xlayer', dstChain: 'arbitrum', token: 'USDT0', amount: '10', recipient: '0x0000000000000000000000000000000000000001', agentAddress: '0x0000000000000000000000000000000000000001', refundAddress: '0x0000000000000000000000000000000000000001' },
  },
  {
    id: 'check',
    label: 'Check',
    method: 'POST',
    path: '/api/skills/bridge/check',
    description: 'Validate wallet balances and execution readiness before bridging',
    defaultParams: { srcChain: 'xlayer', dstChain: 'arbitrum', token: 'USDT0', amount: '10', recipient: '0x0000000000000000000000000000000000000001', agentAddress: '0x0000000000000000000000000000000000000001' },
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="text-slate-600 hover:text-slate-400 transition-colors cursor-pointer p-1" title="Copy">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function StatusBadge({ status, ms }) {
  if (!status) return null;
  const is2xx = status >= 200 && status < 300;
  const is402 = status === 402;
  const is4xx = status >= 400 && status < 500 && status !== 402;
  const is5xx = status >= 500;

  const config = is2xx
    ? { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-800/40' }
    : is402
    ? { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-800/40' }
    : is4xx
    ? { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-800/40' }
    : { bg: 'bg-red-900/40', text: 'text-red-300', border: 'border-red-800/50' };

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${config.bg} ${config.text} ${config.border}`}>
        {status}
        {is402 && ' x402'}
      </span>
      {ms && (
        <span className="flex items-center gap-1 text-[10px] font-mono text-slate-600">
          <Clock size={10} /> {ms}ms
        </span>
      )}
    </div>
  );
}

function X402Notice() {
  return (
    <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2.5 mt-2">
      <Info size={13} className="flex-shrink-0 mt-0.5" />
      <span>
        <strong>402 Payment Required</strong> is the expected x402 challenge — not an error.
        The live AI evaluator pays this fee automatically and retries to receive the real response.
      </span>
    </div>
  );
}

export function ApiPlayground() {
  const [activeTab, setActiveTab] = useState(0);
  const [params, setParams] = useState(JSON.stringify(TABS[0].defaultParams, null, 2));
  const [response, setResponse] = useState(null);
  const [httpStatus, setHttpStatus] = useState(null);
  const [responseMs, setResponseMs] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const handleTabChange = (i) => {
    setActiveTab(i);
    setParams(JSON.stringify(TABS[i].defaultParams, null, 2));
    setResponse(null);
    setHttpStatus(null);
    setResponseMs(null);
    setError(null);
  };

  const handleExecute = async () => {
    setIsRunning(true);
    setError(null);
    setResponse(null);
    setHttpStatus(null);
    setResponseMs(null);
    const tab = TABS[activeTab];
    const t0 = performance.now();

    try {
      const parsed = JSON.parse(params);
      let res;

      if (tab.method === 'GET') {
        const query = new URLSearchParams(parsed).toString();
        res = await fetch(`${tab.path}?${query}`);
      } else {
        res = await fetch(tab.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });
      }

      const elapsed = Math.round(performance.now() - t0);
      setHttpStatus(res.status);
      setResponseMs(elapsed);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const tab = TABS[activeTab];

  return (
    <section id="playground" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white">
          API Playground
        </h2>
        <p className="text-sm text-slate-500 mt-3 max-w-lg mx-auto">
          Fire real API calls against the live backend. Edit parameters and inspect the raw JSON response an AI agent receives.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-800/30 overflow-x-auto no-scrollbar">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(i)}
              className={`px-5 py-3 text-sm font-heading font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === i
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <span className={`text-[10px] font-mono mr-1.5 px-1.5 py-0.5 rounded ${
                t.method === 'GET' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'
              }`}>
                {t.method}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/30">
          {/* Request Panel */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-slate-400">{tab.method} <span className="text-slate-300">{tab.path}</span></p>
                <p className="text-xs text-slate-600 mt-1">{tab.description}</p>
              </div>
              <CopyButton text={params} />
            </div>

            <textarea
              value={params}
              onChange={e => setParams(e.target.value)}
              spellCheck={false}
              className="w-full h-64 bg-void border border-slate-800/40 rounded-xl p-4 text-xs font-mono text-slate-300 leading-relaxed resize-none focus:outline-none focus:border-primary/40 transition-colors"
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleExecute}
              disabled={isRunning}
              className="glow-btn-orange w-full py-3 rounded-xl font-heading font-semibold text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isRunning ? 'Calling API...' : 'Execute Request'}
            </motion.button>
          </div>

          {/* Response Panel */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-xs font-mono text-slate-500">Response</p>
                <StatusBadge status={httpStatus} ms={responseMs} />
              </div>
              {response && <CopyButton text={response} />}
            </div>

            <div className="bg-void border border-slate-800/40 rounded-xl p-4 h-64 overflow-auto no-scrollbar">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}
              {response && (
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: httpStatus === 402 ? '#fbbf24' : httpStatus >= 400 ? '#f87171' : '#6ee7b7' }}>
                  {response}
                </pre>
              )}
              {!response && !error && (
                <p className="text-xs font-mono text-slate-700 italic">Hit "Execute Request" to see the response here.</p>
              )}
            </div>

            {/* 402 explanation */}
            <AnimatePresence>
              {httpStatus === 402 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <X402Notice />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

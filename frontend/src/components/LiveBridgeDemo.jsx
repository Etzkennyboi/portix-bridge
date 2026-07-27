/**
 * LiveBridgeDemo.jsx
 * Two modes:
 *   A) Simulate Agent (default) — fires real API calls, no wallet needed.
 *      Shows the full 4-step agent flow with real responses.
 *   B) Live Execution (opt-in) — connects a wallet for actual on-chain signing.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Loader2, CheckCircle, AlertTriangle, ArrowRight,
  ChevronDown, ChevronUp, Key, Eye, EyeOff, Zap, Activity,
} from 'lucide-react';
import { createWallet, getAddress, isValidPrivateKey, signAndBroadcast, waitForConfirmation, getNativeBalance, CHAIN_LABELS, CHAIN_NATIVE } from '../lib/wallet';
import { TransactionFeedback } from './TransactionFeedback';

const CHAINS = ['xlayer', 'ethereum', 'arbitrum', 'optimism', 'polygon', 'mantle'];
const CHAIN_COLOURS = {
  xlayer: '#0052FE', ethereum: '#627EEA', arbitrum: '#12AAFF',
  optimism: '#FF0420', polygon: '#8247E5', mantle: '#a5b4fc',
};
const DUMMY_ADDR = '0x0000000000000000000000000000000000000001';

const SIM_PHASE = { IDLE: 'idle', QUOTING: 'quoting', ROUTING: 'routing', INTENT: 'intent', DONE: 'done', ERROR: 'error' };
const LIVE_PHASE = { IDLE: 'idle', WALLET_READY: 'wallet_ready', FETCHING_INTENT: 'fetching_intent', INTENT_READY: 'intent_ready', SIGNING: 'signing', TRACKING: 'tracking', COMPLETE: 'complete', ERROR: 'error' };

/* ─── Log helpers ──────────────────────────────────────────────────────────── */
function useLog() {
  const [logs, setLogs] = useState([]);
  const add = useCallback((msg, level = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toISOString().slice(11, 19), msg, level }]);
  }, []);
  const clear = useCallback(() => setLogs([]), []);
  return { logs, add, clear };
}

/* ─── Log Panel ────────────────────────────────────────────────────────────── */
function LogPanel({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);

  const colours = { info: 'text-slate-400', tx: 'text-primary', ok: 'text-emerald-400', err: 'text-red-400', step: 'text-accent' };
  return (
    <div className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm overflow-hidden sticky top-20">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/30">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-mono text-slate-500">Agent Runtime Log</span>
        <span className="ml-auto text-[10px] font-mono text-slate-700">{logs.length} entries</span>
      </div>
      <div ref={ref} className="p-4 h-96 overflow-y-auto no-scrollbar space-y-0.5">
        {logs.length === 0 && (
          <p className="text-xs font-mono text-slate-700 italic">Logs will appear here as the agent executes...</p>
        )}
        {logs.map((entry, i) => (
          <div key={i} className="text-[11px] font-mono leading-relaxed">
            <span className="text-slate-700">[{entry.time}]</span>{' '}
            <span className={colours[entry.level] || 'text-slate-400'}>{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Chain Selector ───────────────────────────────────────────────────────── */
function ChainSelect({ label, value, onChange, exclude }) {
  return (
    <div>
      <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-void border border-slate-800/50 rounded-lg px-3 py-2.5 text-sm font-heading text-white focus:outline-none focus:border-primary/50 cursor-pointer appearance-none"
        >
          {CHAINS.filter(c => c !== exclude).map(c => (
            <option key={c} value={c}>{CHAIN_LABELS[c]}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHAIN_COLOURS[value] }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Simulate Agent Mode ──────────────────────────────────────────────────── */
function SimulateMode() {
  const [srcChain, setSrcChain] = useState('xlayer');
  const [dstChain, setDstChain] = useState('arbitrum');
  const [amount, setAmount] = useState('10');
  const [phase, setPhase] = useState(SIM_PHASE.IDLE);
  const [quoteResult, setQuoteResult] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [intentResult, setIntentResult] = useState(null);
  const [error, setError] = useState(null);
  const { logs, add, clear } = useLog();

  const reset = () => {
    setPhase(SIM_PHASE.IDLE);
    setQuoteResult(null);
    setRouteResult(null);
    setIntentResult(null);
    setError(null);
    clear();
  };

  const runSimulation = async () => {
    reset();
    setPhase(SIM_PHASE.QUOTING);
    add(`[AGENT] Starting simulation: ${CHAIN_LABELS[srcChain]} → ${CHAIN_LABELS[dstChain]}`, 'step');
    add(`[AGENT] Amount: ${amount} USDT0`, 'info');

    try {
      // Step 1: Quote
      add(`[CALL] GET /api/skills/bridge/quote`, 'tx');
      const qRes = await fetch(`/api/skills/bridge/quote?srcChain=${srcChain}&dstChain=${dstChain}&token=USDT0&amount=${amount}&recipient=${DUMMY_ADDR}`);
      const qData = await qRes.json();
      if (qRes.status === 402) {
        add(`[402] x402 challenge received — agent would pay fee and retry`, 'ok');
        add(`[SIM] In simulation mode, using mock quote values`, 'info');
        setQuoteResult({ nativeFeeFormatted: '~0.001', transferTimeEstimate: '30-90s', status: 'simulated' });
      } else if (qRes.ok) {
        add(`[OK] Quote received: fee=${qData.nativeFeeFormatted || qData.nativeFee}`, 'ok');
        setQuoteResult(qData);
      } else {
        throw new Error(qData.error || 'Quote failed');
      }

      // Step 2: Route
      setPhase(SIM_PHASE.ROUTING);
      add(`[CALL] POST /api/skills/bridge/route`, 'tx');
      const rRes = await fetch('/api/skills/bridge/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromChain: srcChain, toChainOptions: [dstChain], token: 'USDT0', amount, priority: 'cheapest' }),
      });
      const rData = await rRes.json();
      if (rRes.status === 402) {
        add(`[402] x402 challenge — agent pays & retries`, 'ok');
        setRouteResult({ recommended: dstChain, status: 'simulated' });
      } else if (rRes.ok) {
        add(`[OK] Best route: ${srcChain} → ${rData.recommendedRoute?.dstChain || dstChain}`, 'ok');
        setRouteResult(rData);
      }

      // Step 3: Intent
      setPhase(SIM_PHASE.INTENT);
      add(`[CALL] POST /api/skills/bridge/intent`, 'tx');
      const iRes = await fetch('/api/skills/bridge/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srcChain, dstChain, token: 'USDT0', amount, recipient: DUMMY_ADDR, agentAddress: DUMMY_ADDR, refundAddress: DUMMY_ADDR }),
      });
      const iData = await iRes.json();
      if (iRes.status === 402) {
        add(`[402] x402 challenge received`, 'ok');
        add(`[SIM] In a live agent: payment is sent automatically, then intent is re-called`, 'info');
        // Simulate what the response would look like
        setIntentResult({
          status: 'READY',
          transactions: [
            { type: 'APPROVE', description: 'Approve USDT0 for LayerZero OFT contract' },
            { type: 'BRIDGE_SEND', description: `LayerZero OFT.send() — ${srcChain} → ${dstChain}` },
          ],
          _simulated: true,
        });
      } else if (iRes.ok) {
        add(`[OK] Intent returned ${iData.transactions?.length || 0} transaction(s) to sign`, 'ok');
        iData.transactions?.forEach((tx, i) => add(`  tx[${i}]: ${tx.type} — ${tx.description}`, 'info'));
        setIntentResult(iData);
      } else {
        throw new Error(iData.error || 'Intent failed');
      }

      add(`[DONE] Simulation complete — in a live agent, these txs would now be signed`, 'ok');
      setPhase(SIM_PHASE.DONE);
    } catch (e) {
      add(`[ERR] ${e.message}`, 'err');
      setError(e.message);
      setPhase(SIM_PHASE.ERROR);
    }
  };

  const isRunning = [SIM_PHASE.QUOTING, SIM_PHASE.ROUTING, SIM_PHASE.INTENT].includes(phase);
  const phaseLabel = { [SIM_PHASE.QUOTING]: 'Getting quote...', [SIM_PHASE.ROUTING]: 'Finding best route...', [SIM_PHASE.INTENT]: 'Building transactions...' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-4">
        {/* Config card */}
        <div className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h3 className="font-heading font-semibold text-white text-sm">Configure Bridge</h3>
            <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">No wallet needed</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ChainSelect label="From" value={srcChain} onChange={setSrcChain} exclude={dstChain} />
            <ChainSelect label="To" value={dstChain} onChange={setDstChain} exclude={srcChain} />
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Amount (USDT0)</label>
              <input
                type="number" min="0.1" step="1" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-void border border-slate-800/50 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Route preview pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-void border border-slate-800/30 w-fit">
            <span className="text-xs font-mono font-bold" style={{ color: CHAIN_COLOURS[srcChain] }}>{srcChain}</span>
            <ArrowRight size={12} className="text-slate-600" />
            <span className="text-xs font-mono font-bold" style={{ color: CHAIN_COLOURS[dstChain] }}>{dstChain}</span>
            <span className="text-[10px] font-mono text-slate-600 ml-1">USDT0 {amount}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={phase === SIM_PHASE.DONE || phase === SIM_PHASE.ERROR ? reset : runSimulation}
            disabled={isRunning}
            className="glow-btn-orange w-full py-3.5 rounded-xl font-heading font-semibold text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {isRunning ? (phaseLabel[phase] || 'Running...') : phase === SIM_PHASE.DONE || phase === SIM_PHASE.ERROR ? 'Run Again' : 'Run Agent Simulation'}
          </motion.button>
        </div>

        {/* Step results */}
        <AnimatePresence>
          {quoteResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 p-5 space-y-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-xs font-heading font-semibold text-white">Step 1 — Quote</span>
                {quoteResult._simulated && <span className="text-[9px] font-mono text-slate-600 ml-auto">simulated</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-void rounded-lg p-3 border border-slate-800/30">
                  <p className="text-slate-600 mb-1">Est. Fee</p>
                  <p className="text-white">{quoteResult.nativeFeeFormatted || quoteResult.nativeFee || '~0.001'}</p>
                </div>
                <div className="bg-void rounded-lg p-3 border border-slate-800/30">
                  <p className="text-slate-600 mb-1">Delivery</p>
                  <p className="text-white">{quoteResult.transferTimeEstimate || '30–90s'}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {intentResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-xs font-heading font-semibold text-white">Step 3 — Transaction Queue</span>
                {intentResult._simulated && <span className="text-[9px] font-mono text-slate-600 ml-auto">simulated</span>}
              </div>
              {intentResult.transactions?.map((tx, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-void border border-slate-800/30">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-sm font-heading text-white capitalize">{tx.type}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">{tx.description}</p>
                    {!intentResult._simulated && (
                      <p className="text-[10px] font-mono text-slate-700 mt-1 italic">In live execution: agent signs this tx and waits for confirmation</p>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-3"
            >
              <AlertTriangle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LogPanel logs={logs} />
    </div>
  );
}

/* ─── Live Execution Mode ──────────────────────────────────────────────────── */
function LiveExecutionMode() {
  const [open, setOpen] = useState(false);
  const [pk, setPk] = useState('');
  const [showPk, setShowPk] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [nativeBalance, setNativeBalance] = useState(null);
  const [srcChain, setSrcChain] = useState('xlayer');
  const [dstChain, setDstChain] = useState('arbitrum');
  const [amount, setAmount] = useState('1');
  const [phase, setPhase] = useState(LIVE_PHASE.IDLE);
  const [intentResult, setIntentResult] = useState(null);
  const [currentTxIndex, setCurrentTxIndex] = useState(0);
  const [txHashes, setTxHashes] = useState([]);
  const [txStatus, setTxStatus] = useState(null);
  const [error, setError] = useState(null);
  const { logs, add } = useLog();

  const connectWallet = async () => {
    setError(null);
    if (!isValidPrivateKey(pk)) { setError('Invalid private key — must be 64 hex chars.'); return; }
    try {
      const addr = getAddress(pk);
      setWalletAddress(addr);
      add(`Wallet: ${addr}`, 'ok');
      const wallet = createWallet(pk, srcChain);
      const bal = await getNativeBalance(wallet);
      setNativeBalance(bal);
      add(`Balance: ${parseFloat(bal).toFixed(6)} ${CHAIN_NATIVE[srcChain]}`, 'info');
      setPhase(LIVE_PHASE.WALLET_READY);
    } catch (e) { setError(e.message); }
  };

  const fetchIntent = async () => {
    setPhase(LIVE_PHASE.FETCHING_INTENT);
    add(`POST /api/skills/bridge/intent`, 'tx');
    try {
      const body = { srcChain, dstChain, token: 'USDT0', amount, recipient: walletAddress, agentAddress: walletAddress, refundAddress: walletAddress };
      const res = await fetch('/api/skills/bridge/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Intent failed');
      add(`${data.transactions.length} tx(s) returned`, 'ok');
      setIntentResult(data); setCurrentTxIndex(0); setTxHashes([]);
      setPhase(LIVE_PHASE.INTENT_READY);
    } catch (e) { setError(e.message); setPhase(LIVE_PHASE.ERROR); }
  };

  const signNext = async () => {
    setPhase(LIVE_PHASE.SIGNING);
    const step = intentResult.transactions[currentTxIndex];
    add(`Signing ${step.type}...`, 'tx');
    try {
      const wallet = createWallet(pk, srcChain);
      const tx = await signAndBroadcast(wallet, step.tx);
      add(`Broadcast: ${tx.hash}`, 'ok');
      const receipt = await waitForConfirmation(tx);
      add(`Confirmed block ${receipt.blockNumber}`, 'ok');
      const newHashes = [...txHashes, tx.hash];
      setTxHashes(newHashes);
      if (currentTxIndex + 1 < intentResult.transactions.length) {
        setCurrentTxIndex(currentTxIndex + 1); setPhase(LIVE_PHASE.INTENT_READY);
      } else {
        setTxStatus({ status: 'PENDING', txHash: newHashes[newHashes.length - 1], srcChain });
        setPhase(LIVE_PHASE.TRACKING);
        pollStatus(newHashes[newHashes.length - 1]);
      }
    } catch (e) { setError(e.message); setPhase(LIVE_PHASE.ERROR); }
  };

  const pollStatus = async (txHash) => {
    try {
      const res = await fetch(`/api/skills/bridge/status?txHash=${txHash}&srcChain=${srcChain}`);
      const data = await res.json();
      add(`Status: ${data.status}`, 'info');
      setTxStatus({ status: data.status, txHash, srcChain });
      if (data.status === 'DELIVERED') { setPhase(LIVE_PHASE.COMPLETE); }
      else if (data.status === 'FAILED') { setError('Bridge failed.'); setPhase(LIVE_PHASE.ERROR); }
      else { setTimeout(() => pollStatus(txHash), 15000); }
    } catch (e) { setTimeout(() => pollStatus(txHash), 15000); }
  };

  return (
    <div className="rounded-2xl border border-slate-800/30 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <Key size={16} className="text-slate-500" />
          <div className="text-left">
            <p className="text-sm font-heading font-semibold text-slate-300">Live Execution Mode</p>
            <p className="text-[11px] font-mono text-slate-600">Connect a wallet to sign real on-chain transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-amber-500/70 border border-amber-800/30 px-2 py-0.5 rounded-full">Use test wallet</span>
          {open ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800/30 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 p-6">
              <div className="space-y-4">
                {/* Private key input */}
                {!walletAddress && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input type={showPk ? 'text' : 'password'} placeholder="Paste private key (0x...)"
                        value={pk} onChange={e => setPk(e.target.value)}
                        className="w-full bg-void border border-slate-800/50 rounded-xl px-4 py-3 pr-10 text-sm font-mono text-white placeholder-slate-700 focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      <button onClick={() => setShowPk(!showPk)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer">
                        {showPk ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={connectWallet}
                      className="w-full py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 font-heading font-semibold text-sm hover:bg-slate-800/70 transition-colors cursor-pointer"
                    >Connect Wallet</motion.button>
                  </div>
                )}

                {walletAddress && (
                  <div className="text-xs font-mono space-y-1">
                    <p className="text-slate-500">Address: <span className="text-white">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span></p>
                    {nativeBalance && <p className="text-slate-500">Balance: <span className="text-emerald-400">{parseFloat(nativeBalance).toFixed(6)} {CHAIN_NATIVE[srcChain]}</span></p>}
                  </div>
                )}

                {phase === LIVE_PHASE.WALLET_READY && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <ChainSelect label="From" value={srcChain} onChange={setSrcChain} exclude={dstChain} />
                      <ChainSelect label="To" value={dstChain} onChange={setDstChain} exclude={srcChain} />
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Amount</label>
                        <input type="number" min="0" step="0.1" value={amount} onChange={e => setAmount(e.target.value)}
                          className="w-full bg-void border border-slate-800/50 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={fetchIntent}
                      className="glow-btn-orange w-full py-3 rounded-xl font-heading font-semibold text-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play size={15} /> Execute as Agent
                    </motion.button>
                  </div>
                )}

                {phase === LIVE_PHASE.FETCHING_INTENT && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Calling /intent...
                  </div>
                )}

                {intentResult && phase !== LIVE_PHASE.FETCHING_INTENT && (
                  <div className="space-y-2">
                    {intentResult.transactions.map((tx, i) => {
                      const done = i < currentTxIndex || [LIVE_PHASE.TRACKING, LIVE_PHASE.COMPLETE].includes(phase);
                      const active = i === currentTxIndex && [LIVE_PHASE.INTENT_READY, LIVE_PHASE.SIGNING].includes(phase);
                      return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${done ? 'bg-emerald-950/10 border-emerald-800/30' : active ? 'bg-primary/5 border-primary/30' : 'bg-void border-slate-800/30 opacity-40'}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono ${done ? 'bg-emerald-400/20 text-emerald-400' : active ? 'bg-primary/20 text-primary' : 'bg-slate-800/50 text-slate-600'}`}>
                            {done ? <CheckCircle size={12} /> : active && phase === LIVE_PHASE.SIGNING ? <Loader2 size={12} className="animate-spin" /> : i + 1}
                          </span>
                          <div>
                            <p className="text-xs font-heading text-white capitalize">{tx.type}</p>
                            {txHashes[i] && <p className="text-[10px] font-mono text-emerald-400/70 truncate max-w-40">{txHashes[i]}</p>}
                          </div>
                        </div>
                      );
                    })}
                    {phase === LIVE_PHASE.INTENT_READY && (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={signNext}
                        className="w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-800/30 text-emerald-400 font-heading font-semibold text-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        Sign tx[{currentTxIndex}]: {intentResult.transactions[currentTxIndex].type}
                      </motion.button>
                    )}
                  </div>
                )}

                {txStatus && [LIVE_PHASE.TRACKING, LIVE_PHASE.COMPLETE].includes(phase) && (
                  <TransactionFeedback status={txStatus.status} txHash={txStatus.txHash} srcChain={txStatus.srcChain} />
                )}

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-3">
                    <AlertTriangle size={14} />{error}
                  </div>
                )}
              </div>
              <LogPanel logs={logs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Export ──────────────────────────────────────────────────────────── */
export function LiveBridgeDemo() {
  return (
    <section id="live-demo" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-4">
          <Activity size={12} className="text-primary" />
          <span className="text-[11px] font-mono text-primary tracking-widest uppercase">Live Demo</span>
        </div>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white">
          Watch the Agent Execute
        </h2>
        <p className="text-sm text-slate-500 mt-3 max-w-xl mx-auto">
          This panel replicates exactly what an AI agent does — call the bridge API, receive the transaction queue, and track delivery.
          No wallet required to try the simulation.
        </p>
      </div>

      <div className="space-y-6">
        <SimulateMode />
        <LiveExecutionMode />
      </div>
    </section>
  );
}

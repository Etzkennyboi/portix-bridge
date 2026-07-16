import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Wallet, ChevronDown, ArrowRight, Loader2, CheckCircle, AlertTriangle, Play, Eye, EyeOff } from 'lucide-react';
import { createWallet, getAddress, isValidPrivateKey, signAndBroadcast, waitForConfirmation, getNativeBalance, CHAIN_LABELS, CHAIN_NATIVE } from '../lib/wallet';
import { TransactionFeedback } from './TransactionFeedback';

const CHAINS = ['xlayer', 'ethereum', 'arbitrum', 'optimism', 'polygon', 'mantle'];

const PHASE = {
  IDLE: 'idle',
  WALLET_READY: 'wallet_ready',
  FETCHING_INTENT: 'fetching_intent',
  INTENT_READY: 'intent_ready',
  SIGNING: 'signing',
  TRACKING: 'tracking',
  COMPLETE: 'complete',
  ERROR: 'error',
};

export function LiveBridgeDemo() {
  const [pk, setPk] = useState('');
  const [showPk, setShowPk] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [nativeBalance, setNativeBalance] = useState(null);

  const [srcChain, setSrcChain] = useState('xlayer');
  const [dstChain, setDstChain] = useState('arbitrum');
  const [amount, setAmount] = useState('0.5');

  const [phase, setPhase] = useState(PHASE.IDLE);
  const [intentResult, setIntentResult] = useState(null);
  const [currentTxIndex, setCurrentTxIndex] = useState(0);
  const [txHashes, setTxHashes] = useState([]);
  const [txStatus, setTxStatus] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const log = useCallback((msg) => {
    setLogs(prev => [...prev, { time: new Date().toISOString().slice(11, 19), msg }]);
  }, []);

  // Step 1: Connect wallet
  const handleConnectWallet = async () => {
    setError(null);
    if (!isValidPrivateKey(pk)) {
      setError('Invalid private key format. Must be 64 hex characters.');
      return;
    }

    try {
      const addr = getAddress(pk);
      setWalletAddress(addr);
      log(`Wallet connected: ${addr}`);

      const wallet = createWallet(pk, srcChain);
      const bal = await getNativeBalance(wallet);
      setNativeBalance(bal);
      log(`${CHAIN_NATIVE[srcChain]} balance on ${CHAIN_LABELS[srcChain]}: ${bal}`);
      setPhase(PHASE.WALLET_READY);
    } catch (e) {
      setError(e.message);
      log(`Error: ${e.message}`);
    }
  };

  // Step 2: Call /intent
  const handleFetchIntent = async () => {
    setPhase(PHASE.FETCHING_INTENT);
    setError(null);
    log(`Calling POST /api/skills/bridge/intent...`);

    try {
      const body = {
        srcChain,
        dstChain,
        token: 'USDT0',
        amount,
        recipient: walletAddress,
        agentAddress: walletAddress,
        refundAddress: walletAddress,
      };
      log(`Params: ${JSON.stringify(body)}`);

      const res = await fetch('/api/skills/bridge/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Intent request failed');
      }

      log(`Intent returned: ${data.transactions.length} transactions to sign`);
      data.transactions.forEach((tx, i) => {
        log(`  tx[${i}]: ${tx.type} — ${tx.description}`);
      });

      setIntentResult(data);
      setCurrentTxIndex(0);
      setTxHashes([]);
      setPhase(PHASE.INTENT_READY);
    } catch (e) {
      setError(e.message);
      log(`Intent error: ${e.message}`);
      setPhase(PHASE.ERROR);
    }
  };

  // Step 3: Sign & broadcast each transaction
  const handleSignNext = async () => {
    setPhase(PHASE.SIGNING);
    setError(null);

    const step = intentResult.transactions[currentTxIndex];
    log(`Signing tx[${currentTxIndex}]: ${step.type}...`);

    try {
      const wallet = createWallet(pk, srcChain);
      const tx = await signAndBroadcast(wallet, step.tx);
      log(`Broadcast: ${tx.hash}`);
      log(`Waiting for confirmation...`);

      const receipt = await waitForConfirmation(tx);
      log(`Confirmed in block ${receipt.blockNumber}`);

      const newHashes = [...txHashes, tx.hash];
      setTxHashes(newHashes);

      if (currentTxIndex + 1 < intentResult.transactions.length) {
        setCurrentTxIndex(currentTxIndex + 1);
        setPhase(PHASE.INTENT_READY);
        log(`Next: tx[${currentTxIndex + 1}]`);
      } else {
        log(`All transactions signed. Tracking bridge delivery...`);
        const sendHash = newHashes[newHashes.length - 1];
        setTxStatus({ status: 'PENDING', txHash: sendHash, srcChain });
        setPhase(PHASE.TRACKING);
        pollStatus(sendHash);
      }
    } catch (e) {
      setError(e.message);
      log(`Sign error: ${e.message}`);
      setPhase(PHASE.ERROR);
    }
  };

  // Step 4: Poll status
  const pollStatus = async (txHash) => {
    log(`Polling GET /api/skills/bridge/status?txHash=${txHash}&srcChain=${srcChain}`);
    try {
      const res = await fetch(`/api/skills/bridge/status?txHash=${txHash}&srcChain=${srcChain}`);
      const data = await res.json();
      log(`Status: ${data.status}`);
      setTxStatus({ status: data.status, txHash, srcChain });

      if (data.status === 'DELIVERED') {
        log(`Bridge complete! Destination tx: ${data.dstTxHash || 'pending'}`);
        setPhase(PHASE.COMPLETE);
      } else if (data.status === 'FAILED') {
        setError('Bridge failed. Check LayerZero Scan.');
        setPhase(PHASE.ERROR);
      } else {
        setTimeout(() => pollStatus(txHash), 15000);
      }
    } catch (e) {
      log(`Status poll error: ${e.message}, retrying in 15s...`);
      setTimeout(() => pollStatus(txHash), 15000);
    }
  };

  return (
    <section id="live-demo" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <p className="text-[11px] font-mono text-bitcoin uppercase tracking-widest mb-3">Execute a Real Bridge</p>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white">
          Live Demo
        </h2>
        <p className="text-sm text-slate-500 mt-3 max-w-lg mx-auto">
          This panel does exactly what an AI agent does: call <code className="text-bitcoin">/intent</code>, sign the returned transactions, and track delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Main Panel */}
        <div className="space-y-5">
          {/* Wallet Connection */}
          <div className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-bitcoin" />
              <h3 className="font-heading font-semibold text-white text-sm">Step 1: Connect Wallet</h3>
              {walletAddress && <CheckCircle size={14} className="text-emerald-400 ml-auto" />}
            </div>

            <div className="relative">
              <input
                type={showPk ? 'text' : 'password'}
                placeholder="Paste private key (0x...)"
                value={pk}
                onChange={e => setPk(e.target.value)}
                className="w-full bg-void border border-slate-800/50 rounded-xl px-4 py-3 pr-20 text-sm font-mono text-white placeholder-slate-700 focus:outline-none focus:border-bitcoin/50 transition-colors"
              />
              <button onClick={() => setShowPk(!showPk)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer">
                {showPk ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {walletAddress && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <span className="text-slate-500">Address: <span className="text-white">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span></span>
                {nativeBalance && (
                  <span className="text-slate-500">Balance: <span className="text-emerald-400">{parseFloat(nativeBalance).toFixed(6)} {CHAIN_NATIVE[srcChain]}</span></span>
                )}
              </div>
            )}

            {!walletAddress && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConnectWallet}
                className="w-full py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 font-heading font-semibold text-sm hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Wallet size={16} />
                Connect Wallet
              </motion.button>
            )}
          </div>

          {/* Bridge Config */}
          {phase !== PHASE.IDLE && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <ArrowRight size={16} className="text-bitcoin" />
                <h3 className="font-heading font-semibold text-white text-sm">Step 2: Configure Bridge</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">From</label>
                  <select value={srcChain} onChange={e => setSrcChain(e.target.value)} className="w-full bg-void border border-slate-800/50 rounded-lg px-3 py-2.5 text-sm font-heading text-white focus:outline-none cursor-pointer">
                    {CHAINS.filter(c => c !== dstChain).map(c => <option key={c} value={c}>{CHAIN_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">To</label>
                  <select value={dstChain} onChange={e => setDstChain(e.target.value)} className="w-full bg-void border border-slate-800/50 rounded-lg px-3 py-2.5 text-sm font-heading text-white focus:outline-none cursor-pointer">
                    {CHAINS.filter(c => c !== srcChain).map(c => <option key={c} value={c}>{CHAIN_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-void border border-slate-800/50 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-bitcoin/50 transition-colors"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleFetchIntent}
                disabled={phase === PHASE.FETCHING_INTENT}
                className="glow-btn-orange w-full py-3.5 rounded-xl text-white font-heading font-semibold text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {phase === PHASE.FETCHING_INTENT ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {phase === PHASE.FETCHING_INTENT ? 'Calling /intent...' : 'Execute as Agent'}
              </motion.button>
            </motion.div>
          )}

          {/* Transaction Queue */}
          {intentResult && phase !== PHASE.FETCHING_INTENT && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-bitcoin" />
                <h3 className="font-heading font-semibold text-white text-sm">Step 3: Sign Transactions</h3>
              </div>

              <div className="space-y-3">
                {intentResult.transactions.map((tx, i) => {
                  const done = i < currentTxIndex || phase === PHASE.TRACKING || phase === PHASE.COMPLETE;
                  const active = i === currentTxIndex && (phase === PHASE.INTENT_READY || phase === PHASE.SIGNING);
                  const signing = i === currentTxIndex && phase === PHASE.SIGNING;

                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                        done ? 'bg-emerald-950/10 border-emerald-800/30' :
                        active ? 'bg-bitcoin/5 border-bitcoin/30' :
                        'bg-void border-slate-800/30 opacity-50'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold ${
                        done ? 'bg-emerald-400/20 text-emerald-400' :
                        active ? 'bg-bitcoin/20 text-bitcoin' :
                        'bg-slate-800/50 text-slate-600'
                      }`}>
                        {done ? <CheckCircle size={14} /> : signing ? <Loader2 size={14} className="animate-spin" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-heading text-white capitalize">{tx.type}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{tx.description}</p>
                        {txHashes[i] && (
                          <p className="text-[10px] font-mono text-emerald-400/80 mt-1 truncate">tx: {txHashes[i]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {phase === PHASE.INTENT_READY && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSignNext}
                  className="w-full py-3 rounded-xl bg-emerald-600/20 border border-emerald-800/30 text-emerald-400 font-heading font-semibold text-sm hover:bg-emerald-600/30 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  Sign tx[{currentTxIndex}]: {intentResult.transactions[currentTxIndex].type}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Status Tracker */}
          {txStatus && (phase === PHASE.TRACKING || phase === PHASE.COMPLETE) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <TransactionFeedback status={txStatus.status} txHash={txStatus.txHash} srcChain={txStatus.srcChain} />
            </motion.div>
          )}

          {/* Error */}
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

        {/* Agent Log Panel */}
        <div className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm overflow-hidden h-fit sticky top-20">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-slate-500">Agent Runtime Log</span>
          </div>
          <div className="p-4 h-96 overflow-y-auto no-scrollbar">
            {logs.length === 0 && (
              <p className="text-xs font-mono text-slate-700 italic">Logs will appear here as the agent executes...</p>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="text-[11px] font-mono leading-relaxed mb-1">
                <span className="text-slate-600">[{entry.time}]</span>{' '}
                <span className="text-slate-400">{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

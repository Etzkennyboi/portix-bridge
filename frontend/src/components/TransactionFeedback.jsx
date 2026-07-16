import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, AlertTriangle, ArrowUpRight, RefreshCcw } from 'lucide-react';

const STEPS = ['PENDING', 'INFLIGHT', 'DELIVERED'];

const statusConfig = {
  PENDING: {
    color: 'text-amber-400',
    bg: 'bg-amber-400',
    icon: <Loader2 size={16} className="animate-spin text-amber-400" />,
    label: 'Pending',
  },
  INFLIGHT: {
    color: 'text-bitcoin',
    bg: 'bg-bitcoin',
    icon: <Loader2 size={16} className="animate-spin text-bitcoin" />,
    label: 'In Flight',
  },
  DELIVERED: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400',
    icon: <CheckCircle size={16} className="text-emerald-400" />,
    label: 'Delivered',
  },
  FAILED: {
    color: 'text-red-400',
    bg: 'bg-red-400',
    icon: <AlertTriangle size={16} className="text-red-400" />,
    label: 'Failed',
  },
};

export function TransactionFeedback({ status, txHash, srcChain }) {
  if (!status || !txHash) return null;

  const cfg = statusConfig[status] || statusConfig.PENDING;
  const currentStep = STEPS.indexOf(status);
  const isFailed = status === 'FAILED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <span className={`font-heading font-semibold text-base ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <a
          href={`https://layerzeroscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-bitcoin transition-colors cursor-pointer"
        >
          LayerZero Scan <ArrowUpRight size={12} />
        </a>
      </div>

      {/* Progress Tracker */}
      {!isFailed && (
        <div className="relative flex items-center justify-between pt-2">
          {/* Background line */}
          <div className="absolute top-[11px] left-0 right-0 h-px bg-slate-800/60" />

          {/* Filled line progress */}
          <motion.div
            className="absolute top-[11px] left-0 h-px bg-bitcoin origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: currentStep === -1 ? 0 : (currentStep + 1) / STEPS.length }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />

          {STEPS.map((step, idx) => {
            const done = idx <= currentStep;
            const active = idx === currentStep;
            return (
              <div key={step} className="relative flex flex-col items-center gap-2 z-10">
                <motion.div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    done
                      ? 'border-bitcoin bg-bitcoin'
                      : 'border-slate-700 bg-darkmatter'
                  }`}
                  animate={active && status !== 'DELIVERED' ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{ repeat: active ? Infinity : 0, duration: 1.5 }}
                >
                  {done && <CheckCircle size={11} className="text-white" strokeWidth={3} />}
                </motion.div>
                <span className={`text-[10px] font-mono tracking-wide ${done ? 'text-bitcoin' : 'text-slate-600'}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-4 py-3"
        >
          <AlertTriangle size={14} />
          Bridge failed. Retry with higher fee buffer.
        </motion.div>
      )}

      {/* TxHash */}
      <div className="border-t border-slate-800/30 pt-4">
        <p className="text-[10px] text-slate-600 font-mono mb-1 uppercase tracking-widest">Src Tx Hash</p>
        <p className="text-xs font-mono text-slate-400 break-all leading-relaxed">{txHash}</p>
      </div>
    </motion.div>
  );
}

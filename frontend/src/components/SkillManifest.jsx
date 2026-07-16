import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const SKILLS = [
  {
    name: 'bridge-intent',
    method: 'POST',
    endpoint: '/api/skills/bridge/intent',
    description: 'UNIFIED ENDPOINT: Call this when the user wants to bridge. Automatically checks balances, acquires USDT0 via swap if necessary, builds the ERC20 approve tx, and builds the LayerZero bridge tx.',
    params: [
      { name: 'srcChain', type: 'string', desc: 'xlayer|ethereum|arbitrum|polygon|optimism|mantle' },
      { name: 'dstChain', type: 'string', desc: 'Same options as srcChain' },
      { name: 'token', type: 'string', desc: 'USDT0|XAUt0|CNHt0' },
      { name: 'amount', type: 'string', desc: 'Human-readable amount (e.g. "100")' },
      { name: 'recipient', type: 'string', desc: '0x address on destination chain' },
      { name: 'agentAddress', type: 'string', desc: "Agent's wallet address" },
      { name: 'refundAddress', type: 'string', desc: "Agent's wallet or user address" },
    ],
    returns: 'Array of { type, description, tx } objects to sign in order.',
  },
  {
    name: 'bridge-status',
    method: 'GET',
    endpoint: '/api/skills/bridge/status',
    description: 'Check LayerZero message delivery status. Poll every 15 seconds. Statuses: PENDING → INFLIGHT → DELIVERED | FAILED.',
    params: [
      { name: 'txHash', type: 'string', desc: 'Source chain transaction hash' },
      { name: 'srcChain', type: 'string', desc: 'Source chain key' },
    ],
    returns: '{ status, srcTxHash, dstTxHash, retryRecommended }',
  },
  {
    name: 'bridge-route',
    method: 'POST',
    endpoint: '/api/skills/bridge/route',
    description: 'Auto-select optimal bridge route based on fees, speed, and balances. Returns recommended route + alternatives.',
    params: [
      { name: 'fromChain', type: 'string', desc: 'Starting chain' },
      { name: 'toChainOptions', type: 'string[]', desc: 'Array of possible destinations' },
      { name: 'token', type: 'string', desc: 'Token to bridge' },
      { name: 'amount', type: 'string', desc: 'Amount to bridge' },
      { name: 'priority', type: 'string', desc: 'cheapest|fastest|balanced' },
    ],
    returns: '{ recommendedRoute, alternatives, savingsVsAlternative }',
  },
  {
    name: 'bridge-quote',
    method: 'GET',
    endpoint: '/api/skills/bridge/quote',
    description: 'Get a real-time fee estimate for bridging. Returns native fee, slippage-protected amounts, and transfer time estimate.',
    params: [
      { name: 'srcChain', type: 'string', desc: 'Source chain' },
      { name: 'dstChain', type: 'string', desc: 'Destination chain' },
      { name: 'token', type: 'string', desc: 'Token to bridge' },
      { name: 'amount', type: 'string', desc: 'Amount to bridge' },
      { name: 'recipient', type: 'string', desc: 'Recipient address' },
    ],
    returns: '{ nativeFee, amountOut, minAmountOut, transferTimeEstimate }',
  },
  {
    name: 'bridge-swap',
    method: 'POST',
    endpoint: '/api/skills/bridge/swap',
    description: 'Acquire USDT0 via DEX (Uniswap V3) on the source chain. Called automatically by bridge-intent when USDT0 balance is insufficient.',
    params: [
      { name: 'chain', type: 'string', desc: 'Chain to swap on' },
      { name: 'amountUsdt', type: 'string', desc: 'Amount of USDT0 to acquire' },
      { name: 'agentAddress', type: 'string', desc: "Agent's wallet address" },
    ],
    returns: '{ transaction: { to, data, value, chainId } }',
  },
];

function SkillCard({ skill }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-800/30 bg-darkmatter/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
            skill.method === 'GET' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'
          }`}>
            {skill.method}
          </span>
          <span className="font-heading font-semibold text-sm text-white">{skill.name}</span>
          <span className="text-xs font-mono text-slate-600 hidden md:inline">{skill.endpoint}</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-slate-800/30 px-5 py-4 space-y-4"
        >
          <p className="text-sm text-slate-400 leading-relaxed">{skill.description}</p>

          <div>
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Parameters</p>
            <div className="space-y-1.5">
              {skill.params.map(p => (
                <div key={p.name} className="flex items-baseline gap-2 text-xs">
                  <code className="font-mono text-bitcoin">{p.name}</code>
                  <span className="font-mono text-slate-700">{p.type}</span>
                  <span className="text-slate-500">— {p.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">Returns</p>
            <p className="text-xs font-mono text-slate-400">{skill.returns}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function SkillManifest() {
  return (
    <section id="skill-manifest" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <p className="text-[11px] font-mono text-bitcoin uppercase tracking-widest mb-3">Agent Skill Manifest</p>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white">
          SKILL.md Reference
        </h2>
        <p className="text-sm text-slate-500 mt-3 max-w-lg mx-auto">
          This is what an AI agent reads to understand how to use Portix AI.
          Every endpoint, every parameter, every return type.
        </p>
      </div>

      {/* Agent Pattern */}
      <div className="rounded-2xl border border-bitcoin/20 bg-bitcoin/5 p-6 mb-8">
        <h3 className="font-heading font-semibold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-bitcoin" />
          Mandatory Agent Pattern: Unified Bridge Execution
        </h3>
        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
          <li>Call <code className="text-bitcoin font-mono text-xs">bridge-intent</code> with amount, chains, and wallet address.</li>
          <li>Inspect returned <code className="text-bitcoin font-mono text-xs">transactions[]</code> array.</li>
          <li>For each transaction: call <code className="text-bitcoin font-mono text-xs">runtime.callContractSign(tx.tx)</code>.</li>
          <li>Wait for on-chain confirmation before signing the next transaction.</li>
          <li>After all transactions confirm, poll <code className="text-bitcoin font-mono text-xs">bridge-status</code> every 15s until DELIVERED.</li>
        </ol>
      </div>

      {/* Skills List */}
      <div className="space-y-3">
        {SKILLS.map(skill => (
          <SkillCard key={skill.name} skill={skill} />
        ))}
      </div>
    </section>
  );
}

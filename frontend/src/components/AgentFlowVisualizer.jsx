import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Send, Activity, ArrowRight, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    id: 'discover',
    icon: <FileText size={20} />,
    title: 'Discover',
    subtitle: 'Agent reads SKILL.md',
    detail: 'GET /SKILL.md',
    description: 'The AI agent fetches the skill manifest to learn what endpoints are available, what parameters they need, and the correct execution flow.',
    code: `// Agent discovers Portix AI
const manifest = await fetch(
  "https://xlayer-bridge-skills.vercel.app/SKILL.md"
);
// Parses: endpoints, params, execution patterns`,
  },
  {
    id: 'intent',
    icon: <Send size={20} />,
    title: 'Request Intent',
    subtitle: 'POST /api/skills/bridge/intent',
    detail: 'Single unified call',
    description: 'The agent calls the intent endpoint with the bridge parameters. Portix AI checks balances, plans any necessary swaps, and returns an ordered array of transactions to sign.',
    code: `// Agent calls the unified intent endpoint
const res = await fetch("/api/skills/bridge/intent", {
  method: "POST",
  body: JSON.stringify({
    srcChain: "xlayer",
    dstChain: "arbitrum",
    token: "USDT0",
    amount: "10",
    recipient: "0x7720...F610",
    agentAddress: "0x7720...F610",
    refundAddress: "0x7720...F610"
  })
});
// Returns: { status: "READY", transactions: [...] }`,
  },
  {
    id: 'sign',
    icon: <CheckCircle size={20} />,
    title: 'Sign & Broadcast',
    subtitle: 'Agent signs each tx in order',
    detail: 'ethers.Wallet.sendTransaction()',
    description: 'The agent iterates through the returned transactions array. Each tx object contains to, data, value, gasLimit — ready to sign. The agent signs and waits for confirmation before moving to the next.',
    code: `// Agent signs each transaction in order
for (const step of res.transactions) {
  // step.tx = { to, data, value, gasLimit, chainId }
  const tx = await wallet.sendTransaction(step.tx);
  const receipt = await tx.wait(1);
  console.log(step.type, "confirmed:", receipt.transactionHash);
}`,
  },
  {
    id: 'track',
    icon: <Activity size={20} />,
    title: 'Track Delivery',
    subtitle: 'GET /api/skills/bridge/status',
    detail: 'Poll every 15s → DELIVERED',
    description: 'After the bridge send transaction is confirmed on-chain, the agent polls the status endpoint until LayerZero delivers the tokens on the destination chain.',
    code: `// Agent polls for cross-chain delivery
let status = "PENDING";
while (status !== "DELIVERED") {
  await new Promise(r => setTimeout(r, 15000));
  const res = await fetch(
    \`/api/skills/bridge/status?txHash=\${txHash}&srcChain=xlayer\`
  );
  const data = await res.json();
  status = data.status;
  // PENDING → INFLIGHT → DELIVERED
}`,
  },
];

export function AgentFlowVisualizer() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="agent-flow" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <p className="text-[11px] font-mono text-bitcoin uppercase tracking-widest mb-3">How AI Agents Use Portix</p>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white">
          Four Steps to Cross-Chain Bridge
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Step List */}
        <div className="flex flex-col gap-2">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(i)}
              className={`group w-full text-left px-4 py-4 rounded-xl border transition-all cursor-pointer ${
                activeStep === i
                  ? 'bg-darkmatter border-bitcoin/40 shadow-glow'
                  : 'bg-darkmatter/30 border-slate-800/30 hover:border-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  activeStep === i ? 'bg-bitcoin/15 text-bitcoin' : 'bg-slate-800/50 text-slate-500'
                }`}>
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${activeStep === i ? 'text-bitcoin' : 'text-slate-600'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`font-heading font-semibold text-sm ${activeStep === i ? 'text-white' : 'text-slate-400'}`}>
                      {step.title}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-600 mt-0.5 truncate">{step.subtitle}</p>
                </div>
                {i < STEPS.length - 1 && activeStep === i && (
                  <ArrowRight size={12} className="ml-auto text-bitcoin flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="rounded-2xl border border-slate-800/40 bg-darkmatter/70 backdrop-blur-sm p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-bitcoin/15 text-bitcoin flex items-center justify-center">
              {STEPS[activeStep].icon}
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg text-white">{STEPS[activeStep].title}</h3>
              <p className="text-xs font-mono text-bitcoin">{STEPS[activeStep].detail}</p>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            {STEPS[activeStep].description}
          </p>

          <div className="rounded-xl bg-void border border-slate-800/30 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/30">
              <span className="w-2 h-2 rounded-full bg-red-500/60" />
              <span className="w-2 h-2 rounded-full bg-amber-500/60" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
              <span className="text-[10px] font-mono text-slate-600 ml-2">agent.js</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto">
              <code>{STEPS[activeStep].code}</code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

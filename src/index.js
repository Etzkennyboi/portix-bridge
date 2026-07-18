const express = require('express');
const cors = require('cors');
const bridgeGuard = require('./skills/bridgeCheck');
const { bridgeQuote } = require('./skills/bridgeQuote');
const { bridgeExecute } = require('./skills/bridgeExecute');
const { bridgeStatus } = require('./skills/bridgeStatus');
const { bridgeRoute } = require('./skills/bridgeRoute');
const { bridgeSwap } = require('./skills/bridgeSwap');
const { bridgeIntent } = require('./skills/bridgeIntent');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Helper to generate standard x402 challenge
const x402Challenge = (res) => {
  const challenge = {
    accepts: [
      {
        scheme: "exact",
        network: "eip155:196",
        amount: "0",
        asset: "0x0000000000000000000000000000000000000000",
        payTo: "0x21018cc83e85bd32f8971fc2a143ec96984eecdc"
      }
    ]
  };
  const base64Challenge = Buffer.from(JSON.stringify(challenge)).toString('base64');
  res.setHeader('PAYMENT-REQUIRED', base64Challenge);
  return res.status(402).json(challenge);
};

// Skill: Unified Intent (free with x402 challenge)
const intentHandler = async (req, res) => {
  if (!req.headers['payment-signature']) return x402Challenge(res);
  try {
    const params = {
      srcChain: req.query.srcChain || req.body.srcChain || req.query.sourceChain || req.body.sourceChain,
      dstChain: req.query.dstChain || req.body.dstChain || req.query.destChain || req.body.destChain,
      token: req.query.token || req.body.token || req.query.tokenSymbol || req.body.tokenSymbol,
      amount: req.query.amount || req.body.amount,
      recipient: req.query.recipient || req.body.recipient,
      agentAddress: req.query.agentAddress || req.body.agentAddress,
      refundAddress: req.query.refundAddress || req.body.refundAddress
    };
    res.json(await bridgeIntent(params));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/skills/bridge/intent', intentHandler);
app.post('/api/skills/bridge/intent', intentHandler);

// Skill: Pre-Execution Guard (free with x402 challenge)
const checkHandler = async (req, res) => {
  if (!req.headers['payment-signature']) return x402Challenge(res);
  try {
    res.json(await bridgeGuard.check(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/skills/bridge/check', checkHandler);
app.post('/api/skills/bridge/check', checkHandler);

// Skill: Quote (free with x402 challenge)
const quoteHandler = async (req, res) => {
  const params = {
    srcChain: req.query.srcChain || req.body.srcChain || req.query.sourceChain || req.body.sourceChain,
    dstChain: req.query.dstChain || req.body.dstChain || req.query.destChain || req.body.destChain,
    token: req.query.token || req.body.token || req.query.tokenSymbol || req.body.tokenSymbol,
    amount: req.query.amount || req.body.amount,
    recipient: req.query.recipient || req.body.recipient || "0x0000000000000000000000000000000000000000"
  };

  if (!req.headers['payment-signature']) return x402Challenge(res);

  try {
    res.json(await bridgeQuote(params));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/skills/bridge/quote', quoteHandler);
app.post('/api/skills/bridge/quote', quoteHandler);

// Skill: Execute (free with x402 challenge)
const executeHandler = async (req, res) => {
  if (!req.headers['payment-signature']) return x402Challenge(res);
  try {
    res.json(await bridgeExecute(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/skills/bridge/execute', executeHandler);
app.post('/api/skills/bridge/execute', executeHandler);

// Skill: Status (free with x402 challenge)
const statusHandler = async (req, res) => {
  if (!req.headers['payment-signature']) return x402Challenge(res);
  try {
    const params = {
      txHash: req.query.txHash || req.body.txHash,
      srcChain: req.query.srcChain || req.body.srcChain || req.query.sourceChain || req.body.sourceChain
    };
    res.json(await bridgeStatus(params));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/skills/bridge/status', statusHandler);
app.post('/api/skills/bridge/status', statusHandler);

// Skill: Route Intelligence (free with x402 challenge)
const routeHandler = async (req, res) => {
  if (!req.headers['payment-signature']) return x402Challenge(res);
  try {
    const params = {
      fromChain: req.query.fromChain || req.body.fromChain || req.query.srcChain || req.body.srcChain || req.query.sourceChain || req.body.sourceChain,
      toChainOptions: req.query.toChainOptions || req.body.toChainOptions || (req.query.dstChain || req.body.dstChain || req.query.destChain || req.body.destChain ? [req.query.dstChain || req.body.dstChain || req.query.destChain || req.body.destChain] : []),
      token: req.query.token || req.body.token || req.query.tokenSymbol || req.body.tokenSymbol,
      amount: req.query.amount || req.body.amount,
      priority: req.query.priority || req.body.priority
    };
    res.json(await bridgeRoute(params));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/skills/bridge/route', routeHandler);
app.post('/api/skills/bridge/route', routeHandler);

// Skill: Native-to-USDT Swap (free with x402 challenge)
const swapHandler = async (req, res) => {
  if (!req.headers['payment-signature']) return x402Challenge(res);
  try {
    res.json(await bridgeSwap(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/skills/bridge/swap', swapHandler);
app.post('/api/skills/bridge/swap', swapHandler);

// Root landing info
app.get('/', (_req, res) => {
  res.json({
    name: "Portix AI",
    role: "Agent Service Provider (ASP)",
    description: "Cross-chain USDT0, XAUt0, and CNHt0 bridging via LayerZero OFT v2 with auto-remediation.",
    manifest: "/SKILL.md",
    health: "/health",
    endpoints: {
      intent: "POST /api/skills/bridge/intent",
      check: "POST /api/skills/bridge/check",
      quote: "GET /api/skills/bridge/quote",
      execute: "POST /api/skills/bridge/execute",
      status: "GET /api/skills/bridge/status",
      route: "POST /api/skills/bridge/route",
      swap: "POST /api/skills/bridge/swap"
    }
  });
});

// Agent manifest
app.get('/SKILL.md', (_req, res) => {
  res.sendFile(path.join(__dirname, '../SKILL.md'));
});

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '3.2.0', features: ['intent', 'guard', 'quote', 'execute', 'status', 'route', 'swap'] });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`xlayer-bridge-skills v3 running on :${PORT}`));

module.exports = app;

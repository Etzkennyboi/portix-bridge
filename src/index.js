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

// UNIFIED INTENT (THE FIX)
app.post('/api/skills/bridge/intent', async (req, res) => {
  try {
    res.json(await bridgeIntent(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Skill 0: Pre-Execution Guard (NEW - ALWAYS CALL FIRST)
app.post('/api/skills/bridge/check', async (req, res) => {
  try {
    res.json(await bridgeGuard.check(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Skill 1: Quote (free)
app.get('/api/skills/bridge/quote', async (req, res) => {
  try {
    res.json(await bridgeQuote(req.query));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Skill 2: Execute
app.post('/api/skills/bridge/execute', async (req, res) => {
  try {
    res.json(await bridgeExecute(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Skill 3: Status (free)
app.get('/api/skills/bridge/status', async (req, res) => {
  try {
    res.json(await bridgeStatus(req.query));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Skill 4: Route Intelligence (NEW)
app.post('/api/skills/bridge/route', async (req, res) => {
  try {
    res.json(await bridgeRoute(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Skill 5: Native-to-USDT Swap (NEW - for remediation)
app.post('/api/skills/bridge/swap', async (req, res) => {
  try {
    res.json(await bridgeSwap(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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

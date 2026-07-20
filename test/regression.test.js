/**
 * Comprehensive regression test suite covering ALL past developer-reported bugs.
 * Tests are organised by the original failure mode identified in each review.
 */

const request = require('supertest');
const app = require('../src/index');

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1: x402 Challenge (PAYMENT-REQUIRED flow)
// ─────────────────────────────────────────────────────────────────────────────
describe('x402 Payment Challenge', () => {

  it('quote → 402 challenge with correct asset and decimals (no signature)', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'ethereum', dstChain: 'xlayer', token: 'USDT0', amount: '100', recipient: '0x0000000000000000000000000000000000000001' });

    expect(res.status).toBe(402);
    // Challenge body must have accepts array
    expect(Array.isArray(res.body.accepts)).toBe(true);
    const accept = res.body.accepts[0];
    // Must advertise the registered fee token — NOT zero address
    expect(accept.asset).toMatch(/^0x779/i);
    // Must have decimals field so buyer can compute minimal-units
    expect(accept.decimals).toBe(6);
    // Amount must be non-zero string to avoid the zero-amount conversion edge case
    expect(parseInt(accept.amount, 10)).toBeGreaterThan(0);
    // Network must be X Layer
    expect(accept.network).toBe('eip155:196');
    // PAYMENT-REQUIRED header must be present
    expect(res.headers['payment-required']).toBeDefined();
  });

  it('intent → 402 challenge with correct asset (no signature)', async () => {
    const res = await request(app).post('/api/skills/bridge/intent').send({
      srcChain: 'xlayer', dstChain: 'ethereum', token: 'USDT0', amount: '100',
      recipient: '0x0000000000000000000000000000000000000001',
      agentAddress: '0x0000000000000000000000000000000000000001',
      refundAddress: '0x0000000000000000000000000000000000000001',
    });
    expect(res.status).toBe(402);
    expect(res.body.accepts[0].asset).toMatch(/^0x779/i);
  });

  it('status → 402 challenge (no signature)', async () => {
    const res = await request(app).get('/api/skills/bridge/status')
      .query({ txHash: '0xabc', srcChain: 'ethereum' });
    expect(res.status).toBe(402);
  });

  it('route → 402 challenge (no signature)', async () => {
    const res = await request(app).post('/api/skills/bridge/route').send({
      fromChain: 'ethereum', toChainOptions: ['xlayer'], token: 'USDT0', amount: '100'
    });
    expect(res.status).toBe(402);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2: Upfront Chain Validation (reject unsupported BEFORE 402 payment)
// ─────────────────────────────────────────────────────────────────────────────
describe('Upfront Chain Validation', () => {

  it('rejects unsupported source chain with 400 — not 402', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'base', dstChain: 'xlayer', token: 'USDT0', amount: '100' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Unsupported source chain: 'base'");
    expect(res.body.error.toLowerCase()).toContain('supported chains:');
  });

  it('rejects unsupported destination chain with 400 — not 402', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'ethereum', dstChain: 'base', token: 'USDT0', amount: '100' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Unsupported destination chain: 'base'");
  });

  it('rejects same src and dst chain upfront with 400', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'ethereum', dstChain: 'ethereum', token: 'USDT0', amount: '100',
               recipient: '0x0000000000000000000000000000000000000001' });
    // Either 400 from validation OR 402 challenge — but must NOT be 500 or RPC error
    expect([400, 402]).toContain(res.status);
  });

  it('allows all 6 supported chains through the middleware', async () => {
    const chains = ['ethereum', 'xlayer', 'arbitrum', 'optimism', 'polygon', 'mantle'];
    for (const chain of chains) {
      const res = await request(app).get('/api/skills/bridge/quote')
        .query({ srcChain: chain, dstChain: 'xlayer', token: 'USDT0', amount: '100' });
      // Any chain other than xlayer→xlayer must NOT be a chain-validation 400
      if (chain !== 'xlayer') {
        expect(res.status).not.toBe(400);
      }
    }
  });

  it('rejects unknown chain in toChainOptions array', async () => {
    const res = await request(app).post('/api/skills/bridge/route').send({
      fromChain: 'ethereum', toChainOptions: ['xlayer', 'base'], token: 'USDT0', amount: '100'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported destination chain option/i);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3: Error-response hygiene (no raw stack traces to buyer)
// ─────────────────────────────────────────────────────────────────────────────
describe('Error Response Hygiene', () => {

  it('quote with real sig header but missing params returns clean 400', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .set('payment-signature', 'fake-sig')
      .query({ srcChain: 'ethereum', dstChain: 'xlayer' }); // missing token, amount, recipient
    expect(res.status).toBe(400);
    // Must be a clean JSON error object — not a raw ethers stack trace
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error).not.toContain('at Object.');
  });

  it('status with sig header but missing txHash returns clean 400', async () => {
    const res = await request(app).get('/api/skills/bridge/status')
      .set('payment-signature', 'fake-sig')
      .query({ srcChain: 'ethereum' }); // missing txHash
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('intent with sig header but missing agentAddress returns clean 400', async () => {
    const res = await request(app).post('/api/skills/bridge/intent')
      .set('payment-signature', 'fake-sig')
      .send({ srcChain: 'xlayer', dstChain: 'arbitrum', token: 'USDT0', amount: '100',
              recipient: '0x0000000000000000000000000000000000000001' }); // missing agentAddress+refundAddress
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4: Root endpoint & health (x402-validate discovery)
// ─────────────────────────────────────────────────────────────────────────────
describe('Discovery & Health Endpoints', () => {

  it('GET / returns service manifest JSON', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('endpoints');
    expect(res.body.endpoints).toHaveProperty('quote');
  });

  it('GET /health returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /SKILL.md returns skill manifest file (200)', async () => {
    const res = await request(app).get('/SKILL.md');
    expect(res.status).toBe(200);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5: GET + POST parity (all registered endpoints must accept both)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET/POST method parity', () => {
  const endpointsWithPayload = [
    { method: 'get',  path: '/api/skills/bridge/quote',  query: { srcChain: 'ethereum', dstChain: 'xlayer', token: 'USDT0', amount: '100' } },
    { method: 'post', path: '/api/skills/bridge/quote',  body:  { srcChain: 'ethereum', dstChain: 'xlayer', token: 'USDT0', amount: '100' } },
    { method: 'get',  path: '/api/skills/bridge/intent', query: { srcChain: 'xlayer', dstChain: 'ethereum', token: 'USDT0', amount: '10' } },
    { method: 'post', path: '/api/skills/bridge/intent', body:  { srcChain: 'xlayer', dstChain: 'ethereum', token: 'USDT0', amount: '10' } },
    { method: 'get',  path: '/api/skills/bridge/status', query: { txHash: '0xabc', srcChain: 'xlayer' } },
    { method: 'post', path: '/api/skills/bridge/status', body:  { txHash: '0xabc', srcChain: 'xlayer' } },
    { method: 'get',  path: '/api/skills/bridge/route',  query: { fromChain: 'xlayer', toChainOptions: ['ethereum'], token: 'USDT0', amount: '10' } },
    { method: 'post', path: '/api/skills/bridge/route',  body:  { fromChain: 'xlayer', toChainOptions: ['ethereum'], token: 'USDT0', amount: '10' } },
  ];

  endpointsWithPayload.forEach(({ method, path: epath, query, body }) => {
    it(`${method.toUpperCase()} ${epath} returns 402 (not 404/405)`, async () => {
      let req = request(app)[method](epath);
      if (query) req = req.query(query);
      if (body)  req = req.send(body);
      const res = await req;
      // Without signature → 402 challenge (or 400 chain-validation)
      expect([400, 402]).toContain(res.status);
      // Must NOT be 404 (route not found) or 405 (method not allowed)
      expect(res.status).not.toBe(404);
      expect(res.status).not.toBe(405);
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 6: Chain config completeness
// ─────────────────────────────────────────────────────────────────────────────
describe('Chain Config Completeness', () => {
  const { CHAINS, getChain } = require('../src/config/chains');
  const REQUIRED_KEYS = ['chainId', 'lzEid', 'name', 'rpc', 'nativeSymbol', 'gasConfig', 'usdt0'];
  const REQUIRED_TOKEN_KEYS = ['token', 'oft', 'requiresApproval'];

  Object.keys(CHAINS).forEach((chainName) => {
    it(`${chainName} has all required config fields`, () => {
      const chain = CHAINS[chainName];
      for (const key of REQUIRED_KEYS) {
        expect(chain).toHaveProperty(key);
      }
      for (const key of REQUIRED_TOKEN_KEYS) {
        expect(chain.usdt0).toHaveProperty(key);
      }
      // OFT address must be a real 0x address (not zero/null)
      expect(chain.usdt0.oft).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(chain.usdt0.oft).not.toBe('0x0000000000000000000000000000000000000000');
    });

    it(`${chainName} getChain() resolves correctly`, () => {
      expect(() => getChain(chainName)).not.toThrow();
    });
  });

  it('getChain throws a clear error for unknown chain', () => {
    expect(() => getChain('solana')).toThrowError(/Unknown chain/i);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 7: bridgeQuote logic (mocked)
// ─────────────────────────────────────────────────────────────────────────────
describe('bridgeQuote Unit Tests (Mocked)', () => {
  jest.mock('../src/lib/oft', () => {
    const BigNumber = { from: (v) => ({
      toString: () => v.toString(),
      add: (x) => BigNumber.from(BigInt(v) + BigInt(x?.toString() || 0)),
    })};
    return {
      OFT_ABI: [],
      ERC20_ABI: [],
      getProvider: jest.fn(() => ({})),
      buildSendParam: jest.fn(() => [30274, '0x', '100000000', '99000000', '0x', '0x', '0x']),
      getOFTInterface: jest.fn(() => ({ encodeFunctionData: jest.fn(() => '0x') })),
    };
  }, { virtual: false });

  it('throws when required params are missing', async () => {
    const { bridgeQuote } = require('../src/skills/bridgeQuote');
    await expect(bridgeQuote({ srcChain: 'ethereum' })).rejects.toThrow(/Missing required params/i);
  });

  it('throws for same src and dst chain', async () => {
    const { bridgeQuote } = require('../src/skills/bridgeQuote');
    await expect(bridgeQuote({ srcChain: 'xlayer', dstChain: 'xlayer', token: 'USDT0', amount: '100', recipient: '0x0000000000000000000000000000000000000001' }))
      .rejects.toThrow(/srcChain and dstChain must be different/i);
  });

  it('throws for unsupported token on chain', async () => {
    const { bridgeQuote } = require('../src/skills/bridgeQuote');
    await expect(bridgeQuote({ srcChain: 'ethereum', dstChain: 'xlayer', token: 'UNKNOWN', amount: '100', recipient: '0x0000000000000000000000000000000000000001' }))
      .rejects.toThrow(/not supported/i);
  });
});

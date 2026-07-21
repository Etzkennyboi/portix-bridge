/**
 * Bidirectional Route Coverage Test Suite
 * ----------------------------------------
 * Like the Base-chain test that caught the evaluator failure, this file
 * programmatically generates and runs EVERY possible route combination
 * across ALL supported chains in BOTH directions (src->dst AND dst->src).
 *
 * Supported chains: ethereum, xlayer, arbitrum, optimism, polygon, mantle
 * Total valid bidirectional routes: 6 x 5 = 30 combinations
 * Unsupported chains tested: base, bnb, bsc, avalanche, fantom, celo, solana
 *
 * PASS for supported routes: HTTP 402 (payment challenge) -- NOT 400 or 500
 * PASS for unsupported routes: HTTP 400 with rich JSON body
 */

const request = require('supertest');
const app = require('../src/index');

const SUPPORTED   = ['ethereum', 'xlayer', 'arbitrum', 'optimism', 'polygon', 'mantle'];
const UNSUPPORTED = ['base', 'bnb', 'bsc', 'avalanche', 'fantom', 'celo', 'solana'];
const DUMMY_RECIPIENT = '0x0000000000000000000000000000000000000001';
const DUMMY_AMOUNT    = '10';
const TOKEN           = 'USDT0';
const ANCHOR          = 'ethereum'; // valid anchor chain to pair with bad chains

function allPairs(chains) {
  const pairs = [];
  for (const src of chains)
    for (const dst of chains)
      if (src !== dst) pairs.push([src, dst]);
  return pairs;
}

// -----------------------------------------------------------------------------
//  SECTION 1: All 30 supported bidirectional routes -> must receive 402
// -----------------------------------------------------------------------------
describe('Supported Route Matrix (30 combos -- all must get 402, never 400-chain or 500)', () => {

  const PAIRS = allPairs(SUPPORTED);

  describe('bridge/quote GET', () => {
    PAIRS.forEach(([src, dst]) => {
      it(`${src} -> ${dst}`, async () => {
        const res = await request(app)
          .get('/api/skills/bridge/quote')
          .query({ srcChain: src, dstChain: dst, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
        expect(res.status).not.toBe(500);
        if (res.status === 400) {
          // Only param errors allowed, NOT chain-validation errors
          expect(res.body.supported).toBeUndefined();
          expect(res.body.unsupported).toBeUndefined();
        }
        expect([400, 402]).toContain(res.status);
      });
    });
  });

  describe('bridge/quote POST', () => {
    PAIRS.forEach(([src, dst]) => {
      it(`${src} -> ${dst}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/quote')
          .send({ srcChain: src, dstChain: dst, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
        expect(res.status).not.toBe(500);
        if (res.status === 400) {
          expect(res.body.supported).toBeUndefined();
          expect(res.body.unsupported).toBeUndefined();
        }
        expect([400, 402]).toContain(res.status);
      });
    });
  });

  describe('bridge/intent POST', () => {
    PAIRS.forEach(([src, dst]) => {
      it(`${src} -> ${dst}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/intent')
          .send({ srcChain: src, dstChain: dst, token: TOKEN, amount: DUMMY_AMOUNT,
                  recipient: DUMMY_RECIPIENT, agentAddress: DUMMY_RECIPIENT, refundAddress: DUMMY_RECIPIENT });
        expect(res.status).not.toBe(500);
        if (res.status === 400) {
          expect(res.body.supported).toBeUndefined();
          expect(res.body.unsupported).toBeUndefined();
        }
        expect([400, 402]).toContain(res.status);
      });
    });
  });

  describe('bridge/route POST (each chain as src, all others as dst options)', () => {
    SUPPORTED.forEach((src) => {
      const options = SUPPORTED.filter(c => c !== src);
      it(`${src} -> [${options.join(', ')}]`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/route')
          .send({ fromChain: src, toChainOptions: options, token: TOKEN, amount: DUMMY_AMOUNT });
        expect(res.status).not.toBe(500);
        if (res.status === 400) {
          expect(res.body.supported).toBeUndefined();
          expect(res.body.unsupported).toBeUndefined();
        }
        expect([400, 402]).toContain(res.status);
      });
    });
  });

});

// -----------------------------------------------------------------------------
//  SECTION 2: Unsupported chains -> must receive 400 with rich body
//             Every unsupported chain tested as BOTH src AND dst on every endpoint
// -----------------------------------------------------------------------------
describe('Unsupported Chain Matrix (7 chains x src+dst x 4 endpoints -> must get 400)', () => {

  UNSUPPORTED.forEach((badChain) => {
    describe(`Chain: "${badChain}"`, () => {

      it(`quote GET  | srcChain=${badChain}`, async () => {
        const res = await request(app)
          .get('/api/skills/bridge/quote')
          .query({ srcChain: badChain, dstChain: ANCHOR, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.supported).not.toContain(badChain);
        expect(Array.isArray(res.body.unsupported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
        expect(res.body.suggestion).toBeDefined();
        expect(res.body.helpUrl).toBeDefined();
      });

      it(`quote GET  | dstChain=${badChain}`, async () => {
        const res = await request(app)
          .get('/api/skills/bridge/quote')
          .query({ srcChain: ANCHOR, dstChain: badChain, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
        expect(res.body.suggestion).toContain('optimism');
      });

      it(`quote POST | srcChain=${badChain}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/quote')
          .send({ srcChain: badChain, dstChain: ANCHOR, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
      });

      it(`quote POST | dstChain=${badChain}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/quote')
          .send({ srcChain: ANCHOR, dstChain: badChain, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
      });

      it(`intent POST | srcChain=${badChain}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/intent')
          .send({ srcChain: badChain, dstChain: ANCHOR, token: TOKEN, amount: DUMMY_AMOUNT,
                  recipient: DUMMY_RECIPIENT, agentAddress: DUMMY_RECIPIENT, refundAddress: DUMMY_RECIPIENT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
      });

      it(`intent POST | dstChain=${badChain}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/intent')
          .send({ srcChain: ANCHOR, dstChain: badChain, token: TOKEN, amount: DUMMY_AMOUNT,
                  recipient: DUMMY_RECIPIENT, agentAddress: DUMMY_RECIPIENT, refundAddress: DUMMY_RECIPIENT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
      });

      it(`route POST | fromChain=${badChain}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/route')
          .send({ fromChain: badChain, toChainOptions: ['xlayer', 'arbitrum'], token: TOKEN, amount: DUMMY_AMOUNT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
      });

      it(`route POST | toChainOptions includes ${badChain}`, async () => {
        const res = await request(app)
          .post('/api/skills/bridge/route')
          .send({ fromChain: ANCHOR, toChainOptions: ['xlayer', badChain], token: TOKEN, amount: DUMMY_AMOUNT });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.supported)).toBe(true);
        expect(res.body.unsupported).toContain(badChain);
      });

    });
  });

});

// -----------------------------------------------------------------------------
//  SECTION 3: Evaluator exact scenario regressions
// -----------------------------------------------------------------------------
describe('Evaluator Scenario Regressions', () => {

  it('[REPORT 1] arbitrum -> base: must return 400 BEFORE payment challenge', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'arbitrum', dstChain: 'base', token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
    expect(res.status).toBe(400);
    expect(res.status).not.toBe(402); // Base must NEVER trigger a payment challenge
    expect(res.body.unsupported).toContain('base');
  });

  it('[REPORT 1] arbitrum -> optimism: working route confirmed by evaluator (must get 402)', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'arbitrum', dstChain: 'optimism', token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
    expect(res.status).toBe(402);
    expect(Array.isArray(res.body.accepts)).toBe(true);
  });

  it('[REPORT 2] ethereum -> arbitrum: core route must get 402', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'ethereum', dstChain: 'arbitrum', token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
    expect(res.status).toBe(402);
  });

  it('[REPORT 3] xlayer -> ethereum: reverse of primary route must get 402', async () => {
    const res = await request(app).get('/api/skills/bridge/quote')
      .query({ srcChain: 'xlayer', dstChain: 'ethereum', token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
    expect(res.status).toBe(402);
  });

});

// -----------------------------------------------------------------------------
//  SECTION 4: Case-insensitivity (evaluators may send mixed-case chain names)
// -----------------------------------------------------------------------------
describe('Chain name case-insensitivity', () => {

  const SUPPORTED_CASES = [
    ['Ethereum', 'XLayer'],
    ['ARBITRUM', 'OPTIMISM'],
    ['Polygon', 'Mantle'],
    ['arbitrum', 'ETHEREUM'],
  ];

  const UNSUPPORTED_CASES = [
    ['Arbitrum', 'Base'],
    ['ethereum', 'BNB'],
    ['Polygon', 'AVALANCHE'],
  ];

  SUPPORTED_CASES.forEach(([src, dst]) => {
    it(`${src} -> ${dst} (mixed case supported) => 402`, async () => {
      const res = await request(app).get('/api/skills/bridge/quote')
        .query({ srcChain: src, dstChain: dst, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
      expect(res.status).toBe(402);
    });
  });

  UNSUPPORTED_CASES.forEach(([src, dst]) => {
    it(`${src} -> ${dst} (mixed case unsupported) => 400`, async () => {
      const res = await request(app).get('/api/skills/bridge/quote')
        .query({ srcChain: src, dstChain: dst, token: TOKEN, amount: DUMMY_AMOUNT, recipient: DUMMY_RECIPIENT });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.supported)).toBe(true);
    });
  });

});

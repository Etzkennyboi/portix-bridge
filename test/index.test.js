const request = require('supertest');
const app = require('../src/index');

describe('Upfront Chain Validation Middleware', () => {
  it('should allow valid chains', async () => {
    // We expect a 402 challenge for a valid chain (since PAYMENT-SIGNATURE is missing)
    const res = await request(app)
      .get('/api/skills/bridge/quote')
      .query({ srcChain: 'ethereum', dstChain: 'xlayer', token: 'USDT0', amount: '100' });
    
    expect(res.status).toBe(402);
    expect(res.body).toHaveProperty('accepts');
  });

  it('should immediately reject unsupported source chain with HTTP 400', async () => {
    const res = await request(app)
      .get('/api/skills/bridge/quote')
      .query({ srcChain: 'base', dstChain: 'xlayer', token: 'USDT0', amount: '100' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Unsupported source chain: 'base'");
  });

  it('should immediately reject unsupported destination chain with HTTP 400', async () => {
    const res = await request(app)
      .get('/api/skills/bridge/quote')
      .query({ srcChain: 'ethereum', dstChain: 'base', token: 'USDT0', amount: '100' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Unsupported destination chain: 'base'");
  });
});

const bridgeGuard = require('../src/skills/bridgeCheck');
const { ethers } = require('ethers');

// Helper to create BigNumber mock
const createBigNumber = (val) => ({
    toString: () => val.toString(),
    add: (x) => createBigNumber(BigInt(val || 0) + BigInt(x?.toString() || 0)),
    sub: (x) => createBigNumber(BigInt(val || 0) - BigInt(x?.toString() || 0)),
    mul: (x) => createBigNumber(BigInt(val || 0) * BigInt(x?.toString() || 0)),
    div: (x) => createBigNumber(BigInt(val || 0) / BigInt(x?.toString() || 1)),
    lt: (x) => BigInt(val || 0) < BigInt(x?.toString() || 0),
    lte: (x) => BigInt(val || 0) <= BigInt(x?.toString() || 0),
    gt: (x) => BigInt(val || 0) > BigInt(x?.toString() || 0),
    gte: (x) => BigInt(val || 0) >= BigInt(x?.toString() || 0),
});

// Mock ethers
jest.mock('ethers', () => {
    const BigNumber = {
        from: (val) => ({
            toString: () => val.toString(),
            add: (x) => BigNumber.from(BigInt(val || 0) + BigInt(x?.toString() || 0)),
            sub: (x) => BigNumber.from(BigInt(val || 0) - BigInt(x?.toString() || 0)),
            mul: (x) => BigNumber.from(BigInt(val || 0) * BigInt(x?.toString() || 0)),
            div: (x) => BigNumber.from(BigInt(val || 0) / BigInt(x?.toString() || 1)),
            lt: (x) => BigInt(val || 0) < BigInt(x?.toString() || 0),
            lte: (x) => BigInt(val || 0) <= BigInt(x?.toString() || 0),
            gt: (x) => BigInt(val || 0) > BigInt(x?.toString() || 0),
            gte: (x) => BigInt(val || 0) >= BigInt(x?.toString() || 0),
        })
    };
    
    class MockContract {
        constructor() {
            this.balanceOf = jest.fn().mockResolvedValue(BigNumber.from('500000000'));
            this.allowance = jest.fn().mockResolvedValue(BigNumber.from('1000000000'));
            this.callStatic = {
                quoteOFT: jest.fn().mockResolvedValue([
                    {}, 
                    [], 
                    [BigNumber.from('100000000'), BigNumber.from('99000000')]
                ]),
                quoteSend: jest.fn().mockResolvedValue([BigNumber.from('1250000000000000'), '0']),
            };
        }
    }

    const mockEthers = {
        Contract: MockContract,
        BigNumber: BigNumber,
        utils: {
            parseUnits: (val, dec) => BigNumber.from(val + '0'.repeat(dec)),
            formatUnits: (val, dec) => {
                const s = val.toString();
                if (s.length <= dec) return '0.' + s.padStart(dec, '0');
                return s.slice(0, -dec) + '.' + s.slice(-dec);
            },
            formatEther: (val) => (BigInt(val.toString()) / BigInt(1e18)).toString(),
            hexZeroPad: (val, len) => val,
            Interface: jest.fn(() => ({
                encodeFunctionData: jest.fn().mockReturnValue('0x'),
            })),
        },
        constants: {
            MaxUint256: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        }
    };

    return {
        ethers: mockEthers,
        ...mockEthers
    };
});

// Mock internal modules
jest.mock('../src/lib/oft', () => {
  const BigNumber = {
    from: (val) => ({
        toString: () => val.toString(),
        add: (x) => BigNumber.from(BigInt(val || 0) + BigInt(x?.toString() || 0)),
        sub: (x) => BigNumber.from(BigInt(val || 0) - BigInt(x?.toString() || 0)),
        mul: (x) => BigNumber.from(BigInt(val || 0) * BigInt(x?.toString() || 0)),
        div: (x) => BigNumber.from(BigInt(val || 0) / BigInt(x?.toString() || 1)),
        lt: (x) => BigInt(val || 0) < BigInt(x?.toString() || 0),
        lte: (x) => BigInt(val || 0) <= BigInt(x?.toString() || 0),
        gt: (x) => BigInt(val || 0) > BigInt(x?.toString() || 0),
        gte: (x) => BigInt(val || 0) >= BigInt(x?.toString() || 0),
    })
  };
  return {
    getProvider: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(BigNumber.from('20000000000000000')),
    })),
    OFT_ABI: [],
    ERC20_ABI: [],
    getOFTInterface: jest.fn(() => ({
      encodeFunctionData: jest.fn().mockReturnValue('0x'),
    })),
    buildSendParam: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../src/lib/gasEstimator', () => ({
  estimateGasCost: jest.fn().mockResolvedValue({
    gasCostWei: '210000000000000',
    gasCostFormatted: '0.00021 OKB',
    congestionLevel: 0.1,
    recommendedBuffer: 1.1,
    bufferType: 'low',
  }),
}));

describe('BridgeGuard Fix Verification (Fully Mocked)', () => {
  const mockParams = {
    srcChain: 'xlayer',
    dstChain: 'arbitrum',
    token: 'USDT0',
    amount: '100',
    recipient: '0x1234567890123456789012345678901234567890',
    agentAddress: '0x0000000000000000000000000000000000000000'
  };

  it('should correctly handle quoteOFT indexing (BUG 1)', async () => {
    const result = await bridgeGuard.check(mockParams);
    expect(result.quote.amountOut).toBe('100000000'); // Sent
    expect(result.quote.minAmountOut).toBe('99000000'); // Received
  });
});

// Chain configuration map for xlayer-bridge-skills v3
// congestionThreshold: 0-1 normalized, matches gasEstimator.calculateCongestion() output

const CHAINS = {
  ethereum: {
    chainId: 1, lzEid: 30101, name: "Ethereum",
    rpc: process.env.ETH_RPC || 'https://cloudflare-eth.com',
    rpcFallbacks: ['https://ethereum.publicnode.com', 'https://rpc.ankr.com/eth', 'https://1rpc.io/eth'],
    nativeSymbol: 'ETH',
    gasConfig: {
      baseEstimate: 210000,
      approvalGas: 60000,
      sendGas: 200000,
      congestionThreshold: 0.7,   // 0-1 normalized; matches gasEstimator output
      lowBuffer: 1.10,
      highBuffer: 1.25,
    },
    usdt0: {
      token: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      oft: '0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee',
      requiresApproval: true,
    },
  },

  xlayer: {
    chainId: 196, lzEid: 30274, name: "X Layer",
    rpc: process.env.XLAYER_RPC || 'https://rpc.xlayer.tech',
    rpcFallbacks: ['https://xlayerrpc.okx.com'],
    nativeSymbol: 'OKB',
    gasConfig: {
      baseEstimate: 150000,
      approvalGas: 45000,
      sendGas: 200000,
      congestionThreshold: 0.6,   // 0-1 normalized
      lowBuffer: 1.10,
      highBuffer: 1.20,
    },
    usdt0: {
      token: '0x779Ded0c9e1022225f8E0630b35a9b54bE713736',
      oft: '0x94bcca6bdfd6a61817ab0e960bfede4984505554',
      requiresApproval: false,
    },
  },

  arbitrum: {
    chainId: 42161, lzEid: 30110, name: "Arbitrum One",
    rpc: process.env.ARB_RPC || 'https://arb1.arbitrum.io/rpc',
    rpcFallbacks: ['https://arbitrum.publicnode.com', 'https://rpc.ankr.com/arbitrum'],
    nativeSymbol: 'ETH',
    gasConfig: {
      baseEstimate: 1000000,
      approvalGas: 150000,
      sendGas: 1200000,
      congestionThreshold: 0.7,   // 0-1 normalized
      lowBuffer: 1.10,
      highBuffer: 1.20,
    },
    usdt0: {
      token: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      oft: '0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92',
      requiresApproval: false,
    },
  },

  optimism: {
    chainId: 10, lzEid: 30111, name: "Optimism",
    rpc: process.env.OP_RPC || 'https://mainnet.optimism.io',
    rpcFallbacks: ['https://optimism.publicnode.com', 'https://rpc.ankr.com/optimism'],
    nativeSymbol: 'ETH',
    gasConfig: {
      baseEstimate: 180000,
      approvalGas: 55000,
      sendGas: 220000,
      congestionThreshold: 0.6,   // 0-1 normalized
      lowBuffer: 1.10,
      highBuffer: 1.20,
    },
    usdt0: {
      token: '0x01bFF41798a0BcF287b996046Ca68b395DbC1071',
      oft: '0xF03b4d9AC1D5d1E7c4cEf54C2A313b9fe051A0aD',
      requiresApproval: false,
    },
  },

  polygon: {
    chainId: 137, lzEid: 30109, name: "Polygon PoS",
    rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
    rpcFallbacks: ['https://polygon.publicnode.com', 'https://rpc.ankr.com/polygon'],
    nativeSymbol: 'MATIC',
    gasConfig: {
      baseEstimate: 200000,
      approvalGas: 60000,
      sendGas: 280000,
      congestionThreshold: 0.7,   // 0-1 normalized
      lowBuffer: 1.15,
      highBuffer: 1.30,
    },
    usdt0: {
      token: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      oft: '0x6BA10300f0DC58B7a1e4c0e41f5daBb7D7829e13',
      requiresApproval: false,
    },
  },

  mantle: {
    chainId: 5000, lzEid: 30181, name: "Mantle",
    rpc: process.env.MANTLE_RPC || 'https://rpc.mantle.xyz',
    rpcFallbacks: ['https://mantle.publicnode.com'],
    nativeSymbol: 'MNT',
    gasConfig: {
      baseEstimate: 160000,
      approvalGas: 50000,
      sendGas: 210000,
      congestionThreshold: 0.6,   // 0-1 normalized
      lowBuffer: 1.10,
      highBuffer: 1.20,
    },
    usdt0: {
      token: '0x779Ded0c9e1022225f8E0630b35a9b54bE713736',
      oft: '0xcb768e263FB1C62214E7cab4AA8d036D76dc59CC',
      requiresApproval: false,
    },
  },
};

function getChain(key) {
  const chain = CHAINS[key];
  if (!chain) throw new Error(
    `Unknown chain: ${key}. Valid: ${Object.keys(CHAINS).join('|')}`
  );
  return chain;
}

module.exports = { CHAINS, getChain };

const { ethers } = require('ethers');

// Uniswap V3 SwapRouter02 Address (Generic for many chains)
const SWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

// Simplified ABI for SwapRouter02 & Quoter
const SWAP_ROUTER_ABI = [
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)'
];

const QUOTER_ABI = [
  'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)'
];

const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'; // Uniswap V3 Quoter

// Token addresses (Mainnet examples, should be configurable)
const WETH = {
  ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  arbitrum: '0x82aF49447D8a07e3bd95BD0d56f3524152e1eFb0',
  optimism: '0x4200000000000000000000000000000000000006',
  polygon:  '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
};

class UniswapService {
  /**
   * Quote the amount needed of tokenIn to get exact amountOut
   */
  async quoteAmountIn(chainKey, tokenOut, amountOut) {
    const { getChain } = require('../config/chains');
    const { getProvider } = require('./oft');
    const chain = getChain(chainKey);
    const provider = getProvider(chain.rpc, chain.chainId, chain.rpcFallbacks || []);
    
    const tokenIn = WETH[chainKey.toLowerCase()];
    if (!tokenIn) return null;

    const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);
    try {
      // fee: 3000 (0.3%)
      const amountIn = await quoter.callStatic.quoteExactOutputSingle(
        tokenIn,
        tokenOut,
        3000,
        amountOut,
        0
      );
      return amountIn;
    } catch (e) {
      console.warn(`Quote failed: ${e.message}`);
      return null;
    }
  }

  async buildSwapNativeForToken(params) {
    const { chain: chainKey, tokenOut, amountOut, agentAddress, maxAmountIn: safetyMax } = params;

    const tokenIn = WETH[chainKey.toLowerCase()];
    if (!tokenIn) throw new Error(`Native token wrapping not supported for chain ${chainKey}`);

    const amountIn = await this.quoteAmountIn(chainKey, tokenOut, amountOut);
    const finalMaxAmountIn = amountIn ? amountIn.mul(110).div(100) : safetyMax; // 10% slippage

    const iface = new ethers.utils.Interface(SWAP_ROUTER_ABI);
    
    // fee: 3000 (0.3%) for common pairs
    const fee = 3000;
    
    const swapParams = {
      tokenIn,
      tokenOut,
      fee,
      recipient: agentAddress,
      amountOut: amountOut,
      amountInMaximum: finalMaxAmountIn,
      sqrtPriceLimitX96: 0
    };

    const data = iface.encodeFunctionData('exactOutputSingle', [swapParams]);

    return {
      to: SWAP_ROUTER_ADDRESS,
      data,
      value: finalMaxAmountIn.toString(),
      description: `Swap Native for ${amountOut} units of token via Uniswap V3`
    };
  }
}

module.exports = new UniswapService();

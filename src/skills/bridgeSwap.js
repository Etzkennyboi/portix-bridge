const { ethers } = require('ethers');
const uniswap = require('../lib/uniswap');
const { getChain } = require('../config/chains');

/**
 * Skill: xlayer-bridge-swap
 * Purpose: Prepares a transaction to swap native ETH (or gas token) for USDT0
 * to facilitate a bridge operation when the user is low on the bridge token.
 */
async function bridgeSwap(params) {
  const { chain: chainKey, amountUsdt, agentAddress } = params;

  if (!chainKey || !amountUsdt || !agentAddress) {
    throw new Error('Missing required params: chain, amountUsdt, agentAddress');
  }

  const chain = getChain(chainKey);
  const tokenOut = chain.usdt0.token;
  
  // amountUsdt is human readable (e.g. "1")
  const amountUsdtWei = ethers.utils.parseUnits(amountUsdt, 6); // USDT0 is 6 decimals

  // We provide a safe fallback maximum, but UniswapService will now attempt 
  // to get a precise quote via the Quoter contract and apply a 10% slippage.
  const maxAmountIn = ethers.utils.parseUnits("0.05", 18); // Increased fallback buffer

  const tx = await uniswap.buildSwapNativeForToken({
    chain: chainKey,
    tokenOut,
    amountOut: amountUsdtWei,
    agentAddress,
    maxAmountIn
  });

  return {
    skill: 'bridge-swap',
    chain: chainKey,
    token: 'USDT0',
    amount: amountUsdt,
    transaction: {
      ...tx,
      chainId: chain.chainId
    },
    message: `Ready to swap native assets for ${amountUsdt} USDT0 on ${chain.name}. Sign this transaction to proceed.`
  };
}

module.exports = { bridgeSwap };

const { ethers } = require('ethers');
const { getProvider } = require('./oft');

// Chainlink Aggregator V3 Interface (Simplified)
const AGGREGATOR_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
];

// Chainlink Price Feed Addresses for Native/USD
const PRICE_FEEDS = {
  1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',      // ETH/USD
  196: '0xc0929281a707fc93E4528CD9A0c238b7dC791448',    // OKB/USD (X Layer)
  42161: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',  // ETH/USD (Arbitrum)
  10: '0x13e3F557331fb27caed73e4889E4c0ef2a3ab3e5',     // ETH/USD (Optimism)
  137: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',    // MATIC/USD
  5000: '0x0000000000000000000000000000000000000000',   // Mantle (Needs specific feed)
};

class GasEstimator {
  /**
   * Fetch real-time price from Chainlink Oracle
   */
  async getNativePriceUsd(chainKey) {
    const { getChain } = require('../config/chains');
    const chain = getChain(chainKey);
    const feedAddress = PRICE_FEEDS[chain.chainId];
    
    if (!feedAddress || feedAddress === '0x0000000000000000000000000000000000000000') {
      // Fallback to static if no feed or Mantle (which may use different oracle)
      const NATIVE_PRICES_USD = { 1: 3500, 196: 50, 42161: 3500, 10: 3500, 137: 0.65, 5000: 0.80 };
      return NATIVE_PRICES_USD[chain.chainId] || 2000;
    }

    try {
      const provider = getProvider(chain.rpc, chain.chainId, chain.rpcFallbacks || []);
      const aggregator = new ethers.Contract(feedAddress, AGGREGATOR_ABI, provider);
      const { answer } = await aggregator.latestRoundData();
      return parseFloat(ethers.utils.formatUnits(answer, 8)); // Chainlink USD feeds are 8 decimals
    } catch (error) {
      console.warn(`Failed to fetch price for ${chainKey}:`, error.message);
      return 2000; // Generic fallback
    }
  }

  /**
   * Estimate gas cost in native token and USD
   */
  async estimateGasCost(chainKey, txType = 'send', txData = null) {
    const { getChain } = require('../config/chains');
    const chain = getChain(chainKey);
    const provider = getProvider(chain.rpc, chain.chainId, chain.rpcFallbacks || []);
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;
    
    // Estimate gas units dynamically if txData is provided
    let gasUnits;
    if (txData && txData.to) {
      try {
        gasUnits = await provider.estimateGas(txData);
      } catch (e) {
        gasUnits = txType === 'approve' ? chain.gasConfig.approvalGas : chain.gasConfig.sendGas;
      }
    } else {
      gasUnits = txType === 'approve' ? chain.gasConfig.approvalGas : chain.gasConfig.sendGas;
    }
    
    // Calculate cost safely
    const gasCostWei = gasPrice.mul(gasUnits.toString());
    const gasCostEth = ethers.utils.formatEther(gasCostWei);
    
    const nativePriceUsd = await this.getNativePriceUsd(chainKey);
    const gasCostUsd = parseFloat(gasCostEth) * nativePriceUsd;
    
    // Determine congestion level
    const congestionLevel = this.calculateCongestion(feeData, chain.chainId);
    const recommendedBuffer = congestionLevel > chain.gasConfig.congestionThreshold
      ? chain.gasConfig.highBuffer
      : chain.gasConfig.lowBuffer;
    
    return {
      gasPrice: gasPrice.toString(),
      gasUnits: gasUnits.toString(),
      gasCostWei: gasCostWei.toString(),
      gasCostFormatted: `${gasCostEth} ${chain.nativeSymbol}`,
      gasCostUsd: `$${gasCostUsd.toFixed(4)}`,
      congestionLevel,
      recommendedBuffer,
      bufferType: congestionLevel > chain.gasConfig.congestionThreshold ? 'high' : 'low',
    };
  }
  
  calculateCongestion(feeData, chainId) {
    // Determine true congestion using current fee vs threshold
    const gasPriceGwei = parseFloat(ethers.utils.formatUnits(
      feeData.maxFeePerGas || feeData.gasPrice, 
      'gwei'
    ));
    
    // Dynamic congestion check: if maxFee is significantly higher than base gas price
    // or exceeds chain-specific "calm" thresholds.
    const thresholds = {
      1: 50,      // ETH mainnet
      196: 0.1,   // X Layer
      42161: 0.5, // Arbitrum
      10: 0.1,    // Optimism
      137: 100,   // Polygon
      5000: 0.05, // Mantle
    };
    
    const threshold = thresholds[chainId] || 1;
    return Math.min(gasPriceGwei / threshold, 1);
  }
  
  /**
   * Apply dynamic buffer to native fee
   */
  applyFeeBuffer(nativeFee, bufferMultiplier) {
    return ethers.BigNumber.from(nativeFee)
      .mul(Math.floor(bufferMultiplier * 100))
      .div(100);
  }
  
  /**
   * Calculate total native needed for bridge
   */
  async calculateTotalNativeNeeded(chainKey, nativeFee, includeGas = true) {
    const { getChain } = require('../config/chains');
    const chain = getChain(chainKey);
    
    const feeWithBuffer = this.applyFeeBuffer(nativeFee, chain.gasConfig.lowBuffer);
    
    if (!includeGas) return feeWithBuffer;
    
    const gasEstimate = await this.estimateGasCost(chainKey, 'send');
    return ethers.BigNumber.from(feeWithBuffer).add(gasEstimate.gasCostWei);
  }
}

module.exports = new GasEstimator();

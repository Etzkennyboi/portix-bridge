const { getChain } = require('../config/chains');
const { bridgeQuote } = require('./bridgeQuote');
const gasEstimator = require('../lib/gasEstimator');

/**
 * Chain Selection Intelligence
 * Auto-selects optimal route based on fees, speed, and balances
 */

const PRIORITY_WEIGHTS = {
  cheapest: { fee: 0.7, speed: 0.2, reliability: 0.1 },
  fastest: { fee: 0.2, speed: 0.7, reliability: 0.1 },
  balanced: { fee: 0.4, speed: 0.4, reliability: 0.2 },
};

async function bridgeRoute({ fromChain, toChainOptions, token, amount, priority = 'cheapest' }) {
  if (!fromChain || !toChainOptions || !token || !amount) {
    throw new Error('Missing required params: fromChain, toChainOptions, token, amount');
  }
  
  const weights = PRIORITY_WEIGHTS[priority] || PRIORITY_WEIGHTS.cheapest;
  const routes = [];
  
  // Generate all possible routes
  for (const dstChain of toChainOptions) {
    if (dstChain === fromChain) continue;
    
    try {
      const quote = await bridgeQuote({
        srcChain: fromChain,
        dstChain,
        token,
        amount,
        recipient: '0x0000000000000000000000000000000000000000', // dummy for quote
      });
      
      const gasEstimate = await gasEstimator.estimateGasCost(fromChain, 'send');
      const totalFeeUsd = parseFloat(gasEstimate.gasCostUsd.replace('$', '')) + 
                         estimateLzFeeUsd(quote.nativeFee, fromChain);
      
      const route = {
        srcChain: fromChain,
        dstChain,
        fee: totalFeeUsd,
        speed: getSpeedScore(dstChain),
        reliability: getReliabilityScore(fromChain, dstChain),
        quote,
        gasEstimate,
      };
      
      route.score = (
        (1 / (route.fee || 0.01)) * weights.fee +
        route.speed * weights.speed +
        route.reliability * weights.reliability
      );
      
      routes.push(route);
    } catch (err) {
      // Skip routes that fail to quote
      console.warn(`Failed to quote route ${fromChain} -> ${dstChain}:`, err.message);
    }
  }
  
  // Sort by score
  routes.sort((a, b) => b.score - a.score);
  
  if (routes.length === 0) {
    throw new Error('No valid routes found');
  }
  
  const best = routes[0];
  const alternatives = routes.slice(1, 3);
  
  // Calculate rebalancing suggestion (dummy logic for now)
  const rebalancingSuggestion = { needed: false };
  
  return {
    skill: 'bridge-route',
    recommendedRoute: {
      srcChain: best.srcChain,
      dstChain: best.dstChain,
      reason: priority === 'cheapest' ? 'LOWEST_FEE' : priority === 'fastest' ? 'FASTEST' : 'BALANCED',
      estimatedFee: `$${best.fee.toFixed(4)}`,
      estimatedTime: best.quote.transferTimeEstimate,
      savingsVsAlternative: alternatives.length > 0 
        ? `${Math.round((1 - best.fee / alternatives[0].fee) * 100)}% cheaper than ${alternatives[0].dstChain}`
        : null,
    },
    alternativeRoutes: alternatives.map(alt => ({
      srcChain: alt.srcChain,
      dstChain: alt.dstChain,
      reason: alt.speed > best.speed ? 'FASTER' : 'ALTERNATIVE',
      estimatedFee: `$${alt.fee.toFixed(4)}`,
      estimatedTime: alt.quote.transferTimeEstimate,
    })),
    rebalancingSuggestion,
  };
}

function estimateLzFeeUsd(nativeFee, chainKey) {
  // Rough USD estimates based on historical data
  const feeEstimates = {
    ethereum: 5,
    xlayer: 0.1,
    arbitrum: 0.5,
    optimism: 0.3,
    polygon: 0.2,
    mantle: 0.15,
  };
  return feeEstimates[chainKey] || 1;
}

function getSpeedScore(dstChain) {
  // Higher is faster
  const scores = {
    arbitrum: 0.9,
    optimism: 0.95,
    xlayer: 0.8,
    polygon: 0.7,
    mantle: 0.75,
    ethereum: 0.6,
  };
  return scores[dstChain] || 0.5;
}

function getReliabilityScore(src, dst) {
  // Based on LZ message success rates
  const reliablePairs = [
    ['ethereum', 'arbitrum'],
    ['arbitrum', 'ethereum'],
    ['xlayer', 'ethereum'],
  ];
  const pair = [src, dst];
  return reliablePairs.some(p => p[0] === pair[0] && p[1] === pair[1]) ? 1.0 : 0.85;
}

module.exports = { bridgeRoute };

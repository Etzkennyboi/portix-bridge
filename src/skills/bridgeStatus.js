const { getChain } = require('../config/chains');
const { getProvider } = require('../lib/oft');
const fetch = require('node-fetch');

const LZ_SCAN_API = 'https://api-mainnet.layerzero-scan.com/tx/';

async function bridgeStatus({ txHash, srcChain }) {
  if (!txHash || !srcChain) {
    throw new Error('Missing txHash or srcChain');
  }
  
  const src = getChain(srcChain);
  const provider = getProvider(src.rpc, src.chainId, src.rpcFallbacks || []);
  
  // 1. Confirm source tx on-chain
  let srcConfirmed = false;
  let srcBlockNumber = null;
  
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    srcConfirmed = !!receipt && receipt.status === 1;
    srcBlockNumber = receipt?.blockNumber;
  } catch { /* not yet mined */ }
  
  let status = srcConfirmed ? 'INFLIGHT' : 'PENDING';
  let dstTxHash = null;
  let lzData = null;
  
  // 2. Query LayerZero Scan for message delivery
  try {
    const res = await fetch(`${LZ_SCAN_API}${txHash}`);
    if (res.ok) {
      lzData = await res.json();
      const msg = lzData?.data?.[0];
      
      if (msg) {
        if (msg.status?.name === 'DELIVERED') {
          status = 'DELIVERED';
          dstTxHash = msg.dstTxHash;
        } else if (msg.status?.name === 'FAILED') {
          status = 'FAILED';
        } else if (msg.status?.name === 'INFLIGHT') {
          status = 'INFLIGHT';
        }
      }
    }
  } catch { /* LZ scan temporarily unavailable */ }
  
  // 3. Determine retry recommendation
  let retryRecommended = false;
  let retryStrategy = null;
  
  if (status === 'FAILED') {
    retryRecommended = true;
    retryStrategy = {
      action: 'RETRY_WITH_HIGHER_FEE',
      suggestedBuffer: 1.25,
      reason: 'Message verification timeout — likely due to gas underpayment',
    };
  } else if (status === 'INFLIGHT' && srcBlockNumber) {
    // Check if taking too long
    const currentBlock = await provider.getBlockNumber();
    const blocksElapsed = currentBlock - srcBlockNumber;
    const expectedBlocks = src.chainId === 1 ? 20 : 100; // ~5 min on ETH, ~2 min on L2s
    
    if (blocksElapsed > expectedBlocks) {
      retryRecommended = true;
      retryStrategy = {
        action: 'SPEED_UP',
        suggestedBuffer: 1.20,
        reason: `Bridge taking longer than expected (${blocksElapsed} blocks elapsed)`,
      };
    }
  }
  
  const instructionMap = {
    DELIVERED: 'Bridge complete. Tokens have arrived on destination chain.',
    FAILED: retryRecommended 
      ? 'Bridge failed. Retry recommended with higher fee buffer.' 
      : 'Bridge failed. Check LayerZero Scan for details.',
    INFLIGHT: retryRecommended
      ? 'Bridge delayed. Consider speeding up with higher gas.'
      : 'Bridge in progress. Poll again in 15 seconds.',
    PENDING: 'Transaction pending on source chain. Wait for confirmation.',
  };
  
  return {
    txHash,
    srcChain,
    srcConfirmed,
    status,
    dstTxHash,
    layerZeroScanUrl: `https://layerzeroscan.com/tx/${txHash}`,
    instruction: instructionMap[status] || instructionMap.INFLIGHT,
    retryRecommended,
    retryStrategy,
    estimatedCompletion: status === 'INFLIGHT' 
      ? new Date(Date.now() + 60000).toISOString() 
      : null,
  };
}

module.exports = { bridgeStatus };

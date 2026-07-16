const bridgeGuard = require('./bridgeCheck');
const { bridgeSwap } = require('./bridgeSwap');
const { bridgeExecute } = require('./bridgeExecute');

/**
 * Skill: xlayer-bridge-intent
 * Purpose: A single unified endpoint for an AI agent to execute a bridge intent.
 * Handles the logic for checking balances, executing remediation swaps, and
 * getting the approval + send transactions all in one go.
 */
async function bridgeIntent(params) {
  const { srcChain, dstChain, token, amount, recipient, agentAddress, refundAddress } = params;

  if (!srcChain || !dstChain || !token || !amount || !recipient || !agentAddress || !refundAddress) {
    throw new Error('Missing required params: srcChain, dstChain, token, amount, recipient, agentAddress, refundAddress');
  }

  // 1. Run Check
  const checkRes = await bridgeGuard.check({
    srcChain, dstChain, token, amount, recipient, agentAddress
  });

  const transactions = [];
  const instructions = [];

  // 2. Handle Swap Remediation
  let amountIsSufficient = checkRes.canExecute;
  if (!amountIsSufficient && checkRes.remediation && checkRes.remediation.type === 'SWAP_REQUIRED') {
    const swapParams = checkRes.remediation.params;
    const swapRes = await bridgeSwap(swapParams);
    
    transactions.push({
      type: 'swap',
      description: `Swap native ETH to cover missing USDT0 (${swapParams.amountUsdt})`,
      tx: swapRes.transaction
    });
    
    instructions.push(`1. Sign the SWAP transaction to acquire missing USDT0.`);
    amountIsSufficient = true; // Assume swap will succeed for the next steps
  } else if (!amountIsSufficient) {
    throw new Error(`Cannot bridge: ${checkRes.reason}. ${checkRes.recommendations.join(' ')}`);
  }

  // 3. Execution (Approve + Send)
  // We call execute twice conceptually. Once to see if approve is needed, then send.
  // We can pass approvalDone = false, and it returns step: 'approve'. 
  // Then we know we need approve.
  
  const execApproveRes = await bridgeExecute({
    srcChain, dstChain, token, amount, recipient, refundAddress, agentAddress,
    quoteData: checkRes.quote, approvalDone: false
  });

  if (execApproveRes.step === 'approve') {
    transactions.push({
      type: 'approve',
      description: 'Approve USDT0 for LayerZero OFT contract',
      tx: execApproveRes.tx
    });
    instructions.push(`${instructions.length + 1}. Sign the APPROVE transaction.`);
  }

  // To get the send tx, we call bridgeExecute with approvalDone = true
  const execSendRes = await bridgeExecute({
    srcChain, dstChain, token, amount, recipient, refundAddress, agentAddress,
    quoteData: checkRes.quote, approvalDone: true
  });

  transactions.push({
    type: 'send',
    description: `Bridge ${amount} ${token} to ${dstChain}`,
    tx: execSendRes.tx
  });
  instructions.push(`${instructions.length + 1}. Sign the SEND transaction to cross-chain bridge.`);

  return {
    skill: 'bridge-intent',
    status: 'READY',
    message: instructions.join('\n'),
    transactions
  };
}

module.exports = { bridgeIntent };

const { ethers } = require('ethers');
const { getChain } = require('../config/chains');
const { getOFTInterface, getERC20Interface, buildSendParam, getProvider, ERC20_ABI } = require('../lib/oft');
const { bridgeQuote } = require('./bridgeQuote');
const gasEstimator = require('../lib/gasEstimator');
const approvalCache = require('../lib/approvalCache');

const TOKEN_DECIMALS = 6;

async function checkAllowance(tokenAddress, ownerAddress, spenderAddress, rpcUrl, chainId, fallbacks = []) {
  try {
    const provider = getProvider(rpcUrl, chainId, fallbacks);
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const allowance = await token.allowance(ownerAddress, spenderAddress);
    return allowance;
  } catch {
    return ethers.BigNumber.from(0);
  }
}

function buildApproveTx(tokenAddress, oftAddress, chainId, gasLimit) {
  const data = getERC20Interface().encodeFunctionData("approve", [
    oftAddress,
    ethers.constants.MaxUint256
  ]);
  return {
    to: tokenAddress,
    data,
    value: "0",
    chainId,
    gasLimit: gasLimit.toString(),
    description: "Approve OFT Adapter (Ethereum only — one-time cost)"
  };
}

function buildSendTx(oftAddress, sendParam, msgFee, refundAddress, nativeFee, chainId, bufferMultiplier, gasLimit) {
  const data = getOFTInterface().encodeFunctionData("send", [
    sendParam, msgFee, refundAddress
  ]);
  
  const feeWithBuffer = ethers.BigNumber.from(nativeFee)
    .mul(Math.floor(bufferMultiplier * 100))
    .div(100);
  
  return {
    to: oftAddress,
    data,
    value: feeWithBuffer.toString(),
    chainId,
    gasLimit: gasLimit.toString(),
    description: `Bridge via USDT0 OFT on chainId ${chainId}`
  };
}

async function bridgeExecute({
  srcChain, dstChain, token, amount, recipient,
  refundAddress, agentAddress, quoteData, approvalDone, forceAmount = false
}) {
  if (!srcChain || !dstChain || !token || !amount || !recipient || !refundAddress) {
    throw new Error('Missing required params: srcChain, dstChain, token, amount, recipient, refundAddress');
  }
  
  const src = getChain(srcChain);
  const tokenKey = token.toLowerCase();
  const tokenConfig = src[tokenKey];
  
  if (!tokenConfig) {
    throw new Error(`Token ${token} not supported on ${srcChain}`);
  }
  
  // Use provided quote or fetch fresh
  const quote = quoteData || await bridgeQuote({ srcChain, dstChain, token, amount, recipient });
  const { sendParam, msgFee, nativeFee, requiresApproval } = quote;
  const amountWei = ethers.utils.parseUnits(amount, TOKEN_DECIMALS);
  
  // Get dynamic gas estimate and buffer
  const gasEstimate = await gasEstimator.estimateGasCost(srcChain, 'send');
  const bufferMultiplier = gasEstimate.recommendedBuffer;
  
  // STEP 1: APPROVE (Ethereum source only)
  if (requiresApproval && !approvalDone) {
    const ownerAddr = agentAddress || refundAddress;
    
    // Check cache first
    if (approvalCache.hasApproval(ownerAddr, tokenConfig.token, tokenConfig.oft)) {
      // Skip approval, proceed to send
    } else {
      const allowance = await checkAllowance(tokenConfig.token, ownerAddr, tokenConfig.oft, src.rpc, src.chainId, src.rpcFallbacks || []);
      
      if (allowance.lt(amountWei)) {
        const approvalGas = await gasEstimator.estimateGasCost(srcChain, 'approve');
        
        return {
          step: 'approve',
          required: true,
          tx: buildApproveTx(tokenConfig.token, tokenConfig.oft, src.chainId, approvalGas.gasUnits),
          instruction: 'Call callContractSign(tx) to approve. After confirmation, retry with approvalDone:true.',
          estimatedGasCost: approvalGas.gasCostFormatted,
        };
      } else {
        // Cache the approval for future
        approvalCache.setApproval(ownerAddr, tokenConfig.token, tokenConfig.oft);
      }
    }
  }
  
  // STEP 2: BRIDGE SEND TX
  const sendTx = buildSendTx(
    tokenConfig.oft,
    sendParam,
    msgFee,
    refundAddress,
    nativeFee,
    src.chainId,
    bufferMultiplier,
    gasEstimate.gasUnits
  );
  
  const totalCost = ethers.BigNumber.from(sendTx.value).add(gasEstimate.gasCostWei);
  
  return {
    step: 'send',
    tx: sendTx,
    instruction: 'Call runtime.callContractSign(tx). Save txHash. Poll bridge-status every 15s until DELIVERED.',
    meta: {
      amountBridging: `${amount} ${token}`,
      from: srcChain,
      to: dstChain,
      recipient,
      nativeFeeRequired: quote.nativeFeeFormatted,
      feeWithBuffer: `${ethers.utils.formatEther(sendTx.value)} ${src.nativeSymbol}`,
      estimatedGasCost: gasEstimate.gasCostFormatted,
      totalCost: `${ethers.utils.formatEther(totalCost)} ${src.nativeSymbol}`,
      estimatedArrival: '30-90 seconds',
      bufferApplied: `${Math.round((bufferMultiplier - 1) * 100)}% (${gasEstimate.bufferType} congestion)`,
    }
  };
}

module.exports = { bridgeExecute };

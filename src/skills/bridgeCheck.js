const { ethers } = require('ethers');
const { getChain } = require('../config/chains');
const { OFT_ABI, ERC20_ABI, getProvider, buildSendParam, getOFTInterface } = require('../lib/oft');
const gasEstimator = require('../lib/gasEstimator');
const approvalCache = require('../lib/approvalCache');

const TOKEN_DECIMALS = 6;
const SAFETY_USDT_BUFFER = 10000; // 0.01 USDT safety margin (6 decimals)

class BridgeGuard {
  async check(params) {
    const { srcChain, dstChain, token, amount, recipient, agentAddress } = params;

    // Input validation
    if (!srcChain || !dstChain || !token || !amount || !recipient || !agentAddress) {
      throw new Error('Missing required params: srcChain, dstChain, token, amount, recipient, agentAddress');
    }
    if (srcChain === dstChain) {
      throw new Error('srcChain and dstChain must be different');
    }

    const src = getChain(srcChain);
    const dst = getChain(dstChain);
    const tokenKey = token.toLowerCase();
    const tokenConfig = src[tokenKey];

    if (!tokenConfig) {
      throw new Error(`Token ${token} not supported on ${srcChain}`);
    }

    // Fetch balances
    const provider = getProvider(src.rpc, src.chainId, src.rpcFallbacks || []);
    const usdtContract = new ethers.Contract(tokenConfig.token, ERC20_ABI, provider);

    const [usdtBalance, nativeBalance] = await Promise.all([
      usdtContract.balanceOf(agentAddress),
      provider.getBalance(agentAddress),
    ]);

    const amountWei = ethers.utils.parseUnits(amount, TOKEN_DECIMALS);

    // ── On-chain quote ──────────────────────────────────────────────────────────
    // quoteOFT returns: (OFTLimit limits, OFTFeeDetail[] fees, OFTReceipt receipt)
    //   receipt = { amountSentLD: uint256, amountReceivedLD: uint256 }
    const oftInterface = getOFTInterface();
    const oft = new ethers.Contract(tokenConfig.oft, oftInterface, provider);
    const sendParamInit = buildSendParam(dst.lzEid, recipient, amountWei, 0);
    const [, , oftReceipt] = await oft.callStatic.quoteOFT(sendParamInit);

    // FIX BUG 1: oftReceipt[0] = amountSentLD, oftReceipt[1] = amountReceivedLD
    // Use amountReceivedLD as minAmountOut for slippage protection
    const amountSentLD     = oftReceipt[0]; // how much leaves the source
    const amountReceivedLD = oftReceipt[1]; // how much arrives at destination (after fees)
    const minAmountOut     = amountReceivedLD;

    // Second call: quoteSend with real slippage-protected sendParam
    const sendParam = buildSendParam(dst.lzEid, recipient, amountWei, minAmountOut);
    const msgFee    = await oft.callStatic.quoteSend(sendParam, false);
    const nativeFee = msgFee[0]; // native token fee in wei

    // Build a simulation object so the estimator can perform a real provider.estimateGas()
    const simTx = {
      to: tokenConfig.oft,
      from: agentAddress,
      data: oftInterface.encodeFunctionData("send", [sendParam, msgFee, agentAddress]),
      value: nativeFee
    };

    // Pass the simulation object to get a real estimate instead of the fallback
    const gasEst = await gasEstimator.estimateGasCost(srcChain, 'send', simTx);

    // Total native needed = LZ fee + execution gas, with a 10% safety margin
    const totalNativeNeeded = ethers.BigNumber.from(nativeFee)
      .add(gasEst.gasCostWei)
      .mul(110).div(100);

    // Approval status (Ethereum only)
    let approvalRequired = tokenConfig.requiresApproval;
    let approvalCached   = false;

    if (approvalRequired) {
      approvalCached = approvalCache.hasApproval(agentAddress, tokenConfig.token, tokenConfig.oft);
      if (approvalCached) {
        approvalRequired = false;
      } else {
        const allowance = await usdtContract.allowance(agentAddress, tokenConfig.oft);
        if (allowance.gte(amountWei)) {
          approvalRequired = false;
          approvalCache.setApproval(agentAddress, tokenConfig.token, tokenConfig.oft);
        }
      }
    }

    // FIX BUG 7: pass requestedAmount into calculateMaxAffordable
    const maxAffordable = this.calculateMaxAffordable({
      usdtBalance,
      nativeBalance,
      nativeFee,
      gasEst,
      amountWei,
    });

    const canExecute = usdtBalance.gte(amountWei) && nativeBalance.gte(totalNativeNeeded);

    const { reason, recommendations } = this.buildResponse({
      canExecute,
      usdtBalance,
      nativeBalance,
      amountWei,
      totalNativeNeeded,
      maxAffordable,
      gasEst,
      src,
      agentAddress,
      srcChain,
    });

    return {
      skill: 'bridge-check',
      canExecute,
      reason,
      balances: {
        usdtBalance:   usdtBalance.toString(),
        nativeBalance: nativeBalance.toString(),
        nativeSymbol:  src.nativeSymbol,
      },
      requirements: {
        usdtNeeded:        amountWei.toString(),
        nativeFee:         nativeFee.toString(),
        gasEstimate:       gasEst.gasCostWei,
        totalNativeNeeded: totalNativeNeeded.toString(),
        safetyBuffer:      SAFETY_USDT_BUFFER.toString(),
      },
      maxAffordable: {
        canBridgeFullAmount: maxAffordable.canBridgeFullAmount,
        suggestedAmount:     maxAffordable.suggestedAmount,
        maxPossible:         maxAffordable.maxPossible,
        limitingFactor:      maxAffordable.limitingFactor,
      },
      quote: {
        amountIn:             amountWei.toString(),
        amountOut:            amountSentLD.toString(),     // what leaves the source
        minAmountOut:         minAmountOut.toString(),     // FIX: was wrongly amountSentLD
        nativeFee:            nativeFee.toString(),
        nativeFeeFormatted:   `${ethers.utils.formatEther(nativeFee)} ${src.nativeSymbol}`,
        transferTimeEstimate: '30-90 seconds',
        requiresApproval:     approvalRequired,
        approvalCached,
        sendParam,
        msgFee: [nativeFee.toString(), '0'],
      },
      gasEstimate: {
        ...gasEst,
        congestionLevel: Math.round(gasEst.congestionLevel * 100) + '%',
      },
      recommendations,
    };
  }

  // FIX BUG 7: accept amountWei and compare it to determine canBridgeFullAmount
  calculateMaxAffordable({ usdtBalance, nativeBalance, nativeFee, gasEst, amountWei }) {
    const gasCost           = ethers.BigNumber.from(gasEst.gasCostWei);
    const nativeNeededForFee = ethers.BigNumber.from(nativeFee).add(gasCost);

    // Native check
    if (nativeBalance.lt(nativeNeededForFee)) {
      return { canBridgeFullAmount: false, suggestedAmount: '0', maxPossible: '0', limitingFactor: 'NATIVE_BALANCE' };
    }

    // USDT check — max bridgeable = balance minus safety buffer
    const maxUsdt = usdtBalance.sub(SAFETY_USDT_BUFFER);
    if (maxUsdt.lte(0)) {
      return { canBridgeFullAmount: false, suggestedAmount: '0', maxPossible: '0', limitingFactor: 'USDT_BALANCE' };
    }

    const maxPossibleFormatted  = ethers.utils.formatUnits(maxUsdt, TOKEN_DECIMALS);
    // suggestedAmount = requested if affordable, else the max
    const canBridgeFull         = maxUsdt.gte(amountWei);
    const suggestedAmount       = canBridgeFull
      ? ethers.utils.formatUnits(amountWei, TOKEN_DECIMALS)
      : maxPossibleFormatted;

    return {
      canBridgeFullAmount: canBridgeFull,
      suggestedAmount,
      maxPossible: maxPossibleFormatted,
      limitingFactor: canBridgeFull ? null : 'USDT_BALANCE',
    };
  }

  buildResponse({ canExecute, usdtBalance, nativeBalance, amountWei, totalNativeNeeded, maxAffordable, gasEst, src, agentAddress, srcChain }) {
    if (canExecute) {
      return {
        reason: null,
        recommendations: [
          'You have sufficient balances to execute this bridge',
          `Estimated total cost: ${ethers.utils.formatEther(totalNativeNeeded)} ${src.nativeSymbol}`,
        ],
      };
    }

    if (nativeBalance.lt(totalNativeNeeded)) {
      const shortfall = totalNativeNeeded.sub(nativeBalance);
      return {
        reason: 'INSUFFICIENT_NATIVE_BALANCE',
        recommendations: [
          `You need ${ethers.utils.formatEther(shortfall)} ${src.nativeSymbol} more to execute this bridge`,
          `Current balance: ${ethers.utils.formatEther(nativeBalance)} ${src.nativeSymbol}`,
          `Required: ${ethers.utils.formatEther(totalNativeNeeded)} ${src.nativeSymbol}`,
          `Please deposit ${src.nativeSymbol} to your wallet first`,
        ],
      };
    }

    if (usdtBalance.lt(amountWei)) {
      const requested = ethers.utils.formatUnits(amountWei, TOKEN_DECIMALS);
      const available = ethers.utils.formatUnits(usdtBalance, TOKEN_DECIMALS);
      const shortfall = amountWei.sub(usdtBalance);
      
      // We estimate swap gas (Uniswap V3 swap is ~150k gas)
      const swapGasPrice = gasEst.gasPrice; // We use gasPrice directly from gasEst
      const swapGasUnits = 150000;
      const swapGasEstimate = ethers.BigNumber.from(swapGasPrice).mul(swapGasUnits);
      
      // Relaxed check: We suggest the swap even if the native balance is tight, 
      // but only if the user has AT LEAST enough for the swap itself.
      const canSuggestSwap = nativeBalance.gt(swapGasEstimate);

      return {
        reason: 'INSUFFICIENT_USDT_BALANCE',
        remediation: canSuggestSwap ? {
          type: 'SWAP_REQUIRED',
          skill: 'xlayer-bridge-swap',
          params: {
            chain: srcChain,
            amountUsdt: ethers.utils.formatUnits(shortfall, TOKEN_DECIMALS),
            agentAddress
          }
        } : null,
        recommendations: [
          `You requested ${requested} USDT0 but only have ${available} USDT0 available`,
          canSuggestSwap 
            ? `Action Required: Run bridge-swap to acquire ${ethers.utils.formatUnits(shortfall, TOKEN_DECIMALS)} USDT0. WARNING: Total ETH may be low after the swap.`
            : `Suggested: Bridge ${maxAffordable.suggestedAmount} USDT0 instead (Note: Native balance too low for swap gas).`,
          'Alternatively, deposit more USDT0 to bridge the full amount',
        ],
      };
    }

    return { reason: 'UNKNOWN', recommendations: ['Please check your balances and try again'] };
  }
}

module.exports = new BridgeGuard();

const { ethers } = require('ethers');
const { getChain } = require('../config/chains');
const { OFT_ABI, getProvider, buildSendParam } = require('../lib/oft');

const TOKEN_DECIMALS = 6;

async function bridgeQuote({ srcChain, dstChain, token, amount, recipient }) {
  if (!srcChain || !dstChain || !token || !amount || !recipient) {
    throw new Error('Missing required params: srcChain, dstChain, token, amount, recipient');
  }
  if (srcChain === dstChain) {
    throw new Error('srcChain and dstChain must be different');
  }

  const src       = getChain(srcChain);
  const dst       = getChain(dstChain);
  const tokenKey  = token.toLowerCase();
  const tokenConfig = src[tokenKey];

  if (!tokenConfig) {
    throw new Error(`Token ${token} not supported on ${srcChain}`);
  }

  const provider  = getProvider(src.rpc, src.chainId, src.rpcFallbacks || []);
  const oft       = new ethers.Contract(tokenConfig.oft, OFT_ABI, provider);
  const amountWei = ethers.utils.parseUnits(amount, TOKEN_DECIMALS);

  async function retryContractCall(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        console.warn(`Upstream RPC call failed (attempt ${i + 1}/${retries}), retrying: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // ── Pass 1: get expected receipt with minAmount = 0 ──────────────────────────
  // quoteOFT returns: (OFTLimit, OFTFeeDetail[], OFTReceipt)
  //   OFTReceipt = { amountSentLD, amountReceivedLD }
  const sendParamInit = buildSendParam(dst.lzEid, recipient, amountWei, 0);
  const [, , oftReceipt] = await retryContractCall(() => oft.callStatic.quoteOFT(sendParamInit));

  // FIX: [0] = amountSentLD  [1] = amountReceivedLD (use [1] for slippage protection)
  const amountSentLD     = oftReceipt[0];
  const amountReceivedLD = oftReceipt[1]; // will arrive on destination

  // ── Pass 2: build final SendParam with slippage protection ───────────────────
  const minAmountOut = amountReceivedLD;
  const sendParam    = buildSendParam(dst.lzEid, recipient, amountWei, minAmountOut);
  const msgFee       = await retryContractCall(() => oft.callStatic.quoteSend(sendParam, false));
  const nativeFee    = msgFee[0];

  const dstTokenConfig = getChain(dstChain)[tokenKey];
  if (!dstTokenConfig) {
    throw new Error(`Token ${token} not supported on destination chain ${dstChain}`);
  }

  return {
    skill:                'bridge-quote',
    srcChain,
    dstChain,
    token,
    amountIn:             amountWei.toString(),
    amountOut:            amountSentLD.toString(),     // how much leaves source (after bridge fee)
    minAmountOut:         minAmountOut.toString(),     // guaranteed minimum on destination
    nativeFee:            nativeFee.toString(),
    nativeFeeFormatted:   `${ethers.utils.formatEther(nativeFee)} ${src.nativeSymbol}`,
    lzTokenFee:           msgFee[1].toString(),
    transferTimeEstimate: '30-90 seconds',
    srcOFTAddress:        tokenConfig.oft,
    dstOFTAddress:        dstTokenConfig.oft,
    requiresApproval:     tokenConfig.requiresApproval,
    sendParam,
    msgFee: [nativeFee.toString(), '0'],
  };
}

module.exports = { bridgeQuote };

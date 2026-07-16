const { ethers } = require('ethers');
const { getChain } = require('../src/config/chains');
const { getOFTInterface, buildSendParam } = require('../src/lib/oft');
const { bridgeQuote } = require('../src/skills/bridgeQuote');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'help' || !command) {
    console.log(`
xlayer-bridge-skills v3 helper
------------------------------
Available commands:
  calldata <srcChain> <dstChain> <token> <amount> <recipient> <refundAddress>
  execute  <srcChain> <dstChain> <token> <amount> <recipient> <refundAddress> (Requires PRIVATE_KEY in .env)

Example:
  node scripts/calldata.js calldata xlayer ethereum USDT0 10 0x123... 0x123...
    `);
    return;
  }

  const [, srcChain, dstChain, token, amount, recipient, refundAddress] = args;

  if (!srcChain || !dstChain || !token || !amount || !recipient || !refundAddress) {
    console.error('Error: Missing arguments');
    process.exit(1);
  }

  try {
    const quote = await bridgeQuote({ srcChain, dstChain, token, amount, recipient });
    
    if (command === 'calldata') {
      const iface = getOFTInterface();
      const calldata = iface.encodeFunctionData('send', [
        quote.sendParam,
        quote.msgFee,
        refundAddress
      ]);

      console.log('\n--- Bridge Calldata ---');
      console.log('Contract:', quote.srcOFTAddress);
      console.log('Native Value (wei):', quote.nativeFee);
      const src = getChain(srcChain);
      console.log('Calldata:', calldata);
      console.log('\n--- ONCHAINOS COMMAND ---');
      console.log(`onchainos wallet contract-call --chain ${src.chainId} --to ${quote.srcOFTAddress} --input-data ${calldata} --amt ${quote.nativeFee}`);
    } else if (command === 'execute') {
      require('dotenv').config();
      const pk = process.env.PRIVATE_KEY;
      if (!pk) {
        console.error('Error: PRIVATE_KEY not found in .env');
        process.exit(1);
      }

      const src = getChain(srcChain);
      const provider = new ethers.providers.JsonRpcProvider(src.rpc);
      const wallet = new ethers.Wallet(pk, provider);
      
      const iface = getOFTInterface();
      const txData = iface.encodeFunctionData('send', [
        quote.sendParam,
        quote.msgFee,
        refundAddress
      ]);

      console.log(`Executing bridge on ${srcChain}...`);
      const tx = await wallet.sendTransaction({
        to: quote.srcOFTAddress,
        data: txData,
        value: quote.nativeFee,
        gasLimit: 500000 // reasonable default for bridge
      });

      console.log('Transaction Sent:', tx.hash);
      console.log('Wait for confirmation and track at:');
      console.log(`https://layerzeroscan.com/tx/${tx.hash}`);
    }
  } catch (err) {
    console.error('Execution Error:', err.message);
  }
}

main();

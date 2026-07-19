const { bridgeQuote } = require('../src/skills/bridgeQuote');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

async function main() {
  const jobId = "0xf1b0ccbc31e9095dfcfbba977ead35435079fbaa322037a2839682038a8f17d2";
  const recipient = "0xc385e2df2aa27a3fbe809e0faf7c5c357b716c63";
  
  console.log('Calculating bridge quote...');
  const quote = await bridgeQuote({
    srcChain: 'ethereum',
    dstChain: 'xlayer',
    token: 'USDT0',
    amount: '500',
    recipient: recipient
  });
  
  const deliverable = {
    quote: quote,
    explanation: "This is the real-time fee estimate to bridge 500 USDT0 from Ethereum to X Layer.",
    expectedTime: "30-90 seconds",
    costEstimate: quote.nativeFeeFormatted
  };
  
  const outputPath = path.resolve(__dirname, '../asp/quote_deliverable.json');
  fs.writeFileSync(outputPath, JSON.stringify(deliverable, null, 2));
  console.log(`Saved quote deliverable to ${outputPath}`);
  
  console.log('Executing deliver command on-chain...');
  try {
    const result = execFileSync(
      'onchainos',
      [
        'agent', 'deliver',
        jobId,
        '--agent-id', '5119',
        '--file', outputPath,
        '--message', 'Deliver USDT0 bridge quote for 500 USDT0 from Ethereum to X Layer'
      ],
      { encoding: 'utf8', timeout: 120000 }
    );
    console.log('STDOUT:', result);
  } catch (err) {
    console.log('STDOUT:', err.stdout || '');
    console.log('STDERR:', err.stderr || '');
  }
}

main().catch(console.error);

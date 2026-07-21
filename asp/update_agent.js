const { execSync } = require('child_process');

const services = JSON.stringify([
  {
    operation: "update",
    id: "35047",
    serviceName: "Bridge Intent",
    serviceDescription: "Unified cross-chain USDT0 bridge: ethereum|xlayer|arbitrum|optimism|polygon|mantle ONLY. Base/BNB/Avalanche not supported.",
    serviceType: "A2MCP",
    fee: "0.000001",
    endpoint: "https://portix-bridge-production.up.railway.app/api/skills/bridge/intent"
  },
  {
    operation: "update",
    id: "35048",
    serviceName: "Bridge Route",
    serviceDescription: "USDT0 route intelligence: ethereum|xlayer|arbitrum|optimism|polygon|mantle ONLY. Base/BNB/Avalanche not supported.",
    serviceType: "A2MCP",
    fee: "0.000001",
    endpoint: "https://portix-bridge-production.up.railway.app/api/skills/bridge/route"
  },
  {
    operation: "update",
    id: "35049",
    serviceName: "Bridge Quote",
    serviceDescription: "Real-time USDT0 fee estimation: ethereum|xlayer|arbitrum|optimism|polygon|mantle ONLY. Base/BNB/Avalanche not supported.",
    serviceType: "A2MCP",
    fee: "0.000001",
    endpoint: "https://portix-bridge-production.up.railway.app/api/skills/bridge/quote"
  },
  {
    operation: "update",
    id: "35050",
    serviceName: "Bridge Status",
    serviceDescription: "Cross-chain USDT0 delivery status: ethereum|xlayer|arbitrum|optimism|polygon|mantle ONLY. Base/BNB/Avalanche not supported.",
    serviceType: "A2MCP",
    fee: "0.000001",
    endpoint: "https://portix-bridge-production.up.railway.app/api/skills/bridge/status"
  }
]);

try {
  const { execFileSync } = require('child_process');
  const result = execFileSync(
    'onchainos',
    ['agent', 'update', '--agent-id', '5119', '--service', services],
    {
      encoding: 'utf8',
      timeout: 120000,
      env: { ...process.env, ONCHAINOS_SKIP_A2A: '1' }
    }
  );
  console.log('STDOUT:', result);
} catch (err) {
  console.log('STDOUT:', err.stdout || '');
  console.log('STDERR:', err.stderr || '');
  console.log('EXIT CODE:', err.status);
}

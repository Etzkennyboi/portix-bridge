const { execSync } = require('child_process');

const services = JSON.stringify([
  {
    operation: "create",
    serviceName: "Bridge Intent",
    serviceDescription: "Unified cross-chain bridging with automatic balance remediation",
    serviceType: "A2MCP",
    fee: "0",
    endpoint: "https://portix-bridge-production.up.railway.app/api/skills/bridge/intent"
  },
  {
    operation: "create",
    serviceName: "Bridge Route",
    serviceDescription: "Route intelligence and cost comparison",
    serviceType: "A2MCP",
    fee: "0",
    endpoint: "https://portix-bridge-production.up.railway.app/api/skills/bridge/route"
  },
  {
    operation: "create",
    serviceName: "Bridge Quote",
    serviceDescription: "Real-time fee estimation",
    serviceType: "A2MCP",
    fee: "0",
    endpoint: "https://portix-bridge-production.up.railway.app/api/skills/bridge/quote"
  },
  {
    operation: "create",
    serviceName: "Bridge Status",
    serviceDescription: "Track cross-chain delivery status",
    serviceType: "A2MCP",
    fee: "0",
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

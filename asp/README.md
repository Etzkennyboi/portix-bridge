# Portix AI — Agent Service Provider (ASP)

Portix AI is a production-ready, agent-to-agent (A2A) and agent-to-MCP (A2MCP) cross-chain bridging provider. It enables autonomous AI agents to seamlessly move USDT0, XAUt0, and CNHt0 across multiple EVM networks (including X Layer, Ethereum, Arbitrum, Optimism, Polygon, and Mantle) utilizing LayerZero's OFT v2 standard.

## Core Features

1. **Intelligent Auto-Remediation (Swap-if-Short)**: If the agent's USDT0 balance is insufficient but their native gas token (e.g., ETH, OKB, MATIC) is healthy, Portix AI automatically bundles a Uniswap V3 swap transaction prior to the bridge transactions. Consuming agents don't need branching logic; they simply execute the transaction sequence returned in the array.
2. **Unified Bridge Intent**: Instead of separate endpoints for balance checks, approval setups, and execution, a single call to `/api/skills/bridge/intent` evaluates the entire pipeline and builds the exact transactions needed.
3. **Adaptive Routing Intelligence**: Automatically evaluates gas costs, LayerZero fees, speeds, and historical reliability to select the optimal bridge route.
4. **Zero Key Exposure**: Portix AI never touches private keys. It constructs transaction payload data and estimates correct gas, gas pricing, and slippage buffer limits, returning secure transactions to be signed natively by the agent's execution environment.

## Integration Spec

### 1. Unified Bridge Intent (`bridge-intent`)
**Endpoint**: `POST /api/skills/bridge/intent`  
Returns an ordered array of transactions. If a swap is required, the swap transaction is prepended automatically.

### 2. Route Selector (`bridge-route`)
**Endpoint**: `POST /api/skills/bridge/route`  
Returns the recommended optimal route (lowest cost, fastest, or balanced) alongside alternative options and the cost savings delta.

### 3. Delivery Tracker (`bridge-status`)
**Endpoint**: `GET /api/skills/bridge/status`  
Allows agents to poll LayerZero Scan to track the message status from source transaction confirm to destination delivery.

### 4. Fee Quoting (`bridge-quote`)
**Endpoint**: `GET /api/skills/bridge/quote`  
Provides real-time fee estimates, native gas fees, and minimum guaranteed receive amounts.

## Supported Network Mapping

| Chain Name | chainId | lzEid | Native Token | USDT0 Address |
|------------|---------|-------|--------------|---------------|
| X Layer    | 196     | 30274 | OKB          | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` |
| Ethereum   | 1       | 30101 | ETH          | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| Arbitrum   | 42161   | 30110 | ETH          | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |
| Optimism   | 10      | 30111 | ETH          | `0x01bFF41798a0BcF287b996046Ca68b395DbC1071` |
| Polygon    | 137     | 30109 | MATIC        | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| Mantle     | 5000    | 30181 | MNT          | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` |

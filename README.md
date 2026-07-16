# xlayer-bridge-skills v3

OnChain OS-compatible skills for AI agents to perform intelligent, cross-chain USDT0 bridging using LayerZero OFT v2.

## Available Skills

| Skill | Description |
|-------|-------------|
| `xlayer-bridge-intent` | **NEW/PRIMARY**: Unified endpoint replacing manual check, swap, and execute steps. Returns all necessary transactions in order. |
| `xlayer-bridge-check` | Pre-execution guard: validates balances, fees, and safety buffers. (Wrapped by intent). |
| `xlayer-bridge-quote` | Real-time on-chain quotes for bridging fees and arrival amounts. |
| `xlayer-bridge-execute` | Transaction builder for TEE-native signing. (Wrapped by intent). |
| `xlayer-bridge-status` | Polling and tracking of cross-chain message delivery. |
| `xlayer-bridge-route` | Intelligent route selection based on cost, speed, and reliability. |
| `xlayer-bridge-swap` | Acquires USDT0 via Uniswap V3 when balance is low. (Wrapped by intent). |

## Intelligent Remediation
This skill pack features **Intelligent Intent Execution**. The new `xlayer-bridge-intent` skill natively encapsulates the entire state machine. If it detects that your USDT0 balance is insufficient but your Native balance (ETH/MATIC) is healthy, it will automatically bundle a Uniswap V3 swap transaction alongside the required bridging transactions. The AI simply executes the transactions it is given without complex branching logic.

## Supported Chains
X Layer, Ethereum, Arbitrum, Optimism, Polygon, and Mantle.

## Prerequisites
- Node.js 16+
- RPC URLs for the chains you intend to use.

Recommended: Create a `.env` file in your project root:

```bash
ETH_RPC="your-rpc-url"
XLAYER_RPC="your-rpc-url"
# ... and so on
```

**Security warning**: Never commit `.env` to git and never expose RPC URLs with embedded keys.

## Recommended Install
```bash
git clone https://github.com/Etzkennyboi/fast-bridge-xlayer
cd fast-bridge-xlayer
npm install
npm start
```

## Agent Examples

## Agent Examples

The new intent-based architecture eliminates the need for complex agent orchestration. 

**Unified Loop**: `xlayer-bridge-intent` (generate grouped transactions) -> sequentially `SignTx` (swap, approve, execute) -> `xlayer-bridge-status` (monitor delivery).

No conditional branching inside the LLM prompt is required.

## License
MIT

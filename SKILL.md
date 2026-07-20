# xlayer-bridge-skills

version: 3.2.0
base_url: https://portix-bridge-production.up.railway.app
supported_chains: ethereum|xlayer|arbitrum|optimism|polygon|mantle
supported_tokens: USDT0

## Agent Intelligence Patterns

### Pattern 1: Unified Bridge Execution (MANDATORY)
**Goal**: Handle all checks, remediation swaps, approvals, and bridging in one shot without agent logic errors.
1. Call `bridge-intent`.
2. Inspect the returned target `transactions` array.
3. If `status` is `READY`:
   - Iterate through `res.transactions` in order:
     - Call `runtime.callContractSign(tx.tx)`.
     - Wait for on-chain confirmation before moving to the next.
4. If an error is returned (e.g. `INSUFFICIENT_NATIVE_BALANCE`):
   - Ask the user to fund their wallet or suggest the max possible bridge amount if one is provided in the error message.

### Pattern 2: Adaptive Routing
**Goal**: Save user funds by picking the cheapest chain.
1. Call `bridge-route`.
2. Recommend the `recommendedRoute` to the user, highlighting the `savingsVsAlternative`.

## Skills

### bridge-intent
endpoint: POST /api/skills/bridge/intent
auth: none
description: >
  UNIFIED ENDPOINT: Call this when the user wants to bridge.
  Automatically checks balances, acquires USDT0 via swap if necessary, builds the 
  ERC20 approve tx, and builds the LayerZero bridge tx.
params:
  - srcChain: xlayer|ethereum|arbitrum|polygon|optimism|mantle
  - dstChain: xlayer|ethereum|arbitrum|polygon|optimism|mantle (must differ from srcChain)
  - token: USDT0
  - amount: string (human-readable, e.g. "100")
  - recipient: string (0x address on destination)
  - agentAddress: string (agent's wallet address)
  - refundAddress: string (agent's wallet address or user)
returns:
  - skill: string
  - status: "READY"
  - message: instructions for the agent
  - transactions: array of { type: string, description: string, tx: object } to be signed in order.

### bridge-execute
endpoint: POST /api/skills/bridge/execute
auth: none
description: >
  Execute a cross-chain bridge. Returns a tx object.
  Call runtime.callContractSign(tx) to sign and broadcast.
  Ethereum source: two calls required (approve, then send with approvalDone:true).
  All other chains: single call (send only).
  ALWAYS call bridge-check first to validate execution readiness.
params:
  - srcChain, dstChain, token, amount, recipient
  - refundAddress: address for LZ fee refunds
  - agentAddress: agent's wallet address
  - quoteData: output from bridge-quote (optional, will fetch if not provided)
  - approvalDone: boolean (set true after approval confirms for ETH source)
  - forceAmount: boolean (skip auto-adjustment, fail if insufficient)

### bridge-status
endpoint: GET /api/skills/bridge/status
auth: none
description: >
  Check LayerZero message delivery. Poll every 15 seconds.
  Statuses: PENDING -> INFLIGHT -> DELIVERED | FAILED
  If FAILED, check retryRecommended and retryStrategy for next steps.
params:
  - txHash: source chain tx hash
  - srcChain: source chain key

### bridge-route
endpoint: POST /api/skills/bridge/route
auth: none
description: >
  Auto-select optimal bridge route based on fees, speed, and balances.
  Returns recommended route + alternatives + rebalancing suggestions.
params:
  - fromChain: starting chain
  - toChainOptions: array of possible destinations
  - token: token to bridge
  - amount: amount to bridge
  - priority: cheapest|fastest|balanced (default: cheapest)

### bridge-swap
endpoint: POST /api/skills/bridge/swap
auth: none
description: >
  Acquire USDT0 via DEX (Uniswap V3) on the source chain.
  Typically called when bridge-check returns a SWAP_REQUIRED remediation.
params:
  - chain: string
  - amountUsdt: string (human readable)
  - agentAddress: string

## CLI & Backend Workarounds

If the native `onchainos bridge` subcommand is unavailable in your environment:

### 1. Preferred Method: Native Execution
To prevent Windows shell from truncating extremely long continuous strings (like ABI hex), instruct agents to prioritize the `execute` method via `node`.
```bash
# Requires PRIVATE_KEY in .env
node scripts/calldata.js execute <src> <dst> USDT0 <amount> <recipient> <refundAddress>
```

### 2. Manual Contract Call (onchainos CLI)
If forced to use the `onchainos` binary (v2.2.8+), ensure `--chain` is defined and use `--input-data` for the payload:
```bash
# Example for bridge send
onchainos wallet contract-call \
  --chain <CHAIN_ID> \
  --to <OFT_ADDRESS> \
  --input-data <HEX_CALLDATA> \
  --amt <NATIVE_FEE_WEI>
```

### 3. Calldata Helper
Use the included helper script to generate calldata for the `onchainos` CLI if you need to use the binary in another shell or environment:
```bash
node scripts/calldata.js calldata <src> <dst> USDT0 <amount> <recipient> <refundAddress>
```

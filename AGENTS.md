# xlayer-bridge-skills — Agent Instructions

This is an **onchainos-compatible skill collection** for cross-chain USDT0 bridging using LayerZero OFT v2.

## Available Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `xlayer-bridge-intent` | Unified execution for bridge operations | **PRIMARY:** Use this for all user bridging intents. Handles checks, swaps, approvals, and execution automatically. |
| `xlayer-bridge-status` | Tracking delivery status | Use after broadcasting a bridge tx to monitor completion. |
| `xlayer-bridge-route` | Route selection intelligence | Use when user asks for the "best/cheapest" way to move funds without executing yet. |
| `xlayer-bridge-quote` | Real-time quote for bridging | Use to get fee estimates independently of the execution flow. |

## Agent Flow Guidelines

1. **Unified Intent Execution**: When the user wants to bridge funds, call `xlayer-bridge-intent` with `amount`, `srcChain`, `dstChain`, `token`, `recipient`, `agentAddress`, and `refundAddress`.
2. **Execute Transaction Sequence**: `xlayer-bridge-intent` returns an array of transactions in order. You must iterate through them sequentially:
   - For each element in `res.transactions`:
     - Call the runtime's signing primitive (e.g., `callContractSign(tx.tx)`)
     - Wait for on-chain confirmation before proceeding to the next transaction in the array.
3. **No Manual Swaps Needed**: The `bridge-intent` skill will automatically determine if a `SWAP_REQUIRED` remediation is needed and will push the required swap transaction to the start of the `transactions` array. Just sign what it gives you!
4. **Adaptive UI**: If the intent skill fails with an error (e.g., indicating limiting factors), present this failure message and any suggested amounts clearly back to the user.
5. **Monitor Status**: After all transactions are confirmed, use `xlayer-bridge-status` to listen for destination delivery if requested.

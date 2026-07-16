# Security Policy

## Key Management
This skill pack is designed for **Zero Private-Key Exposure**. 
- The server does not handle, store, or see private keys.
- All signing is performed by the agent's TEE runtime or local wallet through transaction objects.
- All tx objects are constructed using standard, verified libraries (ethers.js).

## Pre-Execution Guards
The `xlayer-bridge-check` skill acts as an intelligent firewall:
- Validates source and destination configurations.
- Checks real-time native and token balances.
- Ensures slippage protection by calculating `minAmountOut` on-chain.

## API Security
- Do not expose your `.env` file (contains private RPC URLs).
- Use reputable RPC providers for sensitive transactions.
- Always verify the `tx.to` address against the official USDT0 contract addresses in `src/config/chains.js`.

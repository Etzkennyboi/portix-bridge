/**
 * wallet.js — Ethers wallet management for the Live Bridge Demo
 *
 * This module encapsulates wallet creation from a private key and
 * the transaction signing flow that mirrors what an AI agent does:
 *   1. Create wallet from PK
 *   2. Connect to the correct chain RPC
 *   3. Sign and broadcast each tx object returned by /intent
 */
import { ethers } from 'ethers';

const RPC_MAP = {
  ethereum: 'https://eth.llamarpc.com',
  xlayer:   'https://rpc.xlayer.tech',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  polygon:  'https://polygon-rpc.com',
  mantle:   'https://rpc.mantle.xyz',
};

const CHAIN_ID_MAP = {
  ethereum: 1,
  xlayer:   196,
  arbitrum: 42161,
  optimism: 10,
  polygon:  137,
  mantle:   5000,
};

const CHAIN_LABELS = {
  ethereum: 'Ethereum',
  xlayer:   'X Layer',
  arbitrum: 'Arbitrum One',
  optimism: 'Optimism',
  polygon:  'Polygon PoS',
  mantle:   'Mantle',
};

const CHAIN_NATIVE = {
  ethereum: 'ETH',
  xlayer:   'OKB',
  arbitrum: 'ETH',
  optimism: 'ETH',
  polygon:  'MATIC',
  mantle:   'MNT',
};

/**
 * Create a connected wallet for a given chain
 */
export function createWallet(privateKey, chainKey) {
  const rpc = RPC_MAP[chainKey];
  if (!rpc) throw new Error(`Unknown chain: ${chainKey}`);
  const provider = new ethers.providers.JsonRpcProvider(rpc, CHAIN_ID_MAP[chainKey]);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Get wallet address from private key (no RPC needed)
 */
export function getAddress(privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    return null;
  }
}

/**
 * Validate a private key format
 */
export function isValidPrivateKey(pk) {
  if (!pk) return false;
  const cleaned = pk.startsWith('0x') ? pk : `0x${pk}`;
  return /^0x[0-9a-fA-F]{64}$/.test(cleaned);
}

/**
 * Sign and broadcast a single tx object returned by /intent
 * This is exactly what an AI agent's runtime.callContractSign() does.
 */
export async function signAndBroadcast(wallet, txObj) {
  const tx = await wallet.sendTransaction({
    to:       txObj.to,
    data:     txObj.data,
    value:    txObj.value || '0',
    gasLimit: txObj.gasLimit || 500000,
  });
  return tx;
}

/**
 * Wait for a transaction to be mined and return receipt
 */
export async function waitForConfirmation(tx, confirmations = 1) {
  const receipt = await tx.wait(confirmations);
  return receipt;
}

/**
 * Get native balance formatted
 */
export async function getNativeBalance(wallet) {
  const balance = await wallet.getBalance();
  return ethers.utils.formatEther(balance);
}

export {
  RPC_MAP,
  CHAIN_ID_MAP,
  CHAIN_LABELS,
  CHAIN_NATIVE,
  ethers,
};

/**
 * wallet.js — MetaMask wallet integration for the Live Bridge Demo
 * Supports chain switching, chain adding, and balances querying.
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

const CHAIN_HEX_IDS = {
  ethereum: '0x1',
  xlayer:   '0xc4',
  arbitrum: '0xa4b1',
  optimism: '0xa',
  polygon:  '0x89',
  mantle:   '0x1388',
};

// USDT0 token contracts on each chain
const USDT_ADDRESSES = {
  ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  xlayer:   '0x779Ded0c9e1022225f8E0630b35a9b54bE713736',
  arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  optimism: '0x01bFF41798a0BcF287b996046Ca68b395DbC1071',
  polygon:  '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  mantle:   '0x779Ded0c9e1022225f8E0630b35a9b54bE713736',
};

// Minimal ERC20 ABI to fetch balances
const ERC20_MIN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
];

/**
 * Check if MetaMask (or any injected provider) is available
 */
export function hasInjectedProvider() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Request MetaMask connection
 */
export async function connectMetaMask() {
  if (!hasInjectedProvider()) {
    throw new Error('MetaMask is not installed. Please install MetaMask to use Live Mode.');
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned from wallet connection.');
  }
  return {
    address: accounts[0],
    provider,
  };
}

/**
 * Get native gas token balance
 */
export async function getNativeBalance(provider, address) {
  const balance = await provider.getBalance(address);
  return ethers.utils.formatEther(balance);
}

/**
 * Get USDT0 balance on the current active chain
 */
export async function getUSDT0Balance(provider, address, chainKey) {
  try {
    const tokenAddress = USDT_ADDRESSES[chainKey];
    if (!tokenAddress) return '0.00';
    const contract = new ethers.Contract(tokenAddress, ERC20_MIN_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.utils.formatUnits(balance, 6); // USDT0 has 6 decimals
  } catch (err) {
    console.error('Error fetching USDT0 balance:', err);
    return '0.00';
  }
}

/**
 * Switch network to target chain, or add it if not configured in wallet
 */
export async function ensureNetwork(provider, chainKey) {
  if (!hasInjectedProvider()) return;
  const hexChainId = CHAIN_HEX_IDS[chainKey];
  const chainName = CHAIN_LABELS[chainKey];
  const nativeCurrency = {
    name: CHAIN_NATIVE[chainKey],
    symbol: CHAIN_NATIVE[chainKey],
    decimals: 18,
  };

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: hexChainId,
              chainName: chainName,
              rpcUrls: [RPC_MAP[chainKey]],
              nativeCurrency,
              blockExplorerUrls: [
                chainKey === 'xlayer' ? 'https://www.okx.com/web3/explorer/xlayer' :
                chainKey === 'arbitrum' ? 'https://arbiscan.io' :
                chainKey === 'optimism' ? 'https://optimistic.etherscan.io' :
                chainKey === 'polygon' ? 'https://polygonscan.com' :
                chainKey === 'mantle' ? 'https://explorer.mantle.xyz' :
                'https://etherscan.io'
              ]
            },
          ],
        });
      } catch (addError) {
        throw new Error(`Failed to add network ${chainName}: ${addError.message}`);
      }
    } else {
      throw new Error(`Failed to switch network to ${chainName}: ${switchError.message}`);
    }
  }
}

/**
 * Sign and broadcast transaction object returned by /intent using MetaMask Web3 provider
 */
export async function sendViaMM(provider, fromAddress, txObj) {
  const signer = provider.getSigner();
  const txRequest = {
    from:     fromAddress,
    to:       txObj.to,
    data:     txObj.data,
    value:    txObj.value ? ethers.BigNumber.from(txObj.value).toHexString() : '0x0',
  };

  // Ethers Web3Provider will handle gas limit estimation if not specified, 
  // or we can forward if specified
  if (txObj.gasLimit) {
    txRequest.gasLimit = ethers.BigNumber.from(txObj.gasLimit).toHexString();
  }

  const txResponse = await signer.sendTransaction(txRequest);
  return txResponse;
}

/**
 * Poll for confirmation of a transaction hash
 */
export async function waitForReceipt(provider, txHash) {
  let receipt = null;
  while (!receipt) {
    receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return receipt;
}

export {
  RPC_MAP,
  CHAIN_ID_MAP,
  CHAIN_LABELS,
  CHAIN_NATIVE,
};

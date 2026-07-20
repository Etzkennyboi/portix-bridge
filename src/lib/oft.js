const { ethers } = require('ethers');

const OFT_ABI = [
  'function quoteOFT(tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes))' +
  ' view returns (tuple(uint256,uint256), tuple(int256,string)[], tuple(uint256,uint256))',
  
  'function quoteSend(tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes), bool)' +
  ' view returns (tuple(uint256,uint256))',
  
  'function send(tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes),' +
  ' tuple(uint256,uint256), address)' +
  ' payable returns (tuple(bytes32,uint64,tuple(uint256,uint256)), tuple(uint256,uint256))',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const getProvider = (rpcUrl, chainId, fallbacks = []) => {
  return new ethers.providers.FallbackProvider(
    [rpcUrl, ...fallbacks].map((url, i) => ({
      provider: new ethers.providers.StaticJsonRpcProvider(
        url,
        {
          name: `chain-${chainId}`,
          chainId: chainId
        }
      ),
      priority: i + 1,
      stallTimeout: 3500,
      weight: 1,
    })),
    1 // quorum of 1 — first response wins
  );
};

const getOFTInterface = () => new ethers.utils.Interface(OFT_ABI);

const getERC20Interface = () => new ethers.utils.Interface(ERC20_ABI);

function addressToBytes32(address) {
  return ethers.utils.hexZeroPad(address, 32);
}

function buildSendParam(dstEid, recipient, amountWei, minAmountWei = 0) {
  return [
    dstEid,
    addressToBytes32(recipient),
    amountWei,
    minAmountWei,
    '0x', // extraOptions
    '0x', // composeMsg
    '0x', // oftCmd
  ];
}

module.exports = {
  OFT_ABI, ERC20_ABI,
  getProvider, getOFTInterface, getERC20Interface,
  addressToBytes32, buildSendParam
};

import { ethers } from 'ethers';
import config from '../config/index.js';
import { CONTRACT_ABI } from '../config/contractABI.js';

let provider = null;
let contract = null;

export function initializeBlockchain() {
  if (!config.rpcUrl || !config.contractAddress) {
    throw new Error('RPC_URL and CONTRACT_ADDRESS must be configured in .env');
  }

  provider = new ethers.JsonRpcProvider(config.rpcUrl);
  contract = new ethers.Contract(config.contractAddress, CONTRACT_ABI, provider);

  console.log('Blockchain connection initialized');
  return { provider, contract };
}

export function getProvider() {
  if (!provider) {
    initializeBlockchain();
  }
  return provider;
}

export function getContract() {
  if (!contract) {
    initializeBlockchain();
  }
  return contract;
}

export async function getCurrentBlock() {
  const provider = getProvider();
  return await provider.getBlockNumber();
}

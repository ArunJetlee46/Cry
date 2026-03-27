import { syncBlockchainData } from '../services/indexer.js';
import { initializeBlockchain } from '../services/blockchain.js';

async function main() {
  console.log('Starting blockchain data synchronization...');

  try {
    initializeBlockchain();
    await syncBlockchainData();
    console.log('Synchronization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Synchronization failed:', error);
    process.exit(1);
  }
}

main();

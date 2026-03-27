import { getPlatformStats } from '../services/database.js';
import { getCurrentBlock } from '../services/blockchain.js';
import { getLastSyncedBlock } from '../services/database.js';

export async function getStats(req, res) {
  try {
    const stats = await getPlatformStats();
    const currentBlock = await getCurrentBlock();
    const lastSyncedBlock = await getLastSyncedBlock();

    res.json({
      success: true,
      data: {
        ...stats,
        currentBlock,
        lastSyncedBlock,
        syncStatus: lastSyncedBlock === currentBlock ? 'up-to-date' : 'syncing',
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
}

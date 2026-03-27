import { getContract, getProvider } from './blockchain.js';
import {
  createOrUpdateCampaign,
  addContribution,
  createOrUpdateMilestone,
  saveEvent,
  getLastSyncedBlock,
  updateLastSyncedBlock,
} from './database.js';
import { ethers } from 'ethers';

export async function syncBlockchainData(fromBlock = null, toBlock = null) {
  console.log('Starting blockchain data sync...');

  const contract = getContract();
  const provider = getProvider();

  // Determine block range
  if (!fromBlock) {
    fromBlock = await getLastSyncedBlock();
  }

  if (!toBlock) {
    toBlock = await provider.getBlockNumber();
  }

  console.log(`Syncing from block ${fromBlock} to ${toBlock}`);

  // Fetch all campaign IDs
  const campaignIds = await contract.getAllCampaignIds();
  console.log(`Found ${campaignIds.length} campaigns`);

  // Sync each campaign's data
  for (const campaignId of campaignIds) {
    await syncCampaign(Number(campaignId));
  }

  // Index events
  await indexEvents(fromBlock, toBlock);

  // Update last synced block
  await updateLastSyncedBlock(toBlock);

  console.log('Blockchain data sync completed');
  return { fromBlock, toBlock, campaignsProcessed: campaignIds.length };
}

async function syncCampaign(campaignId) {
  const contract = getContract();

  try {
    const campaign = await contract.getCampaign(campaignId);

    const campaignData = {
      id: campaignId,
      creator: campaign.creator.toLowerCase(),
      title: campaign.title,
      description: campaign.description,
      imageUrl: campaign.imageUrl,
      goal: campaign.goal.toString(),
      deadline: Number(campaign.deadline),
      raisedAmount: campaign.raisedAmount.toString(),
      state: Number(campaign.state),
      milestoneCount: Number(campaign.milestoneCount),
    };

    await createOrUpdateCampaign(campaignData);

    // Sync milestones if any
    for (let i = 0; i < campaign.milestoneCount; i++) {
      await syncMilestone(campaignId, i);
    }

    console.log(`Synced campaign ${campaignId}: ${campaign.title}`);
  } catch (error) {
    console.error(`Error syncing campaign ${campaignId}:`, error.message);
  }
}

async function syncMilestone(campaignId, milestoneIndex) {
  const contract = getContract();

  try {
    const milestone = await contract.getMilestone(campaignId, milestoneIndex);

    const milestoneData = {
      campaignId,
      milestoneIndex,
      description: milestone.description,
      amount: milestone.amount.toString(),
      state: Number(milestone.state),
      yesVotes: Number(milestone.yesVotes),
      noVotes: Number(milestone.noVotes),
    };

    await createOrUpdateMilestone(milestoneData);
  } catch (error) {
    console.error(`Error syncing milestone ${campaignId}:${milestoneIndex}:`, error.message);
  }
}

async function indexEvents(fromBlock, toBlock) {
  const contract = getContract();
  const provider = getProvider();

  // Define events to index
  const events = [
    'CampaignCreated',
    'ContributionReceived',
    'CampaignStateChanged',
    'MilestoneAdded',
    'MilestoneVoted',
    'MilestoneFundsReleased',
    'RefundClaimed',
  ];

  for (const eventName of events) {
    try {
      const filter = contract.filters[eventName]();
      const logs = await contract.queryFilter(filter, fromBlock, toBlock);

      for (const log of logs) {
        const block = await provider.getBlock(log.blockNumber);

        // Parse event data
        const parsed = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        const eventData = {
          eventName,
          campaignId: parsed.args.campaignId ? Number(parsed.args.campaignId) : null,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          data: parsed.args,
          timestamp: block.timestamp,
        };

        await saveEvent(eventData);

        // Handle specific event types
        if (eventName === 'ContributionReceived') {
          await addContribution({
            campaignId: Number(parsed.args.campaignId),
            contributor: parsed.args.contributor.toLowerCase(),
            amount: parsed.args.amount.toString(),
            timestamp: block.timestamp,
            txHash: log.transactionHash,
          });
        }
      }

      console.log(`Indexed ${logs.length} ${eventName} events`);
    } catch (error) {
      console.error(`Error indexing ${eventName} events:`, error.message);
    }
  }
}

export async function startPeriodicSync(intervalMinutes = 5) {
  console.log(`Starting periodic sync every ${intervalMinutes} minutes`);

  // Run initial sync
  await syncBlockchainData();

  // Schedule periodic syncs
  setInterval(async () => {
    try {
      await syncBlockchainData();
    } catch (error) {
      console.error('Error in periodic sync:', error.message);
    }
  }, intervalMinutes * 60 * 1000);
}

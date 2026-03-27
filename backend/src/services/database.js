import { runQuery, getQuery, allQuery } from '../config/database.js';

export async function createOrUpdateCampaign(campaignData) {
  const {
    id,
    creator,
    title,
    description,
    imageUrl,
    goal,
    deadline,
    raisedAmount,
    state,
    milestoneCount,
  } = campaignData;

  const now = Math.floor(Date.now() / 1000);

  const sql = `
    INSERT INTO campaigns (id, creator, title, description, image_url, goal, deadline, raised_amount, state, milestone_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      raised_amount = excluded.raised_amount,
      state = excluded.state,
      milestone_count = excluded.milestone_count,
      updated_at = excluded.updated_at
  `;

  return runQuery(sql, [
    id,
    creator,
    title,
    description,
    imageUrl,
    goal,
    deadline,
    raisedAmount,
    state,
    milestoneCount,
    now,
    now,
  ]);
}

export async function getCampaignById(id) {
  const sql = 'SELECT * FROM campaigns WHERE id = ?';
  return getQuery(sql, [id]);
}

export async function getAllCampaigns(filters = {}) {
  const { page = 1, limit = 10, search, state, creator } = filters;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM campaigns WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (state !== undefined) {
    sql += ' AND state = ?';
    params.push(state);
  }

  if (creator) {
    sql += ' AND creator = ?';
    params.push(creator.toLowerCase());
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const campaigns = await allQuery(sql, params);

  // Get total count
  let countSql = 'SELECT COUNT(*) as total FROM campaigns WHERE 1=1';
  const countParams = [];

  if (search) {
    countSql += ' AND (title LIKE ? OR description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }

  if (state !== undefined) {
    countSql += ' AND state = ?';
    countParams.push(state);
  }

  if (creator) {
    countSql += ' AND creator = ?';
    countParams.push(creator.toLowerCase());
  }

  const countResult = await getQuery(countSql, countParams);

  return {
    campaigns,
    pagination: {
      page,
      limit,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / limit),
    },
  };
}

export async function addContribution(contributionData) {
  const { campaignId, contributor, amount, timestamp, txHash } = contributionData;

  const sql = `
    INSERT INTO contributions (campaign_id, contributor, amount, timestamp, tx_hash)
    VALUES (?, ?, ?, ?, ?)
  `;

  return runQuery(sql, [campaignId, contributor, amount, timestamp, txHash]);
}

export async function getContributionsByCampaign(campaignId) {
  const sql = `
    SELECT * FROM contributions
    WHERE campaign_id = ?
    ORDER BY timestamp DESC
  `;
  return allQuery(sql, [campaignId]);
}

export async function getContributionsByUser(address) {
  const sql = `
    SELECT c.*, cam.title as campaign_title, cam.state as campaign_state
    FROM contributions c
    JOIN campaigns cam ON c.campaign_id = cam.id
    WHERE c.contributor = ?
    ORDER BY c.timestamp DESC
  `;
  return allQuery(sql, [address.toLowerCase()]);
}

export async function createOrUpdateMilestone(milestoneData) {
  const { campaignId, milestoneIndex, description, amount, state, yesVotes, noVotes } = milestoneData;

  const sql = `
    INSERT INTO milestones (campaign_id, milestone_index, description, amount, state, yes_votes, no_votes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(campaign_id, milestone_index) DO UPDATE SET
      state = excluded.state,
      yes_votes = excluded.yes_votes,
      no_votes = excluded.no_votes
  `;

  return runQuery(sql, [campaignId, milestoneIndex, description, amount, state, yesVotes, noVotes]);
}

export async function getMilestonesByCampaign(campaignId) {
  const sql = `
    SELECT * FROM milestones
    WHERE campaign_id = ?
    ORDER BY milestone_index ASC
  `;
  return allQuery(sql, [campaignId]);
}

export async function saveEvent(eventData) {
  const { eventName, campaignId, blockNumber, txHash, data, timestamp } = eventData;

  const sql = `
    INSERT OR IGNORE INTO events (event_name, campaign_id, block_number, tx_hash, data, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  return runQuery(sql, [eventName, campaignId, blockNumber, txHash, JSON.stringify(data), timestamp]);
}

export async function getLastSyncedBlock() {
  const sql = 'SELECT last_synced_block FROM sync_status WHERE id = 1';
  const result = await getQuery(sql);
  return result ? result.last_synced_block : 0;
}

export async function updateLastSyncedBlock(blockNumber) {
  const now = Math.floor(Date.now() / 1000);
  const sql = 'UPDATE sync_status SET last_synced_block = ?, last_synced_at = ? WHERE id = 1';
  return runQuery(sql, [blockNumber, now]);
}

export async function getUserProfile(address) {
  const campaignsSql = `
    SELECT COUNT(*) as count, COALESCE(SUM(CAST(raised_amount AS REAL)), 0) as total_raised
    FROM campaigns
    WHERE creator = ?
  `;
  const campaignsResult = await getQuery(campaignsSql, [address.toLowerCase()]);

  const contributionsSql = `
    SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS REAL)), 0) as total_contributed
    FROM contributions
    WHERE contributor = ?
  `;
  const contributionsResult = await getQuery(contributionsSql, [address.toLowerCase()]);

  return {
    address,
    campaignsCreated: campaignsResult.count,
    totalRaised: campaignsResult.total_raised.toString(),
    contributionsCount: contributionsResult.count,
    totalContributed: contributionsResult.total_contributed.toString(),
  };
}

export async function getPlatformStats() {
  const campaignStats = await getQuery(`
    SELECT
      COUNT(*) as total_campaigns,
      SUM(CASE WHEN state = 0 THEN 1 ELSE 0 END) as active_campaigns,
      SUM(CASE WHEN state = 1 THEN 1 ELSE 0 END) as successful_campaigns,
      COALESCE(SUM(CAST(raised_amount AS REAL)), 0) as total_raised
    FROM campaigns
  `);

  const contributionStats = await getQuery(`
    SELECT
      COUNT(*) as total_contributions,
      COUNT(DISTINCT contributor) as unique_contributors
    FROM contributions
  `);

  return {
    ...campaignStats,
    ...contributionStats,
  };
}

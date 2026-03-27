import {
  getCampaignById,
  getAllCampaigns,
  getContributionsByCampaign,
  getMilestonesByCampaign,
} from '../services/database.js';
import { CAMPAIGN_STATES, MILESTONE_STATES } from '../config/contractABI.js';

export async function listCampaigns(req, res) {
  try {
    const { page, limit, search, state, creator } = req.query;

    const filters = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      state: state !== undefined ? parseInt(state) : undefined,
      creator,
    };

    const result = await getAllCampaigns(filters);

    // Format campaigns with state labels
    const formattedCampaigns = result.campaigns.map((campaign) => ({
      ...campaign,
      stateLabel: CAMPAIGN_STATES[campaign.state],
    }));

    res.json({
      success: true,
      data: formattedCampaigns,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.message,
    });
  }
}

export async function getCampaign(req, res) {
  try {
    const { id } = req.params;
    const campaign = await getCampaignById(parseInt(id));

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...campaign,
        stateLabel: CAMPAIGN_STATES[campaign.state],
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
      message: error.message,
    });
  }
}

export async function getCampaignMilestones(req, res) {
  try {
    const { id } = req.params;
    const milestones = await getMilestonesByCampaign(parseInt(id));

    const formattedMilestones = milestones.map((milestone) => ({
      ...milestone,
      stateLabel: MILESTONE_STATES[milestone.state],
    }));

    res.json({
      success: true,
      data: formattedMilestones,
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milestones',
      message: error.message,
    });
  }
}

export async function getCampaignContributions(req, res) {
  try {
    const { id } = req.params;
    const contributions = await getContributionsByCampaign(parseInt(id));

    res.json({
      success: true,
      data: contributions,
    });
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contributions',
      message: error.message,
    });
  }
}

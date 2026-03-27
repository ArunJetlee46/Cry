import {
  getUserProfile,
  getAllCampaigns,
  getContributionsByUser,
} from '../services/database.js';

export async function getUserCampaigns(req, res) {
  try {
    const { address } = req.params;

    const result = await getAllCampaigns({
      creator: address,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    });

    res.json({
      success: true,
      data: result.campaigns,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user campaigns',
      message: error.message,
    });
  }
}

export async function getUserContributions(req, res) {
  try {
    const { address } = req.params;
    const contributions = await getContributionsByUser(address);

    res.json({
      success: true,
      data: contributions,
    });
  } catch (error) {
    console.error('Error fetching user contributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user contributions',
      message: error.message,
    });
  }
}

export async function getProfile(req, res) {
  try {
    const { address } = req.params;
    const profile = await getUserProfile(address);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error.message,
    });
  }
}

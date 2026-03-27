export const CONTRACT_ABI = [
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title, uint256 goal, uint256 deadline)",
  "event ContributionReceived(uint256 indexed campaignId, address indexed contributor, uint256 amount)",
  "event CampaignStateChanged(uint256 indexed campaignId, uint8 newState)",
  "event MilestoneAdded(uint256 indexed campaignId, uint256 milestoneIndex, string description, uint256 amount)",
  "event MilestoneVoted(uint256 indexed campaignId, uint256 milestoneIndex, address indexed voter, bool approved)",
  "event MilestoneFundsReleased(uint256 indexed campaignId, uint256 milestoneIndex, uint256 amount)",
  "event RefundClaimed(uint256 indexed campaignId, address indexed contributor, uint256 amount)",
  "function getCampaign(uint256 campaignId) view returns (tuple(address creator, string title, string description, string imageUrl, uint256 goal, uint256 deadline, uint256 raisedAmount, uint8 state, uint256 milestoneCount))",
  "function getAllCampaignIds() view returns (uint256[])",
  "function getMilestone(uint256 campaignId, uint256 milestoneIndex) view returns (tuple(string description, uint256 amount, uint8 state, uint256 yesVotes, uint256 noVotes))",
  "function contributions(uint256 campaignId, address contributor) view returns (uint256)",
  "function totalCampaigns() view returns (uint256)"
];

export const CAMPAIGN_STATES = {
  0: 'Active',
  1: 'Successful',
  2: 'Failed',
  3: 'Refunded'
};

export const MILESTONE_STATES = {
  0: 'Pending',
  1: 'Approved',
  2: 'Released',
  3: 'Rejected'
};

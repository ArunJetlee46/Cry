// Contract address (update after deployment)
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Minimal ABI for the CrowdFunding contract
export const CONTRACT_ABI = [
  // Campaign creation
  "function createCampaign(string title, string description, string imageUrl, uint256 goal, uint256 durationDays) external returns (uint256)",

  // Contributions
  "function contribute(uint256 campaignId) external payable",

  // Milestones
  "function addMilestone(uint256 campaignId, string description, uint256 amount) external",
  "function voteMilestone(uint256 campaignId, uint256 milestoneIndex, bool approve) external",
  "function releaseMilestoneFunds(uint256 campaignId, uint256 milestoneIndex) external",

  // Campaign state
  "function markCampaignFailed(uint256 campaignId) external",
  "function claimRefund(uint256 campaignId) external",

  // Views
  "function campaignCount() external view returns (uint256)",
  "function getCampaign(uint256 campaignId) external view returns (uint256 id, address creator, string title, string description, string imageUrl, uint256 goal, uint256 deadline, uint256 amountRaised, uint256 milestoneCount, uint8 state)",
  "function getMilestone(uint256 campaignId, uint256 milestoneIndex) external view returns (string description, uint256 amount, uint8 state, uint256 approvalCount, uint256 rejectionCount)",
  "function hasVotedOnMilestone(uint256 campaignId, uint256 milestoneIndex, address voter) external view returns (bool)",
  "function getContributorCount(uint256 campaignId) external view returns (uint256)",
  "function contributions(uint256 campaignId, address contributor) external view returns (uint256)",
  "function getAllCampaignIds() external view returns (uint256[])",

  // Events
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title, uint256 goal, uint256 deadline)",
  "event ContributionMade(uint256 indexed campaignId, address indexed contributor, uint256 amount, uint256 totalRaised)",
  "event MilestoneCreated(uint256 indexed campaignId, uint256 indexed milestoneIndex, string description, uint256 amount)",
  "event MilestoneVoted(uint256 indexed campaignId, uint256 indexed milestoneIndex, address indexed voter, bool approved)",
  "event MilestoneReleased(uint256 indexed campaignId, uint256 indexed milestoneIndex, uint256 amount)",
  "event MilestoneRejected(uint256 indexed campaignId, uint256 indexed milestoneIndex)",
  "event RefundIssued(uint256 indexed campaignId, address indexed contributor, uint256 amount)",
  "event CampaignStateChanged(uint256 indexed campaignId, uint8 newState)",
];

export const CAMPAIGN_STATES = ["Active", "Successful", "Failed", "Refunded"];
export const MILESTONE_STATES = ["Pending", "Approved", "Released", "Rejected"];

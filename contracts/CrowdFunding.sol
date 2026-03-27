// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CrowdFunding
 * @notice Decentralized crowdfunding platform with milestone-based fund release
 *         and refund mechanism for failed campaigns.
 */
contract CrowdFunding {
    // ─── Enumerations ──────────────────────────────────────────────────────────

    enum CampaignState {
        Active,
        Successful,
        Failed,
        Refunded
    }

    enum MilestoneState {
        Pending,
        Approved,
        Released,
        Rejected
    }

    // ─── Structs ───────────────────────────────────────────────────────────────

    struct Milestone {
        string description;
        uint256 amount;       // ETH to release when milestone is approved
        MilestoneState state;
        uint256 approvalCount;
        uint256 rejectionCount;
        mapping(address => bool) hasVoted;
    }

    struct Campaign {
        uint256 id;
        address payable creator;
        string title;
        string description;
        string imageUrl;
        uint256 goal;         // funding goal in wei
        uint256 deadline;     // Unix timestamp
        uint256 amountRaised;
        uint256 milestoneCount;
        CampaignState state;
    }

    // ─── State Variables ───────────────────────────────────────────────────────

    uint256 public campaignCount;

    // campaignId => Campaign
    mapping(uint256 => Campaign) public campaigns;

    // campaignId => milestoneIndex => Milestone
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

    // campaignId => contributor => amount contributed
    mapping(uint256 => mapping(address => uint256)) public contributions;

    // campaignId => list of contributors (for iteration during refund)
    mapping(uint256 => address[]) private contributors;

    // ─── Events ────────────────────────────────────────────────────────────────

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );

    event ContributionMade(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount,
        uint256 totalRaised
    );

    event MilestoneCreated(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        string description,
        uint256 amount
    );

    event MilestoneVoted(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed voter,
        bool approved
    );

    event MilestoneReleased(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        uint256 amount
    );

    event MilestoneRejected(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex
    );

    event RefundIssued(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event CampaignStateChanged(
        uint256 indexed campaignId,
        CampaignState newState
    );

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier campaignExists(uint256 campaignId) {
        require(campaignId > 0 && campaignId <= campaignCount, "Campaign does not exist");
        _;
    }

    modifier onlyCreator(uint256 campaignId) {
        require(msg.sender == campaigns[campaignId].creator, "Only campaign creator");
        _;
    }

    modifier onlyActive(uint256 campaignId) {
        require(campaigns[campaignId].state == CampaignState.Active, "Campaign not active");
        _;
    }

    // ─── Campaign Management ───────────────────────────────────────────────────

    /**
     * @notice Create a new crowdfunding campaign.
     * @param title       Human-readable title of the campaign.
     * @param description Detailed description.
     * @param imageUrl    Optional image URL for the campaign card.
     * @param goal        Funding goal in wei.
     * @param durationDays Number of days the campaign will be active.
     */
    function createCampaign(
        string calldata title,
        string calldata description,
        string calldata imageUrl,
        uint256 goal,
        uint256 durationDays
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(goal > 0, "Goal must be > 0");
        require(durationDays > 0 && durationDays <= 365, "Duration: 1-365 days");

        campaignCount++;
        uint256 id = campaignCount;

        Campaign storage c = campaigns[id];
        c.id = id;
        c.creator = payable(msg.sender);
        c.title = title;
        c.description = description;
        c.imageUrl = imageUrl;
        c.goal = goal;
        c.deadline = block.timestamp + durationDays * 1 days;
        c.amountRaised = 0;
        c.milestoneCount = 0;
        c.state = CampaignState.Active;

        emit CampaignCreated(id, msg.sender, title, goal, c.deadline);
        return id;
    }

    // ─── Contributions ─────────────────────────────────────────────────────────

    /**
     * @notice Contribute ETH to an active campaign.
     */
    function contribute(uint256 campaignId)
        external
        payable
        campaignExists(campaignId)
        onlyActive(campaignId)
    {
        require(block.timestamp < campaigns[campaignId].deadline, "Campaign deadline passed");
        require(msg.value > 0, "Contribution must be > 0");

        Campaign storage c = campaigns[campaignId];

        if (contributions[campaignId][msg.sender] == 0) {
            contributors[campaignId].push(msg.sender);
        }
        contributions[campaignId][msg.sender] += msg.value;
        c.amountRaised += msg.value;

        emit ContributionMade(campaignId, msg.sender, msg.value, c.amountRaised);

        // Transition to Successful if goal reached
        if (c.amountRaised >= c.goal) {
            c.state = CampaignState.Successful;
            emit CampaignStateChanged(campaignId, CampaignState.Successful);
        }
    }

    // ─── Milestone Management ──────────────────────────────────────────────────

    /**
     * @notice Add a milestone to a campaign (creator only, campaign must be successful).
     * @param campaignId      The campaign id.
     * @param description     What this milestone achieves.
     * @param amount          ETH (in wei) to release when milestone is approved.
     */
    function addMilestone(
        uint256 campaignId,
        string calldata description,
        uint256 amount
    )
        external
        campaignExists(campaignId)
        onlyCreator(campaignId)
    {
        Campaign storage c = campaigns[campaignId];
        require(
            c.state == CampaignState.Successful,
            "Campaign must be successful to add milestones"
        );
        require(bytes(description).length > 0, "Description required");
        require(amount > 0 && amount <= address(this).balance, "Invalid milestone amount");

        uint256 idx = c.milestoneCount;
        Milestone storage m = milestones[campaignId][idx];
        m.description = description;
        m.amount = amount;
        m.state = MilestoneState.Pending;
        m.approvalCount = 0;
        m.rejectionCount = 0;

        c.milestoneCount++;

        emit MilestoneCreated(campaignId, idx, description, amount);
    }

    /**
     * @notice Vote on a pending milestone (contributors only).
     * @param campaignId      The campaign id.
     * @param milestoneIndex  The milestone index.
     * @param approve         true = approve, false = reject.
     */
    function voteMilestone(
        uint256 campaignId,
        uint256 milestoneIndex,
        bool approve
    )
        external
        campaignExists(campaignId)
    {
        require(contributions[campaignId][msg.sender] > 0, "Must be a contributor");
        require(
            milestoneIndex < campaigns[campaignId].milestoneCount,
            "Milestone does not exist"
        );

        Milestone storage m = milestones[campaignId][milestoneIndex];
        require(m.state == MilestoneState.Pending, "Milestone not pending");
        require(!m.hasVoted[msg.sender], "Already voted");

        m.hasVoted[msg.sender] = true;

        if (approve) {
            m.approvalCount++;
        } else {
            m.rejectionCount++;
        }

        emit MilestoneVoted(campaignId, milestoneIndex, msg.sender, approve);

        uint256 totalContributors = contributors[campaignId].length;
        uint256 majority = totalContributors / 2 + 1;

        if (m.approvalCount >= majority) {
            m.state = MilestoneState.Approved;
        } else if (m.rejectionCount >= majority) {
            m.state = MilestoneState.Rejected;
            emit MilestoneRejected(campaignId, milestoneIndex);
        }
    }

    /**
     * @notice Release funds for an approved milestone (creator only).
     */
    function releaseMilestoneFunds(uint256 campaignId, uint256 milestoneIndex)
        external
        campaignExists(campaignId)
        onlyCreator(campaignId)
    {
        require(
            milestoneIndex < campaigns[campaignId].milestoneCount,
            "Milestone does not exist"
        );

        Milestone storage m = milestones[campaignId][milestoneIndex];
        require(m.state == MilestoneState.Approved, "Milestone not approved");
        require(address(this).balance >= m.amount, "Insufficient contract balance");

        m.state = MilestoneState.Released;
        uint256 releaseAmount = m.amount;

        (bool success, ) = campaigns[campaignId].creator.call{value: releaseAmount}("");
        require(success, "Transfer failed");
        emit MilestoneReleased(campaignId, milestoneIndex, releaseAmount);
    }

    // ─── Campaign State & Refunds ──────────────────────────────────────────────

    /**
     * @notice Mark a campaign as failed once its deadline has passed without
     *         reaching the goal. Anyone can call this to trigger state change.
     */
    function markCampaignFailed(uint256 campaignId)
        external
        campaignExists(campaignId)
        onlyActive(campaignId)
    {
        Campaign storage c = campaigns[campaignId];
        require(block.timestamp >= c.deadline, "Deadline not reached");
        require(c.amountRaised < c.goal, "Goal was reached");

        c.state = CampaignState.Failed;
        emit CampaignStateChanged(campaignId, CampaignState.Failed);
    }

    /**
     * @notice Claim a refund for a failed campaign.
     */
    function claimRefund(uint256 campaignId)
        external
        campaignExists(campaignId)
    {
        Campaign storage c = campaigns[campaignId];
        require(c.state == CampaignState.Failed, "Campaign not failed");

        uint256 amount = contributions[campaignId][msg.sender];
        require(amount > 0, "No contribution to refund");

        contributions[campaignId][msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");

        emit RefundIssued(campaignId, msg.sender, amount);
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    /**
     * @notice Get high-level campaign info (no milestones).
     */
    function getCampaign(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (
            uint256 id,
            address creator,
            string memory title,
            string memory description,
            string memory imageUrl,
            uint256 goal,
            uint256 deadline,
            uint256 amountRaised,
            uint256 milestoneCount,
            CampaignState state
        )
    {
        Campaign storage c = campaigns[campaignId];
        return (
            c.id,
            c.creator,
            c.title,
            c.description,
            c.imageUrl,
            c.goal,
            c.deadline,
            c.amountRaised,
            c.milestoneCount,
            c.state
        );
    }

    /**
     * @notice Get info for a specific milestone.
     */
    function getMilestone(uint256 campaignId, uint256 milestoneIndex)
        external
        view
        campaignExists(campaignId)
        returns (
            string memory description,
            uint256 amount,
            MilestoneState state,
            uint256 approvalCount,
            uint256 rejectionCount
        )
    {
        require(
            milestoneIndex < campaigns[campaignId].milestoneCount,
            "Milestone does not exist"
        );
        Milestone storage m = milestones[campaignId][milestoneIndex];
        return (
            m.description,
            m.amount,
            m.state,
            m.approvalCount,
            m.rejectionCount
        );
    }

    /**
     * @notice Check whether a specific address has voted on a milestone.
     */
    function hasVotedOnMilestone(
        uint256 campaignId,
        uint256 milestoneIndex,
        address voter
    ) external view campaignExists(campaignId) returns (bool) {
        return milestones[campaignId][milestoneIndex].hasVoted[voter];
    }

    /**
     * @notice Get total number of contributors for a campaign.
     */
    function getContributorCount(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (uint256)
    {
        return contributors[campaignId].length;
    }

    /**
     * @notice Get a contributor's address by index (for enumeration).
     */
    function getContributor(uint256 campaignId, uint256 index)
        external
        view
        campaignExists(campaignId)
        returns (address)
    {
        require(index < contributors[campaignId].length, "Index out of bounds");
        return contributors[campaignId][index];
    }

    /**
     * @notice Get all campaign IDs — useful for front-end listing.
     *         Returns an array from 1..campaignCount.
     */
    function getAllCampaignIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](campaignCount);
        for (uint256 i = 0; i < campaignCount; i++) {
            ids[i] = i + 1;
        }
        return ids;
    }
}

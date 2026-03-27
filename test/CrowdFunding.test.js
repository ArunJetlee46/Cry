const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdFunding", function () {
  let crowdFunding;
  let owner, creator, contributor1, contributor2, other;

  const GOAL = ethers.parseEther("10"); // 10 ETH
  const DURATION_DAYS = 30;

  beforeEach(async function () {
    [owner, creator, contributor1, contributor2, other] =
      await ethers.getSigners();

    const CrowdFunding = await ethers.getContractFactory("CrowdFunding");
    crowdFunding = await CrowdFunding.deploy();
    await crowdFunding.waitForDeployment();
  });

  // ─── Campaign Creation ────────────────────────────────────────────────────

  describe("createCampaign", function () {
    it("creates a campaign and emits CampaignCreated event", async function () {
      await expect(
        crowdFunding
          .connect(creator)
          .createCampaign("Test", "Desc", "https://img.example.com", GOAL, DURATION_DAYS)
      )
        .to.emit(crowdFunding, "CampaignCreated")
        .withArgs(
          1n,
          creator.address,
          "Test",
          GOAL,
          (deadline) => deadline > 0n
        );

      expect(await crowdFunding.campaignCount()).to.equal(1n);
    });

    it("increments campaign count on each creation", async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("C1", "D1", "", GOAL, DURATION_DAYS);
      await crowdFunding
        .connect(creator)
        .createCampaign("C2", "D2", "", GOAL, DURATION_DAYS);
      expect(await crowdFunding.campaignCount()).to.equal(2n);
    });

    it("reverts if title is empty", async function () {
      await expect(
        crowdFunding.connect(creator).createCampaign("", "Desc", "", GOAL, DURATION_DAYS)
      ).to.be.revertedWith("Title required");
    });

    it("reverts if goal is 0", async function () {
      await expect(
        crowdFunding.connect(creator).createCampaign("T", "D", "", 0n, DURATION_DAYS)
      ).to.be.revertedWith("Goal must be > 0");
    });

    it("reverts if duration is 0", async function () {
      await expect(
        crowdFunding.connect(creator).createCampaign("T", "D", "", GOAL, 0)
      ).to.be.revertedWith("Duration: 1-365 days");
    });

    it("reverts if duration > 365", async function () {
      await expect(
        crowdFunding.connect(creator).createCampaign("T", "D", "", GOAL, 366)
      ).to.be.revertedWith("Duration: 1-365 days");
    });
  });

  // ─── Contributions ────────────────────────────────────────────────────────

  describe("contribute", function () {
    let campaignId;

    beforeEach(async function () {
      const tx = await crowdFunding
        .connect(creator)
        .createCampaign("Fund", "Desc", "", GOAL, DURATION_DAYS);
      const receipt = await tx.wait();
      campaignId = 1n;
    });

    it("accepts contributions and emits ContributionMade", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        crowdFunding.connect(contributor1).contribute(campaignId, { value: amount })
      )
        .to.emit(crowdFunding, "ContributionMade")
        .withArgs(campaignId, contributor1.address, amount, amount);
    });

    it("tracks contributions per contributor", async function () {
      const amount = ethers.parseEther("2");
      await crowdFunding
        .connect(contributor1)
        .contribute(campaignId, { value: amount });
      expect(
        await crowdFunding.contributions(campaignId, contributor1.address)
      ).to.equal(amount);
    });

    it("marks campaign Successful when goal is reached", async function () {
      await crowdFunding
        .connect(contributor1)
        .contribute(campaignId, { value: GOAL });

      const [, , , , , , , , , state] = await crowdFunding.getCampaign(campaignId);
      expect(state).to.equal(1n); // CampaignState.Successful
    });

    it("reverts for non-existent campaign", async function () {
      await expect(
        crowdFunding.connect(contributor1).contribute(99n, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Campaign does not exist");
    });

    it("reverts when value is 0", async function () {
      await expect(
        crowdFunding.connect(contributor1).contribute(campaignId, { value: 0 })
      ).to.be.revertedWith("Contribution must be > 0");
    });

    it("reverts after campaign deadline", async function () {
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(
        crowdFunding
          .connect(contributor1)
          .contribute(campaignId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Campaign deadline passed");
    });
  });

  // ─── Milestones ───────────────────────────────────────────────────────────

  describe("addMilestone", function () {
    let campaignId;

    beforeEach(async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("Fund", "Desc", "", GOAL, DURATION_DAYS);
      campaignId = 1n;
      // Fund the campaign to goal so it becomes Successful
      await crowdFunding
        .connect(contributor1)
        .contribute(campaignId, { value: GOAL });
    });

    it("allows creator to add a milestone on a successful campaign", async function () {
      const milestoneAmount = ethers.parseEther("2");
      await expect(
        crowdFunding
          .connect(creator)
          .addMilestone(campaignId, "Phase 1", milestoneAmount)
      )
        .to.emit(crowdFunding, "MilestoneCreated")
        .withArgs(campaignId, 0n, "Phase 1", milestoneAmount);
    });

    it("reverts when called by non-creator", async function () {
      await expect(
        crowdFunding
          .connect(other)
          .addMilestone(campaignId, "Phase 1", ethers.parseEther("1"))
      ).to.be.revertedWith("Only campaign creator");
    });

    it("reverts if campaign not successful", async function () {
      // Create a second campaign that hasn't been funded
      await crowdFunding
        .connect(creator)
        .createCampaign("Unfunded", "Desc", "", GOAL, DURATION_DAYS);
      await expect(
        crowdFunding
          .connect(creator)
          .addMilestone(2n, "Phase 1", ethers.parseEther("1"))
      ).to.be.revertedWith("Campaign must be successful to add milestones");
    });
  });

  describe("voteMilestone and releaseMilestoneFunds", function () {
    let campaignId;
    const milestoneAmount = ethers.parseEther("3");

    beforeEach(async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("Fund", "Desc", "", GOAL, DURATION_DAYS);
      campaignId = 1n;

      // Both contributors fund equally (5 ETH each = 10 ETH total = goal)
      await crowdFunding
        .connect(contributor1)
        .contribute(campaignId, { value: ethers.parseEther("5") });
      await crowdFunding
        .connect(contributor2)
        .contribute(campaignId, { value: ethers.parseEther("5") });

      // Creator adds milestone
      await crowdFunding
        .connect(creator)
        .addMilestone(campaignId, "Phase 1", milestoneAmount);
    });

    it("allows a contributor to vote on a milestone", async function () {
      await expect(
        crowdFunding.connect(contributor1).voteMilestone(campaignId, 0n, true)
      )
        .to.emit(crowdFunding, "MilestoneVoted")
        .withArgs(campaignId, 0n, contributor1.address, true);
    });

    it("reverts if non-contributor tries to vote", async function () {
      await expect(
        crowdFunding.connect(other).voteMilestone(campaignId, 0n, true)
      ).to.be.revertedWith("Must be a contributor");
    });

    it("reverts if voter tries to vote twice", async function () {
      await crowdFunding
        .connect(contributor1)
        .voteMilestone(campaignId, 0n, true);
      await expect(
        crowdFunding.connect(contributor1).voteMilestone(campaignId, 0n, true)
      ).to.be.revertedWith("Already voted");
    });

    it("approves milestone when majority approves", async function () {
      // 2 contributors, majority = 2
      await crowdFunding
        .connect(contributor1)
        .voteMilestone(campaignId, 0n, true);
      await crowdFunding
        .connect(contributor2)
        .voteMilestone(campaignId, 0n, true);

      const [, , state] = await crowdFunding.getMilestone(campaignId, 0n);
      expect(state).to.equal(1n); // MilestoneState.Approved
    });

    it("rejects milestone when majority rejects", async function () {
      await crowdFunding
        .connect(contributor1)
        .voteMilestone(campaignId, 0n, false);
      await expect(
        crowdFunding
          .connect(contributor2)
          .voteMilestone(campaignId, 0n, false)
      ).to.emit(crowdFunding, "MilestoneRejected");

      const [, , state] = await crowdFunding.getMilestone(campaignId, 0n);
      expect(state).to.equal(3n); // MilestoneState.Rejected
    });

    it("releases funds to creator after milestone approval", async function () {
      await crowdFunding
        .connect(contributor1)
        .voteMilestone(campaignId, 0n, true);
      await crowdFunding
        .connect(contributor2)
        .voteMilestone(campaignId, 0n, true);

      const creatorBefore = await ethers.provider.getBalance(creator.address);

      await expect(
        crowdFunding.connect(creator).releaseMilestoneFunds(campaignId, 0n)
      )
        .to.emit(crowdFunding, "MilestoneReleased")
        .withArgs(campaignId, 0n, milestoneAmount);

      const creatorAfter = await ethers.provider.getBalance(creator.address);
      expect(creatorAfter).to.be.gt(creatorBefore);
    });

    it("reverts release when milestone not approved", async function () {
      await expect(
        crowdFunding.connect(creator).releaseMilestoneFunds(campaignId, 0n)
      ).to.be.revertedWith("Milestone not approved");
    });
  });

  // ─── Refunds ─────────────────────────────────────────────────────────────

  describe("markCampaignFailed and claimRefund", function () {
    let campaignId;
    const contribution = ethers.parseEther("3");

    beforeEach(async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("Fund", "Desc", "", GOAL, DURATION_DAYS);
      campaignId = 1n;
      await crowdFunding
        .connect(contributor1)
        .contribute(campaignId, { value: contribution });
    });

    it("marks campaign failed after deadline if goal not reached", async function () {
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(crowdFunding.connect(other).markCampaignFailed(campaignId))
        .to.emit(crowdFunding, "CampaignStateChanged")
        .withArgs(campaignId, 2n); // CampaignState.Failed
    });

    it("allows contributor to claim refund on failed campaign", async function () {
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await crowdFunding.connect(other).markCampaignFailed(campaignId);

      const balanceBefore = await ethers.provider.getBalance(contributor1.address);
      await expect(
        crowdFunding.connect(contributor1).claimRefund(campaignId)
      )
        .to.emit(crowdFunding, "RefundIssued")
        .withArgs(campaignId, contributor1.address, contribution);

      const balanceAfter = await ethers.provider.getBalance(contributor1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("reverts refund claim when campaign is not failed", async function () {
      await expect(
        crowdFunding.connect(contributor1).claimRefund(campaignId)
      ).to.be.revertedWith("Campaign not failed");
    });

    it("reverts double refund claim", async function () {
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await crowdFunding.connect(other).markCampaignFailed(campaignId);
      await crowdFunding.connect(contributor1).claimRefund(campaignId);
      await expect(
        crowdFunding.connect(contributor1).claimRefund(campaignId)
      ).to.be.revertedWith("No contribution to refund");
    });

    it("reverts markCampaignFailed before deadline", async function () {
      await expect(
        crowdFunding.connect(other).markCampaignFailed(campaignId)
      ).to.be.revertedWith("Deadline not reached");
    });
  });

  // ─── View Functions ───────────────────────────────────────────────────────

  describe("getCampaign", function () {
    it("returns correct campaign info", async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("My Campaign", "Description", "https://img.png", GOAL, DURATION_DAYS);

      const [id, addr, title, desc, imgUrl, goal, , amountRaised, milestoneCount, state] =
        await crowdFunding.getCampaign(1n);

      expect(id).to.equal(1n);
      expect(addr).to.equal(creator.address);
      expect(title).to.equal("My Campaign");
      expect(desc).to.equal("Description");
      expect(imgUrl).to.equal("https://img.png");
      expect(goal).to.equal(GOAL);
      expect(amountRaised).to.equal(0n);
      expect(milestoneCount).to.equal(0n);
      expect(state).to.equal(0n); // Active
    });

    it("reverts for non-existent campaign", async function () {
      await expect(crowdFunding.getCampaign(999n)).to.be.revertedWith(
        "Campaign does not exist"
      );
    });
  });

  describe("getAllCampaignIds", function () {
    it("returns all campaign ids", async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("C1", "D", "", GOAL, DURATION_DAYS);
      await crowdFunding
        .connect(creator)
        .createCampaign("C2", "D", "", GOAL, DURATION_DAYS);

      const ids = await crowdFunding.getAllCampaignIds();
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(1n);
      expect(ids[1]).to.equal(2n);
    });
  });

  describe("getContributorCount and getContributor", function () {
    it("tracks contributors correctly", async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("Fund", "Desc", "", GOAL, DURATION_DAYS);
      await crowdFunding
        .connect(contributor1)
        .contribute(1n, { value: ethers.parseEther("1") });
      await crowdFunding
        .connect(contributor2)
        .contribute(1n, { value: ethers.parseEther("1") });

      expect(await crowdFunding.getContributorCount(1n)).to.equal(2n);
      expect(await crowdFunding.getContributor(1n, 0n)).to.equal(
        contributor1.address
      );
      expect(await crowdFunding.getContributor(1n, 1n)).to.equal(
        contributor2.address
      );
    });

    it("does not add duplicate contributors", async function () {
      await crowdFunding
        .connect(creator)
        .createCampaign("Fund", "Desc", "", GOAL, DURATION_DAYS);
      await crowdFunding
        .connect(contributor1)
        .contribute(1n, { value: ethers.parseEther("1") });
      await crowdFunding
        .connect(contributor1)
        .contribute(1n, { value: ethers.parseEther("1") });

      expect(await crowdFunding.getContributorCount(1n)).to.equal(1n);
    });
  });
});

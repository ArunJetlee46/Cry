import { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { CAMPAIGN_STATES, MILESTONE_STATES } from "../constants";
import TransactionHistory from "./TransactionHistory";

const STATE_COLORS = ["active", "success", "failed", "refunded"];

function ProgressBar({ raised, goal }) {
  const pct =
    goal > 0n ? Math.min(Number((raised * 10000n) / goal) / 100, 100) : 0;
  return (
    <div className="progress-bar-wrap large">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
      <span className="progress-label">{pct.toFixed(1)}%</span>
    </div>
  );
}

function MilestoneItem({ milestone, idx, campaignId, isCreator, hasContributed, contract, onRefresh }) {
  const [voting, setVoting] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const { account } = useWeb3();

  useEffect(() => {
    if (contract && account) {
      contract
        .hasVotedOnMilestone(campaignId, idx, account)
        .then(setHasVoted)
        .catch(() => {});
    }
  }, [contract, account, campaignId, idx]);

  const vote = async (approve) => {
    setVoting(true);
    try {
      const tx = await contract.voteMilestone(campaignId, idx, approve);
      await tx.wait();
      onRefresh();
    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setVoting(false);
    }
  };

  const release = async () => {
    setReleasing(true);
    try {
      const tx = await contract.releaseMilestoneFunds(campaignId, idx);
      await tx.wait();
      onRefresh();
    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setReleasing(false);
    }
  };

  const stateLabel = MILESTONE_STATES[Number(milestone.state)] || "Unknown";

  return (
    <div className={`milestone-item milestone-${stateLabel.toLowerCase()}`}>
      <div className="milestone-header">
        <span className="milestone-num">#{idx + 1}</span>
        <h4>{milestone.description}</h4>
        <span className={`badge badge-${stateLabel.toLowerCase()}`}>
          {stateLabel}
        </span>
      </div>
      <p className="milestone-amount">
        💰 {parseFloat(formatEther(milestone.amount)).toFixed(4)} ETH
      </p>
      <div className="milestone-votes">
        <span>✅ {milestone.approvalCount.toString()} approvals</span>
        <span>❌ {milestone.rejectionCount.toString()} rejections</span>
      </div>

      {/* Voting buttons for contributors */}
      {hasContributed &&
        Number(milestone.state) === 0 && // Pending
        !hasVoted && (
          <div className="milestone-actions">
            <button
              className="btn btn-success btn-sm"
              onClick={() => vote(true)}
              disabled={voting}
            >
              {voting ? "…" : "Approve"}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => vote(false)}
              disabled={voting}
            >
              {voting ? "…" : "Reject"}
            </button>
          </div>
        )}
      {hasVoted && Number(milestone.state) === 0 && (
        <p className="voted-label">You have voted</p>
      )}

      {/* Release button for creator */}
      {isCreator && Number(milestone.state) === 1 /* Approved */ && (
        <button
          className="btn btn-primary btn-sm"
          onClick={release}
          disabled={releasing}
        >
          {releasing ? "Releasing…" : "Release Funds"}
        </button>
      )}
    </div>
  );
}

export default function CampaignDetail({ campaignId, onBack }) {
  const { contract, account, formatEther: fmt } = useWeb3();
  const [campaign, setCampaign] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contribution, setContribution] = useState("");
  const [contributing, setContributing] = useState(false);
  const [myContribution, setMyContribution] = useState(0n);
  const [refunding, setRefunding] = useState(false);
  const [marking, setMarking] = useState(false);
  const [tab, setTab] = useState("overview");
  // Milestone form
  const [mlDesc, setMlDesc] = useState("");
  const [mlAmount, setMlAmount] = useState("");
  const [addingMl, setAddingMl] = useState(false);

  const fetchData = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setError(null);
    try {
      const c = await contract.getCampaign(campaignId);
      const cam = {
        id: c[0],
        creator: c[1],
        title: c[2],
        description: c[3],
        imageUrl: c[4],
        goal: c[5],
        deadline: c[6],
        amountRaised: c[7],
        milestoneCount: c[8],
        state: c[9],
      };
      setCampaign(cam);

      const mls = [];
      for (let i = 0; i < Number(cam.milestoneCount); i++) {
        const m = await contract.getMilestone(campaignId, i);
        mls.push({
          description: m[0],
          amount: m[1],
          state: m[2],
          approvalCount: m[3],
          rejectionCount: m[4],
        });
      }
      setMilestones(mls);

      if (account) {
        const contrib = await contract.contributions(campaignId, account);
        setMyContribution(contrib);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contract, campaignId, account]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!contribution || isNaN(contribution) || Number(contribution) <= 0)
      return alert("Enter a valid amount");
    setContributing(true);
    try {
      const tx = await contract.contribute(campaignId, {
        value: parseEther(contribution),
      });
      await tx.wait();
      setContribution("");
      fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setContributing(false);
    }
  };

  const handleRefund = async () => {
    setRefunding(true);
    try {
      const tx = await contract.claimRefund(campaignId);
      await tx.wait();
      fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setRefunding(false);
    }
  };

  const handleMarkFailed = async () => {
    setMarking(true);
    try {
      const tx = await contract.markCampaignFailed(campaignId);
      await tx.wait();
      fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setMarking(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!mlDesc.trim()) return alert("Description required");
    if (!mlAmount || isNaN(mlAmount) || Number(mlAmount) <= 0)
      return alert("Enter valid milestone amount in ETH");
    setAddingMl(true);
    try {
      const tx = await contract.addMilestone(
        campaignId,
        mlDesc.trim(),
        parseEther(mlAmount)
      );
      await tx.wait();
      setMlDesc("");
      setMlAmount("");
      fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setAddingMl(false);
    }
  };

  if (loading) return <div className="loading">Loading campaign…</div>;
  if (error)
    return (
      <div className="alert alert-error">
        {error}
        <button className="btn btn-sm" onClick={onBack}>
          Back
        </button>
      </div>
    );
  if (!campaign) return null;

  const isCreator =
    account &&
    campaign.creator.toLowerCase() === account.toLowerCase();
  const hasContributed = myContribution > 0n;
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const isExpired = deadline < new Date();
  const stateLabel =
    CAMPAIGN_STATES[Number(campaign.state)] || "Unknown";
  const colorClass = STATE_COLORS[Number(campaign.state)] || "active";

  return (
    <div className="detail-page">
      <button className="btn btn-outline btn-sm back-btn" onClick={onBack}>
        ← Back
      </button>

      {campaign.imageUrl && (
        <img
          src={campaign.imageUrl}
          alt={campaign.title}
          className="detail-hero-img"
          onError={(e) => (e.target.style.display = "none")}
        />
      )}

      <div className="detail-header">
        <div>
          <h1>{campaign.title}</h1>
          <p className="creator-addr">
            by{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${campaign.creator}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {campaign.creator.slice(0, 6)}…{campaign.creator.slice(-4)}
            </a>
          </p>
        </div>
        <span className={`badge badge-${colorClass} badge-lg`}>
          {stateLabel}
        </span>
      </div>

      <ProgressBar raised={campaign.amountRaised} goal={campaign.goal} />

      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-val">
            {parseFloat(formatEther(campaign.amountRaised)).toFixed(4)} ETH
          </span>
          <span className="stat-lbl">Raised</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">
            {parseFloat(formatEther(campaign.goal)).toFixed(4)} ETH
          </span>
          <span className="stat-lbl">Goal</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">
            {isExpired ? "Expired" : deadline.toLocaleDateString()}
          </span>
          <span className="stat-lbl">Deadline</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">{campaign.milestoneCount.toString()}</span>
          <span className="stat-lbl">Milestones</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {["overview", "milestones", "history"].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="tab-content">
          <p className="description">{campaign.description}</p>

          {hasContributed && (
            <div className="my-contribution">
              Your contribution:{" "}
              <strong>
                {parseFloat(formatEther(myContribution)).toFixed(4)} ETH
              </strong>
            </div>
          )}

          {/* Contribute form */}
          {Number(campaign.state) === 0 /* Active */ && !isExpired && account && (
            <form className="contribution-form" onSubmit={handleContribute}>
              <h3>Fund this Campaign</h3>
              <div className="input-group">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="Amount in ETH"
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={contributing}
                >
                  {contributing ? "Sending…" : "Contribute"}
                </button>
              </div>
            </form>
          )}

          {/* Mark Failed */}
          {Number(campaign.state) === 0 &&
            isExpired &&
            campaign.amountRaised < campaign.goal && (
              <div className="action-section">
                <p className="info-text">
                  This campaign has expired without reaching its goal. Anyone
                  can mark it as failed to enable refunds.
                </p>
                <button
                  className="btn btn-danger"
                  onClick={handleMarkFailed}
                  disabled={marking}
                >
                  {marking ? "Processing…" : "Mark Campaign as Failed"}
                </button>
              </div>
            )}

          {/* Refund claim */}
          {Number(campaign.state) === 2 /* Failed */ && hasContributed && (
            <div className="action-section">
              <p className="info-text">
                This campaign failed. You can claim your refund of{" "}
                {parseFloat(formatEther(myContribution)).toFixed(4)} ETH.
              </p>
              <button
                className="btn btn-warning"
                onClick={handleRefund}
                disabled={refunding}
              >
                {refunding ? "Claiming…" : "Claim Refund"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Milestones tab */}
      {tab === "milestones" && (
        <div className="tab-content">
          {milestones.length === 0 && (
            <p className="empty-msg">No milestones yet.</p>
          )}
          {milestones.map((m, i) => (
            <MilestoneItem
              key={i}
              milestone={m}
              idx={i}
              campaignId={campaignId}
              isCreator={isCreator}
              hasContributed={hasContributed}
              contract={contract}
              onRefresh={fetchData}
            />
          ))}

          {/* Add milestone form (creator, successful campaign) */}
          {isCreator && Number(campaign.state) === 1 /* Successful */ && (
            <form className="form-card" onSubmit={handleAddMilestone}>
              <h3>Add Milestone</h3>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={mlDesc}
                  onChange={(e) => setMlDesc(e.target.value)}
                  placeholder="What will this milestone achieve?"
                />
              </div>
              <div className="form-group">
                <label>Amount (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={mlAmount}
                  onChange={(e) => setMlAmount(e.target.value)}
                  placeholder="0.5"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={addingMl}
              >
                {addingMl ? "Adding…" : "Add Milestone"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <TransactionHistory campaignId={campaignId} contract={contract} />
      )}
    </div>
  );
}

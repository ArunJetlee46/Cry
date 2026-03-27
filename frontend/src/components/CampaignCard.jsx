import { formatEther } from "ethers";
import { CAMPAIGN_STATES } from "../constants";

const STATE_COLORS = ["active", "success", "failed", "refunded"];

function ProgressBar({ raised, goal }) {
  const pct = goal > 0n ? Number((raised * 10000n) / goal) / 100 : 0;
  const clamped = Math.min(pct, 100);
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar" style={{ width: `${clamped}%` }} />
      <span className="progress-label">{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function CampaignCard({ campaign, onSelect }) {
  const deadlineDate = new Date(Number(campaign.deadline) * 1000);
  const isExpired = deadlineDate < new Date();
  const stateLabel = CAMPAIGN_STATES[Number(campaign.state)] || "Unknown";
  const colorClass = STATE_COLORS[Number(campaign.state)] || "active";

  return (
    <div
      className="campaign-card"
      onClick={() => onSelect(campaign.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(campaign.id)}
    >
      {campaign.imageUrl && (
        <img
          src={campaign.imageUrl}
          alt={campaign.title}
          className="campaign-img"
          onError={(e) => (e.target.style.display = "none")}
        />
      )}
      <div className="campaign-card-body">
        <div className="campaign-header">
          <h3 className="campaign-title">{campaign.title}</h3>
          <span className={`badge badge-${colorClass}`}>{stateLabel}</span>
        </div>
        <p className="campaign-desc">
          {campaign.description.length > 120
            ? `${campaign.description.slice(0, 120)}…`
            : campaign.description}
        </p>
        <ProgressBar raised={campaign.amountRaised} goal={campaign.goal} />
        <div className="campaign-stats">
          <div className="stat">
            <span className="stat-value">
              {parseFloat(formatEther(campaign.amountRaised)).toFixed(3)} ETH
            </span>
            <span className="stat-label">raised</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {parseFloat(formatEther(campaign.goal)).toFixed(3)} ETH
            </span>
            <span className="stat-label">goal</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {isExpired ? "Ended" : deadlineDate.toLocaleDateString()}
            </span>
            <span className="stat-label">deadline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

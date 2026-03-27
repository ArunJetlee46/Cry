import { useState, useEffect } from "react";
import { formatEther } from "ethers";

const EVENT_NAMES = [
  "ContributionMade",
  "MilestoneCreated",
  "MilestoneVoted",
  "MilestoneReleased",
  "MilestoneRejected",
  "RefundIssued",
  "CampaignStateChanged",
];

function eventToLabel(name, args) {
  switch (name) {
    case "ContributionMade":
      return `💸 ${args.contributor.slice(0, 6)}…${args.contributor.slice(-4)} contributed ${parseFloat(formatEther(args.amount)).toFixed(4)} ETH`;
    case "MilestoneCreated":
      return `🎯 Milestone #${Number(args.milestoneIndex) + 1} created: "${args.description}"`;
    case "MilestoneVoted":
      return `🗳️ ${args.voter.slice(0, 6)}…${args.voter.slice(-4)} ${args.approved ? "approved" : "rejected"} milestone #${Number(args.milestoneIndex) + 1}`;
    case "MilestoneReleased":
      return `✅ Milestone #${Number(args.milestoneIndex) + 1} funds released (${parseFloat(formatEther(args.amount)).toFixed(4)} ETH)`;
    case "MilestoneRejected":
      return `❌ Milestone #${Number(args.milestoneIndex) + 1} rejected`;
    case "RefundIssued":
      return `↩️ Refund of ${parseFloat(formatEther(args.amount)).toFixed(4)} ETH to ${args.contributor.slice(0, 6)}…${args.contributor.slice(-4)}`;
    case "CampaignStateChanged":
      return `🔄 Campaign state changed to ${["Active","Successful","Failed","Refunded"][Number(args.newState)]}`;
    default:
      return name;
  }
}

export default function TransactionHistory({ campaignId, contract }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contract) return;
    setLoading(true);

    const fetchEvents = async () => {
      try {
        const allEvents = [];

        for (const name of EVENT_NAMES) {
          try {
            const filter = contract.filters[name]
              ? contract.filters[name](campaignId)
              : null;
            if (!filter) continue;

            const logs = await contract.queryFilter(filter, 0, "latest");
            for (const log of logs) {
              allEvents.push({
                name,
                args: log.args,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
              });
            }
          } catch {
            // Event filter may not exist for every event shape — skip
          }
        }

        allEvents.sort((a, b) => b.blockNumber - a.blockNumber);
        setEvents(allEvents);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [contract, campaignId]);

  if (loading) return <div className="loading">Loading history…</div>;

  return (
    <div className="history-section">
      <h3>Transaction History</h3>
      {events.length === 0 ? (
        <p className="empty-msg">No on-chain events yet.</p>
      ) : (
        <ul className="event-list">
          {events.map((ev, i) => (
            <li key={i} className="event-item">
              <span className="event-label">
                {eventToLabel(ev.name, ev.args)}
              </span>
              <a
                className="tx-link"
                href={`https://sepolia.etherscan.io/tx/${ev.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                title={ev.transactionHash}
              >
                Block #{ev.blockNumber} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

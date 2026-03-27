import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";
import { CAMPAIGN_STATES } from "../constants";
import CampaignCard from "./CampaignCard";

export default function CampaignList({ onSelect }) {
  const { contract, account } = useWeb3();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setError(null);
    try {
      const ids = await contract.getAllCampaignIds();
      const results = await Promise.all(
        ids.map(async (id) => {
          const c = await contract.getCampaign(id);
          return {
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
        })
      );
      setCampaigns(results.reverse()); // newest first
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  if (!contract) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔗</div>
        <h2>Connect Your Wallet</h2>
        <p>Connect your MetaMask wallet to browse and fund campaigns.</p>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading campaigns…</div>;

  if (error)
    return (
      <div className="alert alert-error">
        Error loading campaigns: {error}
        <button className="btn btn-sm" onClick={fetchCampaigns}>
          Retry
        </button>
      </div>
    );

  return (
    <div className="campaign-list-page">
      <div className="page-header">
        <h1>Active Campaigns</h1>
        <p>Fund innovative projects and track progress on-chain</p>
        <button className="btn btn-sm btn-outline" onClick={fetchCampaigns}>
          ↻ Refresh
        </button>
      </div>
      {campaigns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>No campaigns yet</h2>
          <p>Be the first to create a campaign!</p>
        </div>
      ) : (
        <div className="campaign-grid">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id.toString()}
              campaign={campaign}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

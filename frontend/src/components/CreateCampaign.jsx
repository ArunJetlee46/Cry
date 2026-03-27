import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { parseEther } from "ethers";

export default function CreateCampaign({ onCreated }) {
  const { contract, account } = useWeb3();
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    goal: "",
    durationDays: "30",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!contract || !account) {
      setError("Please connect your wallet first.");
      return;
    }

    const { title, description, imageUrl, goal, durationDays } = form;
    if (!title.trim()) return setError("Title is required.");
    if (!description.trim()) return setError("Description is required.");
    if (!goal || isNaN(goal) || Number(goal) <= 0)
      return setError("Goal must be a positive number (in ETH).");
    if (!durationDays || isNaN(durationDays) || Number(durationDays) < 1)
      return setError("Duration must be at least 1 day.");

    setLoading(true);
    try {
      const goalWei = parseEther(goal);
      const tx = await contract.createCampaign(
        title.trim(),
        description.trim(),
        imageUrl.trim(),
        goalWei,
        Number(durationDays)
      );
      const receipt = await tx.wait();

      // Extract campaign ID from CampaignCreated event
      const event = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          contract.interface.getEvent("CampaignCreated").topicHash
      );
      const decoded = event
        ? contract.interface.decodeEventLog("CampaignCreated", event.data, event.topics)
        : null;
      const campaignId = decoded ? decoded.campaignId : null;

      setSuccess(
        `Campaign created! TX: ${receipt.hash.slice(0, 16)}…`
      );
      setForm({
        title: "",
        description: "",
        imageUrl: "",
        goal: "",
        durationDays: "30",
      });

      if (onCreated && campaignId !== null) {
        setTimeout(() => onCreated(campaignId), 1500);
      }
    } catch (err) {
      setError(err.reason || err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <h1>Create a Campaign</h1>
      <p className="subtitle">
        Launch your crowdfunding campaign on the blockchain. Funds are held in
        smart contracts and released based on milestone approvals.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Campaign Title *</label>
          <input
            id="title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="My Awesome Project"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your project, its goals, and how you will use the funds…"
            rows={5}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="imageUrl">Cover Image URL</label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            value={form.imageUrl}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="goal">Funding Goal (ETH) *</label>
            <input
              id="goal"
              name="goal"
              type="number"
              step="0.001"
              min="0.001"
              value={form.goal}
              onChange={handleChange}
              placeholder="1.5"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="durationDays">Duration (days) *</label>
            <input
              id="durationDays"
              name="durationDays"
              type="number"
              min="1"
              max="365"
              value={form.durationDays}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
        >
          {loading ? "Creating Campaign…" : "🚀 Create Campaign"}
        </button>
      </form>
    </div>
  );
}

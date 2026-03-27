import { useState } from "react";
import { Web3Provider } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import CampaignList from "./components/CampaignList";
import CreateCampaign from "./components/CreateCampaign";
import CampaignDetail from "./components/CampaignDetail";
import "./App.css";

function App() {
  const [page, setPage] = useState("home");
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  const navigate = (target, id = null) => {
    setPage(target);
    if (id !== null) setSelectedCampaignId(id);
  };

  const handleSelectCampaign = (id) => navigate("detail", id);
  const handleCampaignCreated = (id) => navigate("detail", id);

  return (
    <Web3Provider>
      <div className="app">
        <Navbar onNavigate={navigate} currentPage={page} />
        <main className="main-content">
          {page === "home" && (
            <CampaignList onSelect={handleSelectCampaign} />
          )}
          {page === "create" && (
            <CreateCampaign onCreated={handleCampaignCreated} />
          )}
          {page === "detail" && selectedCampaignId !== null && (
            <CampaignDetail
              campaignId={selectedCampaignId}
              onBack={() => navigate("home")}
            />
          )}
        </main>
        <footer className="footer">
          <p>
            CrowdFundChain — Decentralized crowdfunding powered by Ethereum &amp;
            smart contracts.
          </p>
        </footer>
      </div>
    </Web3Provider>
  );
}

export default App;


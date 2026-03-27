import { useWeb3 } from "../context/Web3Context";

export default function Navbar({ onNavigate, currentPage }) {
  const { account, network, connect, disconnect } = useWeb3();

  const short = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => onNavigate("home")}>
        🌊 CrowdFund<span>Chain</span>
      </div>
      <div className="navbar-links">
        <button
          className={`nav-link ${currentPage === "home" ? "active" : ""}`}
          onClick={() => onNavigate("home")}
        >
          Campaigns
        </button>
        {account && (
          <button
            className={`nav-link ${currentPage === "create" ? "active" : ""}`}
            onClick={() => onNavigate("create")}
          >
            + Create
          </button>
        )}
      </div>
      <div className="navbar-wallet">
        {network && (
          <span className="network-badge">{network.name || `Chain ${network.chainId}`}</span>
        )}
        {account ? (
          <div className="wallet-info">
            <span className="wallet-address" title={account}>
              {short(account)}
            </span>
            <button className="btn btn-outline btn-sm" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={connect}>
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}

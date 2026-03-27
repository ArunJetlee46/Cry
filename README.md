# CrowdFundChain

A decentralized crowdfunding platform built on Ethereum, featuring transparent campaign management, milestone-based fund release, and automatic refunds for failed campaigns.

## ✨ Features

- 🚀 **Campaign Creation** — Create campaigns with title, description, cover image, goal (ETH), and duration
- 💸 **Wallet-Based Contributions** — Contributors authenticate via MetaMask and contribute ETH directly
- 🎯 **Milestone-Based Fund Release** — Creators define milestones; contributors vote to approve or reject each one before funds are released
- ↩️ **Automatic Refunds** — Contributors can claim refunds if a campaign fails to reach its goal by the deadline
- 📋 **Transaction History** — Every contribution, vote, and milestone event is recorded on-chain and viewable in the UI
- 🔍 **Etherscan Integration** — Links to Sepolia Etherscan for full transaction transparency
- 🔧 **Backend API** — REST API for fast campaign search, filtering, and user profile aggregation

## 🏗️ Architecture

```
crowdfundchain/
├── contracts/
│   └── CrowdFunding.sol      # Main Solidity smart contract
├── scripts/
│   └── deploy.js             # Hardhat deployment script
├── test/
│   └── CrowdFunding.test.js  # 32 contract unit tests
├── backend/                  # REST API server (NEW)
│   └── src/
│       ├── config/           # Configuration & database setup
│       ├── services/         # Blockchain indexing & data services
│       ├── controllers/      # API request handlers
│       ├── routes/           # API route definitions
│       ├── middleware/       # Express middleware (rate limiting, errors)
│       └── server.js         # Main server entry point
├── frontend/
│   └── src/
│       ├── context/
│       │   └── Web3Context.jsx     # MetaMask / ethers.js provider
│       ├── components/
│       │   ├── Navbar.jsx          # Top navigation + wallet connect
│       │   ├── CampaignList.jsx    # Browse all campaigns
│       │   ├── CampaignCard.jsx    # Individual campaign card
│       │   ├── CampaignDetail.jsx  # Campaign detail + fund/vote/refund
│       │   ├── CreateCampaign.jsx  # Campaign creation form
│       │   └── TransactionHistory.jsx # On-chain event log
│       ├── constants.js            # Contract ABI + address
│       └── App.jsx                 # Root component + routing
├── hardhat.config.js
├── .env.example
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- MetaMask browser extension
- Sepolia testnet ETH (from a [faucet](https://sepoliafaucet.com/))

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Sepolia RPC URL, private key, and Etherscan API key
```

### 3. Compile & Test Smart Contracts

```bash
npm run compile
npm test
```

### 4. Deploy to Sepolia Testnet

```bash
npm run deploy:sepolia
# Copy the deployed contract address
```

### 5. Configure & Run Backend API (Optional)

```bash
cp backend/.env.example backend/.env
# Set RPC_URL and CONTRACT_ADDRESS in backend/.env

# Sync blockchain data to local database
npm run backend:sync

# Start backend server
npm run backend:dev
# Backend runs on http://localhost:3001
```

### 6. Configure Frontend & Run

```bash
cp frontend/.env.example frontend/.env
# Set VITE_CONTRACT_ADDRESS to your deployed contract address

npm run frontend:dev
# Open http://localhost:5173
```

## 📜 Smart Contract

The `CrowdFunding` contract exposes the following main functions:

| Function | Description |
|---|---|
| `createCampaign(title, description, imageUrl, goal, durationDays)` | Create a new campaign |
| `contribute(campaignId)` | Fund an active campaign (payable) |
| `addMilestone(campaignId, description, amount)` | Creator adds a milestone (campaign must be successful) |
| `voteMilestone(campaignId, milestoneIndex, approve)` | Contributors vote on milestones |
| `releaseMilestoneFunds(campaignId, milestoneIndex)` | Creator releases approved milestone funds |
| `markCampaignFailed(campaignId)` | Mark expired campaign as failed (enables refunds) |
| `claimRefund(campaignId)` | Contributor claims refund on failed campaign |

### Campaign States

| State | Description |
|---|---|
| `Active` | Campaign is accepting contributions |
| `Successful` | Funding goal reached — milestones can be added |
| `Failed` | Deadline passed without reaching goal — refunds available |
| `Refunded` | All funds returned |

### Milestone States

| State | Description |
|---|---|
| `Pending` | Awaiting contributor votes |
| `Approved` | Majority approved — creator can release funds |
| `Released` | Funds transferred to creator |
| `Rejected` | Majority rejected |

## 🧪 Testing

### Smart Contract Tests

```bash
npm test
# 32 unit tests covering all contract functions
```

### Backend API Tests

```bash
npm run backend:test
# API endpoint and integration tests
```

## 🌐 Deployment

The contract is designed for Ethereum Sepolia testnet. After deployment:

1. Copy the contract address from the deployment output
2. Set `VITE_CONTRACT_ADDRESS` in `frontend/.env`
3. Build and deploy the frontend with `npm run frontend:build`
4. (Optional) Deploy backend API server with environment variables configured

## 🔌 Backend API

The backend API provides enhanced functionality for the platform:

### Features

- **Campaign Search & Filtering** — Fast search by title/description with pagination
- **Event Indexing** — Caches blockchain events for quick access
- **User Profiles** — Aggregated statistics for creators and contributors
- **Platform Analytics** — Overall platform statistics and metrics
- **Rate Limiting** — Protection against API abuse

### API Endpoints

- `GET /api/campaigns` — List all campaigns (supports search, filtering, pagination)
- `GET /api/campaigns/:id` — Get campaign details
- `GET /api/campaigns/:id/milestones` — Get campaign milestones
- `GET /api/campaigns/:id/contributions` — Get campaign contributions
- `GET /api/users/:address/campaigns` — Get user's created campaigns
- `GET /api/users/:address/contributions` — Get user's contribution history
- `GET /api/users/:address/profile` — Get user profile with statistics
- `GET /api/stats` — Get platform-wide statistics
- `GET /health` — Health check endpoint

See [backend/README.md](backend/README.md) for detailed API documentation.

## 🔒 Security Design

- **Reentrancy protection**: State is updated before ETH transfers (Checks-Effects-Interactions pattern)
- **Access control**: `onlyCreator` and contributor-only modifiers prevent unauthorized actions
- **Safe transfers**: Uses `call{value}` instead of deprecated `transfer`
- **Campaign validation**: All inputs validated with descriptive error messages

## 📄 License

MIT

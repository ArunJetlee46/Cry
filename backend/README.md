# CrowdFundChain Backend API

Backend API server for the CrowdFundChain decentralized crowdfunding platform. Provides caching, indexing, and search capabilities for on-chain data.

## Features

- 🔍 **Campaign Search & Filtering** - Fast search and filter capabilities
- 📊 **Event Indexing** - Caches blockchain events for quick access
- 👤 **User Profiles** - Aggregated user contribution and campaign history
- 🚀 **Fast Performance** - SQLite database for efficient queries
- 🔒 **Rate Limiting** - Protection against abuse
- 📈 **Analytics** - Platform-wide statistics

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your RPC URL and contract address
```

### 3. Sync Blockchain Data

```bash
npm run sync
```

This will index all campaigns and events from the smart contract.

### 4. Start Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server runs on http://localhost:3001

## API Endpoints

### Campaigns

- `GET /api/campaigns` - List all campaigns (with pagination, search, filter)
  - Query params: `page`, `limit`, `search`, `state`, `creator`
- `GET /api/campaigns/:id` - Get campaign details
- `GET /api/campaigns/:id/milestones` - Get campaign milestones
- `GET /api/campaigns/:id/contributions` - Get campaign contributions

### Users

- `GET /api/users/:address/campaigns` - Get campaigns created by user
- `GET /api/users/:address/contributions` - Get user contribution history
- `GET /api/users/:address/profile` - Get user profile summary

### Statistics

- `GET /api/stats` - Platform-wide statistics

### Health

- `GET /health` - API health check

## Database Schema

The backend uses SQLite with the following tables:

- `campaigns` - Campaign data
- `milestones` - Campaign milestones
- `contributions` - Contribution records
- `events` - Indexed blockchain events
- `sync_status` - Tracks last synced block

## Data Synchronization

The backend periodically syncs with the blockchain to keep data up-to-date:

```bash
npm run sync
```

You can also set up a cron job to run this regularly.

## Development

```bash
# Run tests
npm test

# Watch mode for tests
npm run test:watch
```

## Architecture

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route handlers
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── models/         # Database models
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utility functions
│   └── scripts/        # Maintenance scripts
├── package.json
└── README.md
```

## License

ISC

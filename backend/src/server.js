import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { initializeBlockchain } from './services/blockchain.js';
import { startPeriodicSync } from './services/indexer.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Rate limiting
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize blockchain connection
try {
  initializeBlockchain();
  console.log('Blockchain connection established');
} catch (error) {
  console.error('Failed to initialize blockchain:', error.message);
  console.error('Server will start but blockchain features will not work');
}

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Start periodic blockchain sync (every 5 minutes)
  if (config.rpcUrl && config.contractAddress) {
    startPeriodicSync(5).catch((error) => {
      console.error('Failed to start periodic sync:', error.message);
    });
  } else {
    console.warn('Blockchain sync disabled: RPC_URL or CONTRACT_ADDRESS not configured');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

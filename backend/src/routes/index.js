import express from 'express';
import campaignRoutes from './campaigns.js';
import userRoutes from './users.js';
import statsRoutes from './stats.js';

const router = express.Router();

router.use('/campaigns', campaignRoutes);
router.use('/users', userRoutes);
router.use('/stats', statsRoutes);

export default router;

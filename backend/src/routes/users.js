import express from 'express';
import {
  getUserCampaigns,
  getUserContributions,
  getProfile,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/:address/campaigns', getUserCampaigns);
router.get('/:address/contributions', getUserContributions);
router.get('/:address/profile', getProfile);

export default router;

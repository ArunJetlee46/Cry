import express from 'express';
import {
  listCampaigns,
  getCampaign,
  getCampaignMilestones,
  getCampaignContributions,
} from '../controllers/campaignController.js';

const router = express.Router();

router.get('/', listCampaigns);
router.get('/:id', getCampaign);
router.get('/:id/milestones', getCampaignMilestones);
router.get('/:id/contributions', getCampaignContributions);

export default router;

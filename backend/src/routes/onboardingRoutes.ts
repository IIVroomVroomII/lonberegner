import { Router } from 'express';
import {
  getOnboardingStatus,
  completeStep,
  skipOnboarding,
  completeOnboarding,
} from '../controllers/onboardingController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/onboarding/status - Get onboarding status
router.get('/status', getOnboardingStatus);

// POST /api/v1/onboarding/complete-step - Complete a specific step
router.post('/complete-step', completeStep);

// POST /api/v1/onboarding/skip - Skip entire onboarding
router.post('/skip', skipOnboarding);

// POST /api/v1/onboarding/complete - Complete entire onboarding
router.post('/complete', completeOnboarding);

export default router;

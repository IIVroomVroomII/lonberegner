import { Router } from 'express';
import { getDashboardStats, getMonthlyTrends } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/trends', getMonthlyTrends);

export default router;

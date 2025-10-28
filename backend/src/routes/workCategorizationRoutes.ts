import { Router } from 'express';
import { categorizeWorkDay } from '../controllers/workCategorizationController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { categorizeWorkDaySchema } from '../validators/workCategorizationValidators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Analyser GPS data for en arbejdsdag og foreslå arbejdstyper
router.get(
  '/analyze/:timeEntryId',
  validate(categorizeWorkDaySchema),
  categorizeWorkDay
);

export default router;

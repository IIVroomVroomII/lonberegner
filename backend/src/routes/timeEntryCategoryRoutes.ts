import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  splitTimeEntrySchema,
  mergeTimeEntriesSchema,
  bulkEditTimeEntriesSchema,
  getTimeEntriesForPeriodSchema,
} from '../validators/timeEntryCategoryValidators';
import {
  splitTimeEntry,
  mergeTimeEntries,
  bulkEditTimeEntries,
  getTimeEntriesForPeriod,
} from '../controllers/timeEntryCategoryController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Split a time entry into two periods
router.post('/:id/split', validate(splitTimeEntrySchema), splitTimeEntry);

// Merge multiple time entries into one
router.post('/merge', validate(mergeTimeEntriesSchema), mergeTimeEntries);

// Bulk edit multiple time entries
router.put('/bulk-edit', validate(bulkEditTimeEntriesSchema), bulkEditTimeEntries);

// Get time entries for a period (for timeline view)
router.get('/period', validate(getTimeEntriesForPeriodSchema), getTimeEntriesForPeriod);

export default router;

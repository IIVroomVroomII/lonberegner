import { Router } from 'express';
import {
  createTimeEntry,
  updateTimeEntry,
  getTimeEntry,
  listTimeEntries,
  approveTimeEntry,
  deleteTimeEntry,
} from '../controllers/timeEntryController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  getTimeEntrySchema,
  approveTimeEntrySchema,
  deleteTimeEntrySchema,
} from '../validators/timeEntryValidators';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createTimeEntrySchema), createTimeEntry);
router.get('/', listTimeEntries);
router.get('/:id', validate(getTimeEntrySchema), getTimeEntry);
router.put('/:id', validate(updateTimeEntrySchema), updateTimeEntry);
router.patch('/:id/approve', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(approveTimeEntrySchema), approveTimeEntry);
router.delete('/:id', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(deleteTimeEntrySchema), deleteTimeEntry);

export default router;

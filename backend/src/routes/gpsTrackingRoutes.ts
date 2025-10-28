import { Router } from 'express';
import {
  createGpsTracking,
  createBatchGpsTracking,
  listGpsTracking,
  getGpsTrackingSummary,
  deleteGpsTracking,
} from '../controllers/gpsTrackingController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createGpsTrackingSchema,
  createBatchGpsTrackingSchema,
  listGpsTrackingSchema,
  getGpsTrackingSummarySchema,
  deleteGpsTrackingSchema,
} from '../validators/gpsTrackingValidators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create single GPS tracking point
router.post('/', validate(createGpsTrackingSchema), createGpsTracking);

// Create multiple GPS tracking points in batch
router.post('/batch', validate(createBatchGpsTrackingSchema), createBatchGpsTracking);

// List GPS tracking points for a time entry
router.get('/', validate(listGpsTrackingSchema), listGpsTracking);

// Get GPS tracking summary for a time entry
router.get('/summary/:timeEntryId', validate(getGpsTrackingSummarySchema), getGpsTrackingSummary);

// Delete GPS tracking data for a time entry
router.delete('/:timeEntryId', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(deleteGpsTrackingSchema), deleteGpsTracking);

export default router;

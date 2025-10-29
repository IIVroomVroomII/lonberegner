import { Router } from 'express';
import {
  createGpsTracking,
  createBatchGpsTracking,
  listGpsTracking,
  getGpsTrackingSummary,
  deleteGpsTracking,
} from '../controllers/gpsTrackingController';
import {
  batchUpload,
  getSyncStatus,
  getPendingConflicts,
  resolveConflict,
  rejectConflict,
} from '../controllers/gpsQueueController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createGpsTrackingSchema,
  createBatchGpsTrackingSchema,
  listGpsTrackingSchema,
  getGpsTrackingSummarySchema,
  deleteGpsTrackingSchema,
} from '../validators/gpsTrackingValidators';
import {
  batchUploadSchema,
  getSyncStatusSchema,
  getPendingConflictsSchema,
  resolveConflictSchema,
  rejectConflictSchema,
} from '../validators/gpsQueueValidators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ========== Standard GPS Tracking Endpoints ==========

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

// ========== Offline Queue & Sync Endpoints ==========

// Batch upload GPS data from offline queue
router.post('/batch-upload', validate(batchUploadSchema), batchUpload);

// Get sync status for an employee
router.get('/sync-status/:employeeId', validate(getSyncStatusSchema), getSyncStatus);

// Get pending conflicts for an employee
router.get('/conflicts/:employeeId', validate(getPendingConflictsSchema), getPendingConflicts);

// Resolve a GPS conflict
router.post('/resolve-conflict/:id', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(resolveConflictSchema), resolveConflict);

// Reject a GPS conflict
router.post('/reject-conflict/:id', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(rejectConflictSchema), rejectConflict);

export default router;

import { Router } from 'express';
import {
  createGeofence,
  updateGeofence,
  getGeofence,
  listGeofences,
  deleteGeofence,
  checkGeofence,
} from '../controllers/geofenceController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createGeofenceSchema,
  updateGeofenceSchema,
  getGeofenceSchema,
  deleteGeofenceSchema,
  checkGeofenceSchema,
} from '../validators/geofenceValidators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD operations
router.post('/', validate(createGeofenceSchema), createGeofence);
router.get('/', listGeofences);
router.get('/:id', validate(getGeofenceSchema), getGeofence);
router.put('/:id', validate(updateGeofenceSchema), updateGeofence);
router.delete('/:id', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(deleteGeofenceSchema), deleteGeofence);

// Check if coordinate is within geofence
router.post('/check', validate(checkGeofenceSchema), checkGeofence);

export default router;

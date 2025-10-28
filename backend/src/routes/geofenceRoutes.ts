import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createGeofence,
  listGeofences,
  getGeofence,
  updateGeofence,
  deleteGeofence,
} from '../controllers/geofenceController';
import {
  createGeofenceSchema,
  updateGeofenceSchema,
  deleteGeofenceSchema,
  getGeofenceSchema,
  listGeofencesSchema,
} from '../validators/geofenceValidators';

const router = Router();

// All geofence routes require authentication
router.use(authenticate);

// Create a new geofence
router.post('/', validate(createGeofenceSchema), createGeofence);

// List all geofences (with optional filtering)
router.get('/', validate(listGeofencesSchema), listGeofences);

// Get a specific geofence
router.get('/:id', validate(getGeofenceSchema), getGeofence);

// Update a geofence
router.put('/:id', validate(updateGeofenceSchema), updateGeofence);

// Delete a geofence
router.delete('/:id', validate(deleteGeofenceSchema), deleteGeofence);

export default router;

import { Router } from 'express';
import {
  getIntegrations,
  getIntegration,
  saveIntegration,
  testIntegration,
  activateIntegration,
  deactivateIntegration,
  syncIntegration,
  deleteIntegration,
} from '../controllers/integrationsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/integrations - Get all integrations for team
router.get('/', getIntegrations);

// GET /api/v1/integrations/:id - Get single integration
router.get('/:id', getIntegration);

// POST /api/v1/integrations - Create or update integration
router.post('/', saveIntegration);

// POST /api/v1/integrations/:id/test - Test integration connection
router.post('/:id/test', testIntegration);

// POST /api/v1/integrations/:id/activate - Activate integration
router.post('/:id/activate', activateIntegration);

// POST /api/v1/integrations/:id/deactivate - Deactivate integration
router.post('/:id/deactivate', deactivateIntegration);

// POST /api/v1/integrations/:id/sync - Trigger manual sync
router.post('/:id/sync', syncIntegration);

// DELETE /api/v1/integrations/:id - Delete integration
router.delete('/:id', deleteIntegration);

export default router;

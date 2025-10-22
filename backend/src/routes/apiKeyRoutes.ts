import { Router } from 'express';
import {
  createApiKey,
  listApiKeys,
  deactivateApiKey,
  deleteApiKey,
} from '../controllers/apiKeyController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List all API keys for the team
router.get('/', listApiKeys);

// Create a new API key
router.post('/', createApiKey);

// Deactivate an API key
router.patch('/:id/deactivate', deactivateApiKey);

// Delete an API key
router.delete('/:id', deleteApiKey);

export default router;

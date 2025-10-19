import { Router } from 'express';
import {
  getIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  saveCredentials,
  testConnection,
  executeIntegration,
  deleteIntegration,
  chatWithClaude,
  getChatHistory,
  clearChatHistory,
  uploadFile,
  getFile,
  deleteFile,
} from '../controllers/aiIntegrationsController';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

router.use(authenticate);

// CRUD operations
router.get('/', getIntegrations);
router.get('/:id', getIntegration);
router.post('/', createIntegration);
router.put('/:id', updateIntegration);
router.delete('/:id', deleteIntegration);

// Credentials
router.post('/:id/credentials', saveCredentials);

// Testing and execution
router.post('/:id/test', testConnection);
router.post('/:id/execute', executeIntegration);

// Claude chat assistance
router.post('/:id/chat', chatWithClaude);
router.get('/:id/chat', getChatHistory);
router.delete('/:id/chat', clearChatHistory);

// File uploads
router.post('/:id/files', upload.single('file'), uploadFile);
router.get('/:id/files/:fileId', getFile);
router.delete('/:id/files/:fileId', deleteFile);

export default router;

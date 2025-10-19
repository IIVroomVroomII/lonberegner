import { Router } from 'express';
import { getAuditLogs, getAuditLogStats } from '../controllers/auditLogController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAuditLogs);
router.get('/stats', getAuditLogStats);

export default router;

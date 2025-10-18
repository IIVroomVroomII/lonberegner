import { Router } from 'express';
import {
  exportToEconomic,
  testEconomicConnection,
  exportToDanlon,
  exportMultipleToDanlon,
} from '../controllers/exportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin/payroll manager role
router.use(authenticate);
router.use(authorize('ADMIN', 'PAYROLL_MANAGER'));

// e-conomic export
router.post('/economic/:payrollId', exportToEconomic);
router.get('/economic/test-connection', testEconomicConnection);

// Danløn export
router.get('/danlon/:payrollId', exportToDanlon);
router.post('/danlon/multiple', exportMultipleToDanlon);

export default router;

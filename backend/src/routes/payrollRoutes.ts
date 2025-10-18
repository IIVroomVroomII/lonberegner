import { Router } from 'express';
import {
  calculatePayroll,
  calculateBatchPayroll,
  getPayroll,
  listPayrolls,
  updatePayrollStatus,
  deletePayroll,
} from '../controllers/payrollController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  calculatePayrollSchema,
  getPayrollSchema,
  updatePayrollStatusSchema,
  deletePayrollSchema,
} from '../validators/payrollValidators';

const router = Router();

// All routes require authentication and appropriate role
router.use(authenticate);
router.use(authorize('ADMIN', 'PAYROLL_MANAGER'));

router.post('/calculate', validate(calculatePayrollSchema), calculatePayroll);
router.post('/calculate/batch', calculateBatchPayroll);
router.get('/', listPayrolls);
router.get('/:id', validate(getPayrollSchema), getPayroll);
router.patch('/:id/status', validate(updatePayrollStatusSchema), updatePayrollStatus);
router.delete('/:id', validate(deletePayrollSchema), deletePayroll);

export default router;

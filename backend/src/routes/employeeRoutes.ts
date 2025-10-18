import { Router } from 'express';
import {
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createEmployeeSchema,
  getEmployeeSchema,
  updateEmployeeSchema,
  deleteEmployeeSchema,
} from '../validators/employeeValidators';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(createEmployeeSchema), createEmployee);
router.get('/', listEmployees);
router.get('/:id', validate(getEmployeeSchema), getEmployee);
router.put('/:id', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(updateEmployeeSchema), updateEmployee);
router.delete('/:id', authorize('ADMIN'), validate(deleteEmployeeSchema), deleteEmployee);

export default router;

import { Router } from 'express';
import {
  getPayrollSummaryReport,
  getTimeEntriesReport,
  getEmployeeHoursReport,
  getDeviationsReport,
  getSalaryCostReport
} from '../controllers/reportsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/reports/payroll-summary
router.get('/payroll-summary', getPayrollSummaryReport);

// GET /api/v1/reports/time-entries
router.get('/time-entries', getTimeEntriesReport);

// GET /api/v1/reports/employee-hours
router.get('/employee-hours', getEmployeeHoursReport);

// GET /api/v1/reports/deviations
router.get('/deviations', getDeviationsReport);

// GET /api/v1/reports/salary-cost
router.get('/salary-cost', getSalaryCostReport);

export default router;

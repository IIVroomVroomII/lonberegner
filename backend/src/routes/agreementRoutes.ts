import { Router } from 'express';
import {
  listAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  deleteAgreement,
  toggleAgreementStatus,
} from '../controllers/agreementController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createAgreementSchema,
  updateAgreementSchema,
  getAgreementSchema,
  deleteAgreementSchema,
  toggleAgreementStatusSchema,
} from '../validators/agreementValidators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List agreements - all authenticated users can view
router.get('/', listAgreements);
router.get('/:id', validate(getAgreementSchema), getAgreement);

// Modify agreements - only admins and payroll managers
router.post('/', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(createAgreementSchema), createAgreement);
router.put('/:id', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(updateAgreementSchema), updateAgreement);
router.patch('/:id/toggle-status', authorize('ADMIN', 'PAYROLL_MANAGER'), validate(toggleAgreementStatusSchema), toggleAgreementStatus);
router.delete('/:id', authorize('ADMIN'), validate(deleteAgreementSchema), deleteAgreement);

export default router;

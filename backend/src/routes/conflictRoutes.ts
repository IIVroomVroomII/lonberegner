import { Router } from 'express';
import * as conflictController from '../controllers/conflictController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Alle routes kræver authentication
router.use(authenticate);

/**
 * @route GET /api/v1/conflicts
 * @desc Hent alle konflikter med filtre
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.get('/', conflictController.getAllConflicts);

/**
 * @route GET /api/v1/conflicts/stats
 * @desc Hent konflikt statistik
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.get('/stats', conflictController.getConflictStats);

/**
 * @route GET /api/v1/conflicts/:id
 * @desc Hent specifik konflikt
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.get('/:id', conflictController.getConflictById);

/**
 * @route POST /api/v1/conflicts/:id/resolve
 * @desc Løs konflikt
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.post('/:id/resolve', conflictController.resolveConflict);

/**
 * @route POST /api/v1/conflicts/:id/reject
 * @desc Afvis konflikt
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.post('/:id/reject', conflictController.rejectConflict);

/**
 * @route POST /api/v1/conflicts/batch-approve
 * @desc Godkend flere konflikter på én gang
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.post('/batch-approve', conflictController.batchApproveConflicts);

export default router;

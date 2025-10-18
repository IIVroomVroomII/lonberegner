import { Router } from 'express';
import * as calculationProfileController from '../controllers/calculationProfileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Alle routes kræver authentication
router.use(authenticate);

/**
 * @route GET /api/v1/calculation-profiles
 * @desc Hent alle beregningsprofiler
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.get('/', calculationProfileController.getAllProfiles);

/**
 * @route GET /api/v1/calculation-profiles/stats
 * @desc Hent brugsstatistik for profiler
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.get('/stats', calculationProfileController.getProfileStats);

/**
 * @route GET /api/v1/calculation-profiles/:id
 * @desc Hent specifik beregningsprofil
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.get('/:id', calculationProfileController.getProfileById);

/**
 * @route POST /api/v1/calculation-profiles
 * @desc Opret ny beregningsprofil
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.post('/', calculationProfileController.createProfile);

/**
 * @route PUT /api/v1/calculation-profiles/:id
 * @desc Opdater beregningsprofil
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.put('/:id', calculationProfileController.updateProfile);

/**
 * @route DELETE /api/v1/calculation-profiles/:id
 * @desc Slet beregningsprofil
 * @access Private (ADMIN, PAYROLL_MANAGER)
 */
router.delete('/:id', calculationProfileController.deleteProfile);

export default router;

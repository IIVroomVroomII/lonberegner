import { Router } from 'express';
import authRoutes from './authRoutes';
import timeEntryRoutes from './timeEntryRoutes';
import payrollRoutes from './payrollRoutes';
import employeeRoutes from './employeeRoutes';
import dashboardRoutes from './dashboardRoutes';
import agreementRoutes from './agreementRoutes';
import exportRoutes from './exportRoutes';
import calculationProfileRoutes from './calculationProfileRoutes';
import conflictRoutes from './conflictRoutes';
import importRoutes from './importRoutes';

const router = Router();

// Core routes
router.use('/auth', authRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/payrolls', payrollRoutes);
router.use('/employees', employeeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/agreements', agreementRoutes);
router.use('/export', exportRoutes);
router.use('/calculation-profiles', calculationProfileRoutes);
router.use('/conflicts', conflictRoutes);
router.use('/import', importRoutes);

export default router;

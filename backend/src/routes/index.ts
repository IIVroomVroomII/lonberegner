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
import reportsRoutes from './reportsRoutes';
import auditLogRoutes from './auditLogRoutes';
import aiIntegrationsRoutes from './aiIntegrationsRoutes';
import integrationsRoutes from './integrationsRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import onboardingRoutes from './onboardingRoutes';
import apiKeyRoutes from './apiKeyRoutes';
import geofenceRoutes from './geofenceRoutes';
import gpsTrackingRoutes from './gpsTrackingRoutes';
import workCategorizationRoutes from './workCategorizationRoutes';
import timeEntryCategoryRoutes from './timeEntryCategoryRoutes';

const router = Router();

// Core routes
router.use('/auth', authRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/time-entries-category', timeEntryCategoryRoutes);
router.use('/payrolls', payrollRoutes);
router.use('/employees', employeeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/agreements', agreementRoutes);
router.use('/export', exportRoutes);
router.use('/calculation-profiles', calculationProfileRoutes);
router.use('/conflicts', conflictRoutes);
router.use('/import', importRoutes);
router.use('/reports', reportsRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/ai-integrations', aiIntegrationsRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/geofences', geofenceRoutes);
router.use('/gps-tracking', gpsTrackingRoutes);
router.use('/work-categorization', workCategorizationRoutes);

export default router;

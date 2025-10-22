import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { DataloenService } from '../services/integrations/DataloenService';

/**
 * Get all integrations for team
 */
export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    const integrations = await prisma.integrationConfig.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: integrations,
    });
  } catch (error: any) {
    logger.error('Error fetching integrations', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af integrationer',
    });
  }
};

/**
 * Get single integration
 */
export const getIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findFirst({
      where: {
        id,
        teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    return res.json({
      success: true,
      data: integration,
    });
  } catch (error: any) {
    logger.error('Error fetching integration', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af integration',
    });
  }
};

/**
 * Create or update integration configuration
 */
export const saveIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const {
      type,
      name,
      apiEndpoint,
      apiKey,
      partnerId,
      partnerSecret,
      appId,
      username,
      password,
      syncEmployees,
      syncTimeEntries,
      syncPayroll,
      config,
    } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Integration type er påkrævet',
      });
    }

    // Check if integration already exists for this team and type
    const existing = await prisma.integrationConfig.findFirst({
      where: {
        teamId,
        type,
      },
    });

    let integration;

    if (existing) {
      // Update existing
      integration = await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          name,
          apiEndpoint,
          apiKey,
          partnerId,
          partnerSecret,
          appId,
          username,
          password,
          syncEmployees,
          syncTimeEntries,
          syncPayroll,
          config,
          status: 'CONFIGURED',
          updatedAt: new Date(),
        },
      });

      logger.info('Integration updated', { integrationId: integration.id, type });
    } else {
      // Create new
      integration = await prisma.integrationConfig.create({
        data: {
          teamId,
          type,
          name: name || type,
          apiEndpoint,
          apiKey,
          partnerId,
          partnerSecret,
          appId,
          username,
          password,
          syncEmployees: syncEmployees || false,
          syncTimeEntries: syncTimeEntries || false,
          syncPayroll: syncPayroll || false,
          config,
          status: 'CONFIGURED',
        },
      });

      logger.info('Integration created', { integrationId: integration.id, type });
    }

    return res.json({
      success: true,
      data: integration,
      message: existing ? 'Integration opdateret' : 'Integration oprettet',
    });
  } catch (error: any) {
    logger.error('Error saving integration', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved gem af integration',
    });
  }
};

/**
 * Test integration connection
 */
export const testIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findFirst({
      where: {
        id,
        teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    let testResult: { success: boolean; message: string };

    // Test based on integration type
    switch (integration.type) {
      case 'DATALON':
        if (!integration.partnerId || !integration.partnerSecret || !integration.appId || !integration.apiKey) {
          return res.status(400).json({
            success: false,
            message: 'Manglende credentials. Kræver PartnerId, PartnerSecret, AppId og ApiKey.',
          });
        }

        const dataloenService = new DataloenService({
          partnerId: integration.partnerId,
          partnerSecret: integration.partnerSecret,
          appId: integration.appId,
          apiKey: integration.apiKey,
          environment: integration.apiEndpoint?.includes('preprod') ? 'preprod' : 'production',
        });

        testResult = await dataloenService.testConnection();
        break;

      case 'DANLON':
      case 'PROLON':
        testResult = {
          success: false,
          message: `${integration.type} integration er endnu ikke implementeret`,
        };
        break;

      default:
        testResult = {
          success: false,
          message: 'Ukendt integration type',
        };
    }

    // Update integration with test result
    await prisma.integrationConfig.update({
      where: { id: integration.id },
      data: {
        lastTestedAt: new Date(),
        lastTestSuccess: testResult.success,
        lastErrorMessage: testResult.success ? null : testResult.message,
        status: testResult.success ? 'TESTED_OK' : 'TESTED_ERROR',
      },
    });

    logger.info('Integration tested', {
      integrationId: integration.id,
      type: integration.type,
      success: testResult.success,
    });

    return res.json({
      success: true,
      data: testResult,
    });
  } catch (error: any) {
    logger.error('Error testing integration', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved test af integration',
    });
  }
};

/**
 * Activate integration
 */
export const activateIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findFirst({
      where: {
        id,
        teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    // Can only activate if tested successfully
    if (integration.status !== 'TESTED_OK' && integration.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Integration skal testes succesfuldt før den kan aktiveres',
      });
    }

    const updated = await prisma.integrationConfig.update({
      where: { id: integration.id },
      data: {
        isActive: true,
        status: 'ACTIVE',
      },
    });

    logger.info('Integration activated', { integrationId: integration.id });

    return res.json({
      success: true,
      data: updated,
      message: 'Integration aktiveret',
    });
  } catch (error: any) {
    logger.error('Error activating integration', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved aktivering af integration',
    });
  }
};

/**
 * Deactivate integration
 */
export const deactivateIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findFirst({
      where: {
        id,
        teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    const updated = await prisma.integrationConfig.update({
      where: { id: integration.id },
      data: {
        isActive: false,
      },
    });

    logger.info('Integration deactivated', { integrationId: integration.id });

    return res.json({
      success: true,
      data: updated,
      message: 'Integration deaktiveret',
    });
  } catch (error: any) {
    logger.error('Error deactivating integration', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved deaktivering af integration',
    });
  }
};

/**
 * Trigger manual sync
 */
export const syncIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findFirst({
      where: {
        id,
        teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    if (!integration.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Integration er ikke aktiv',
      });
    }

    let syncResult;

    // Sync based on integration type
    switch (integration.type) {
      case 'DATALON':
        if (!integration.partnerId || !integration.partnerSecret || !integration.appId || !integration.apiKey) {
          return res.status(400).json({
            success: false,
            message: 'Manglende credentials',
          });
        }

        const dataloenService = new DataloenService({
          partnerId: integration.partnerId,
          partnerSecret: integration.partnerSecret,
          appId: integration.appId,
          apiKey: integration.apiKey,
          environment: integration.apiEndpoint?.includes('preprod') ? 'preprod' : 'production',
        });

        syncResult = await dataloenService.syncEmployees(integration.lastSyncAt || undefined);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Synkronisering ikke implementeret for denne integration type',
        });
    }

    // Update last sync timestamp
    await prisma.integrationConfig.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
      },
    });

    logger.info('Integration synced', {
      integrationId: integration.id,
      type: integration.type,
      result: syncResult,
    });

    return res.json({
      success: true,
      data: syncResult,
      message: 'Synkronisering gennemført',
    });
  } catch (error: any) {
    logger.error('Error syncing integration', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved synkronisering',
    });
  }
};

/**
 * Delete integration
 */
export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findFirst({
      where: {
        id,
        teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    await prisma.integrationConfig.delete({
      where: { id: integration.id },
    });

    logger.info('Integration deleted', { integrationId: integration.id });

    return res.json({
      success: true,
      message: 'Integration slettet',
    });
  } catch (error: any) {
    logger.error('Error deleting integration', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved sletning af integration',
    });
  }
};

import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { IntegrationEngine } from '../services/integration/IntegrationEngine';
import { ClaudeService } from '../services/claude/ClaudeService';

const integrationEngine = new IntegrationEngine();
const claudeService = new ClaudeService();

// Get all integrations for team
export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team',
      });
    }

    const integrations = await prisma.aIIntegration.findMany({
      where: { teamId },
      include: {
        uploadedFiles: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          take: 10, // Last 10 messages for preview
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: integrations.map((integration) => ({
        ...integration,
        apiKey: integration.apiKey ? '***********' : null, // Hide API key
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching integrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af integrationer',
    });
  }
};

// Get single integration
export const getIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
      include: {
        uploadedFiles: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
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
      data: {
        ...integration,
        apiKey: integration.apiKey ? '***********' : null, // Hide API key
      },
    });
  } catch (error: any) {
    logger.error('Error fetching integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af integration',
    });
  }
};

// Create new integration
export const createIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const userId = authReq.user?.id;

    if (!teamId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team',
      });
    }

    const { name, description, integrationType, targetSystem, documentationUrls } = req.body;

    const integration = await prisma.aIIntegration.create({
      data: {
        teamId,
        name,
        description,
        integrationType,
        targetSystem,
        documentationUrls: documentationUrls || [],
        createdById: userId,
        status: 'DRAFT',
      },
    });

    return res.status(201).json({
      success: true,
      data: integration,
    });
  } catch (error: any) {
    logger.error('Error creating integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved oprettelse af integration',
    });
  }
};

// Update integration
export const updateIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    const updateData: any = {};

    // Allow updating these fields
    const allowedFields = [
      'name',
      'description',
      'integrationType',
      'targetSystem',
      'documentationUrls',
      'apiEndpoint',
      'authMethod',
      'syncFrequency',
      'isActive',
      'status',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Handle mapping rules separately (it's JSON)
    if (req.body.mappingRules) {
      updateData.mappingRules = req.body.mappingRules;
    }

    const updated = await prisma.aIIntegration.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      data: {
        ...updated,
        apiKey: updated.apiKey ? '***********' : null,
      },
    });
  } catch (error: any) {
    logger.error('Error updating integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved opdatering af integration',
    });
  }
};

// Save/update credentials
export const saveCredentials = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;
    const { apiKey: plainApiKey, credentials } = req.body;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    const updateData: any = {};

    // Encrypt API key
    if (plainApiKey) {
      updateData.apiKey = encrypt(plainApiKey);
    }

    // Encrypt credentials JSON
    if (credentials) {
      updateData.credentials = encrypt(JSON.stringify(credentials));
    }

    await prisma.aIIntegration.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      message: 'Credentials gemt sikkert',
    });
  } catch (error: any) {
    logger.error('Error saving credentials:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved gemning af credentials',
    });
  }
};

// Test connection
export const testConnection = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    // Run dry-run with limit 1
    const result = await integrationEngine.execute(id, {
      dryRun: true,
      limit: 1,
    });

    return res.json({
      success: result.success,
      message: result.success ? 'Forbindelse OK!' : 'Forbindelse fejlede',
      data: result.data ? result.data.slice(0, 1) : null, // Sample data
      errors: result.errors,
    });
  } catch (error: any) {
    logger.error('Error testing connection:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Execute integration (dry-run or real)
export const executeIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;
    const { dryRun = false, startDate, endDate, limit } = req.body;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    const result = await integrationEngine.execute(id, {
      dryRun,
      startDate,
      endDate,
      limit,
    });

    return res.json({
      success: result.success,
      data: dryRun ? result.data : undefined,
      errors: result.errors,
      metadata: result.metadata,
    });
  } catch (error: any) {
    logger.error('Error executing integration:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete integration
export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    await prisma.aIIntegration.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Integration slettet',
    });
  } catch (error: any) {
    logger.error('Error deleting integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved sletning af integration',
    });
  }
};

// Chat with Claude to get integration assistance
export const chatWithClaude = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;
    const { message, documentationUrls, fileIds } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Besked er påkrævet',
      });
    }

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
      include: {
        uploadedFiles: true,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    // Load and decode uploaded files if specified
    let uploadedFiles: Array<{ filename: string; content: string; mimeType: string }> = [];
    if (fileIds && fileIds.length > 0) {
      const files = await prisma.integrationFile.findMany({
        where: {
          id: { in: fileIds },
          integrationId: id,
        },
      });

      uploadedFiles = files.map(f => ({
        filename: f.fileName,
        content: f.parsedContent ? Buffer.from(f.parsedContent, 'base64').toString('utf-8') : '',
        mimeType: f.fileType,
      }));
    }

    const result = await claudeService.chat(id, message, {
      integrationId: id,
      documentationUrls,
      uploadedFiles,
    });

    // If Claude suggested a config, optionally save it to integration
    if (result.configSuggestion) {
      await prisma.aIIntegration.update({
        where: { id },
        data: {
          mappingRules: result.configSuggestion,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        response: result.response,
        configSuggestion: result.configSuggestion,
      },
    });
  } catch (error: any) {
    logger.error('Error chatting with Claude:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Fejl ved kommunikation med Claude',
    });
  }
};

// Get chat history
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
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
      data: integration.chatMessages,
    });
  } catch (error: any) {
    logger.error('Error fetching chat history:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af chat historik',
    });
  }
};

// Clear chat history
export const clearChatHistory = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    await prisma.integrationChatMessage.deleteMany({
      where: { integrationId: id },
    });

    return res.json({
      success: true,
      message: 'Chat historik ryddet',
    });
  } catch (error: any) {
    logger.error('Error clearing chat history:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved rydning af chat historik',
    });
  }
};

// Upload file to integration
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Ingen fil uploadet',
      });
    }

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    // Store file in database
    const uploadedFile = await prisma.integrationFile.create({
      data: {
        integrationId: id,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        fileUrl: `integration-files/${id}/${file.originalname}`, // Virtual URL
        parsedContent: file.buffer.toString('base64'), // Store as base64 in parsedContent
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: uploadedFile.id,
        filename: uploadedFile.fileName,
        mimeType: uploadedFile.fileType,
        size: uploadedFile.fileSize,
        uploadedAt: uploadedFile.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Error uploading file:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved upload af fil',
    });
  }
};

// Get file content
export const getFile = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id, fileId } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    const file = await prisma.integrationFile.findFirst({
      where: { id: fileId, integrationId: id },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Fil ikke fundet',
      });
    }

    // Decode base64 and send file
    const buffer = Buffer.from(file.parsedContent || '', 'base64');
    res.setHeader('Content-Type', file.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return res.send(buffer);
  } catch (error: any) {
    logger.error('Error getting file:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af fil',
    });
  }
};

// Delete file
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { id, fileId } = req.params;

    const integration = await prisma.aIIntegration.findFirst({
      where: { id, teamId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration ikke fundet',
      });
    }

    const file = await prisma.integrationFile.findFirst({
      where: { id: fileId, integrationId: id },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Fil ikke fundet',
      });
    }

    await prisma.integrationFile.delete({
      where: { id: fileId },
    });

    return res.json({
      success: true,
      message: 'Fil slettet',
    });
  } catch (error: any) {
    logger.error('Error deleting file:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved sletning af fil',
    });
  }
};

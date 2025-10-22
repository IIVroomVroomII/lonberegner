import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Generate a secure random API key
const generateApiKey = (): string => {
  // Format: sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `sk_live_${randomBytes}`;
};

// Create new API key
export const createApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { name, description, scopes, expiresAt } = req.body;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    if (!name) {
      throw new AppError('Navn er påkrævet', 400);
    }

    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);
    const keyPrefix = apiKey.substring(0, 16) + '...'; // Show first 16 chars

    // Create API key in database
    const createdKey = await prisma.apiKey.create({
      data: {
        teamId: user.teamId,
        name,
        description: description || null,
        keyHash,
        keyPrefix,
        scopes: scopes || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    logger.info(`API key created: ${name} for team ${user.teamId}`);

    // Return the plain-text key ONLY once
    res.status(201).json({
      status: 'success',
      data: {
        ...createdKey,
        key: apiKey, // This is the only time we show the full key
      },
    });
  } catch (error) {
    next(error);
  }
};

// List all API keys for team
export const listApiKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        teamId: user.teamId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      status: 'success',
      data: { apiKeys },
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate API key
export const deactivateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    // Verify key belongs to user's team
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        teamId: user.teamId,
      },
    });

    if (!apiKey) {
      throw new AppError('API nøgle ikke fundet', 404);
    }

    // Deactivate key
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`API key deactivated: ${apiKey.name} for team ${user.teamId}`);

    res.json({
      status: 'success',
      message: 'API nøgle deaktiveret',
    });
  } catch (error) {
    next(error);
  }
};

// Delete API key
export const deleteApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    // Verify key belongs to user's team
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        teamId: user.teamId,
      },
    });

    if (!apiKey) {
      throw new AppError('API nøgle ikke fundet', 404);
    }

    // Delete key
    await prisma.apiKey.delete({
      where: { id },
    });

    logger.info(`API key deleted: ${apiKey.name} for team ${user.teamId}`);

    res.json({
      status: 'success',
      message: 'API nøgle slettet',
    });
  } catch (error) {
    next(error);
  }
};

// Verify API key (used by middleware)
export const verifyApiKey = async (apiKey: string): Promise<{ teamId: string; scopes: string[] } | null> => {
  try {
    // Find all active API keys
    const keys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    // Check each key
    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        // Update last used timestamp
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          teamId: key.teamId,
          scopes: key.scopes,
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Error verifying API key:', error);
    return null;
  }
};

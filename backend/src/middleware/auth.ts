import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';
import { verifyApiKey } from '../controllers/apiKeyController';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    teamId?: string;
  };
  apiKey?: {
    teamId: string;
    scopes: string[];
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Ingen adgang. Log venligst ind.', 401);
    }

    const token = authHeader.substring(7);

    // Check if it's an API key (starts with sk_live_)
    if (token.startsWith('sk_live_')) {
      const apiKeyData = await verifyApiKey(token);

      if (!apiKeyData) {
        throw new AppError('Ugyldig API nøgle', 401);
      }

      // Set apiKey context for API key authentication
      req.apiKey = {
        teamId: apiKeyData.teamId,
        scopes: apiKeyData.scopes,
      };

      // Also set user context with teamId for compatibility with existing code
      req.user = {
        id: 'api-key', // Special ID for API key access
        email: 'api@system',
        role: 'TEAM_MEMBER' as UserRole, // Default role for API keys
        teamId: apiKeyData.teamId,
      };

      return next();
    }

    // Otherwise, treat as JWT token
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new AppError('JWT_SECRET er ikke konfigureret', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
      email: string;
      role: UserRole;
    };

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        teamId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Ugyldig token eller bruger er inaktiv', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId || undefined,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Ugyldig token', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Ikke autentificeret', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Du har ikke tilladelse til at udføre denne handling', 403)
      );
    }

    next();
  };
};

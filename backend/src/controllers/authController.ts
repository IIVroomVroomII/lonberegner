import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      name,
      organizationNumber,
      contactEmail,
      contactPhone,
      role = 'ADMIN',
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: contactEmail || email },
    });

    if (existingUser) {
      throw new AppError('Bruger eksisterer allerede', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create team first
    const team = await prisma.team.create({
      data: {
        name,
        organizationNumber,
        contactEmail: contactEmail || email,
        contactPhone,
        isActive: true,
      },
    });

    // Create user with team
    const user = await prisma.user.create({
      data: {
        email: contactEmail || email,
        passwordHash,
        name,
        role,
        teamId: team.id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
      },
    });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT_SECRET er ikke konfigureret', 500);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, teamId: user.teamId },
      jwtSecret as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    logger.info(`Ny bruger og team oprettet: ${user.email}, Team: ${team.name}`);

    res.status(201).json({
      success: true,
      token,
      data: { user, team },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new AppError('Ugyldigt email eller password', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Ugyldigt email eller password', 401);
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT_SECRET er ikke konfigureret', 500);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    logger.info(`Bruger logget ind: ${user.email}`);

    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employee: true,
      },
    });

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

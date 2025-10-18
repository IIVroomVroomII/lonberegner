import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Mock Prisma Client
jest.mock('../config/database', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

// Mock Logger
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Export mocked prisma for brug i tests
import prisma from '../config/database';
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

import { PrismaClient, Prisma, GPSConflictStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Interface for GPS data from mobile app
 */
export interface QueuedGPSData {
  id?: string; // Optional - server will generate if not provided
  clientId: string; // Client-generated UUID for idempotency
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date | string;
  batteryLevel?: number;
  speed?: number;
  heading?: number;
}

/**
 * Result from batch processing
 */
export interface ProcessResult {
  success: boolean;
  created: number;
  duplicates: number;
  conflicts: number;
  errors: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * GPS Queue Service
 * Handles batch uploads of GPS data from offline mobile devices
 */
export class GPSQueueService {
  /**
   * Process a batch of GPS data points
   * Handles idempotency, conflict detection, and batch insertion
   */
  async processBatch(data: QueuedGPSData[]): Promise<ProcessResult> {
    const result: ProcessResult = {
      success: true,
      created: 0,
      duplicates: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      // Validate batch
      const validation = await this.validateBatch(data);
      if (!validation.valid) {
        return {
          success: false,
          created: 0,
          duplicates: 0,
          conflicts: 0,
          errors: validation.errors,
        };
      }

      // Check for existing points with same clientId (idempotency)
      const clientIds = data.map(d => d.clientId).filter(Boolean);
      const existingPoints = await prisma.gPSPoint.findMany({
        where: {
          clientId: {
            in: clientIds,
          },
        },
        select: {
          clientId: true,
        },
      });

      const existingClientIds = new Set(existingPoints.map(p => p.clientId));

      // Filter out duplicates
      const newPoints = data.filter(d => !existingClientIds.has(d.clientId));
      result.duplicates = data.length - newPoints.length;

      // Process each new point
      for (const point of newPoints) {
        try {
          // Check for conflicts (same employee, similar timestamp)
          const conflict = await this.detectConflict(point);

          if (conflict) {
            // Create conflict record
            await prisma.gPSConflict.create({
              data: {
                employeeId: point.employeeId,
                clientData: point as any,
                serverData: conflict as any,
                status: GPSConflictStatus.PENDING,
              },
            });
            result.conflicts++;
          } else {
            // No conflict - create point
            await prisma.gPSPoint.create({
              data: {
                clientId: point.clientId,
                employeeId: point.employeeId,
                latitude: new Prisma.Decimal(point.latitude),
                longitude: new Prisma.Decimal(point.longitude),
                accuracy: new Prisma.Decimal(point.accuracy),
                timestamp: new Date(point.timestamp),
                batteryLevel: point.batteryLevel
                  ? new Prisma.Decimal(point.batteryLevel)
                  : null,
                speed: point.speed ? new Prisma.Decimal(point.speed) : null,
                heading: point.heading ? new Prisma.Decimal(point.heading) : null,
                syncedAt: new Date(),
              },
            });
            result.created++;
          }
        } catch (error: any) {
          result.errors.push(`Failed to process point ${point.clientId}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Batch processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Detect conflicts for a GPS point
   * A conflict occurs when there's an existing point for the same employee within 5 seconds
   */
  private async detectConflict(point: QueuedGPSData): Promise<any | null> {
    const timestamp = new Date(point.timestamp);
    const fiveSecondsAgo = new Date(timestamp.getTime() - 5000);
    const fiveSecondsAhead = new Date(timestamp.getTime() + 5000);

    const existingPoint = await prisma.gPSPoint.findFirst({
      where: {
        employeeId: point.employeeId,
        timestamp: {
          gte: fiveSecondsAgo,
          lte: fiveSecondsAhead,
        },
        clientId: {
          not: point.clientId,
        },
      },
    });

    if (existingPoint) {
      return {
        id: existingPoint.id,
        timestamp: existingPoint.timestamp,
        latitude: existingPoint.latitude.toString(),
        longitude: existingPoint.longitude.toString(),
      };
    }

    return null;
  }

  /**
   * Resolve a conflict by choosing client, server, or manual data
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'client' | 'server' | 'manual',
    manualData?: QueuedGPSData
  ): Promise<void> {
    const conflict = await prisma.gPSConflict.findUnique({
      where: { id: conflictId },
      include: { gpsPoints: true },
    });

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    let resolvedData: any;

    switch (resolution) {
      case 'client':
        resolvedData = conflict.clientData;
        break;
      case 'server':
        resolvedData = conflict.serverData;
        break;
      case 'manual':
        if (!manualData) {
          throw new Error('Manual data required for manual resolution');
        }
        resolvedData = manualData;
        break;
    }

    // Create GPS point from resolved data
    const data = resolvedData as QueuedGPSData;
    await prisma.gPSPoint.create({
      data: {
        clientId: data.clientId,
        employeeId: data.employeeId,
        latitude: new Prisma.Decimal(data.latitude),
        longitude: new Prisma.Decimal(data.longitude),
        accuracy: new Prisma.Decimal(data.accuracy),
        timestamp: new Date(data.timestamp),
        batteryLevel: data.batteryLevel !== undefined && data.batteryLevel !== null
          ? new Prisma.Decimal(data.batteryLevel)
          : null,
        speed: data.speed !== undefined && data.speed !== null
          ? new Prisma.Decimal(data.speed)
          : null,
        heading: data.heading !== undefined && data.heading !== null
          ? new Prisma.Decimal(data.heading)
          : null,
        syncedAt: new Date(),
      },
    });

    // Update conflict status
    await prisma.gPSConflict.update({
      where: { id: conflictId },
      data: {
        resolvedData: resolvedData as any,
        status: GPSConflictStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Validate a batch of GPS data
   */
  async validateBatch(data: QueuedGPSData[]): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors };
    }

    if (data.length === 0) {
      errors.push('Batch cannot be empty');
      return { valid: false, errors };
    }

    if (data.length > 100) {
      errors.push('Batch size cannot exceed 100 points');
      return { valid: false, errors };
    }

    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      const prefix = `Point ${i}:`;

      // Required fields
      if (!point.clientId) {
        errors.push(`${prefix} clientId is required`);
      }
      if (!point.employeeId) {
        errors.push(`${prefix} employeeId is required`);
      }
      if (typeof point.latitude !== 'number') {
        errors.push(`${prefix} latitude must be a number`);
      }
      if (typeof point.longitude !== 'number') {
        errors.push(`${prefix} longitude must be a number`);
      }
      if (typeof point.accuracy !== 'number') {
        errors.push(`${prefix} accuracy must be a number`);
      }
      if (!point.timestamp) {
        errors.push(`${prefix} timestamp is required`);
      }

      // Validate ranges
      if (point.latitude < -90 || point.latitude > 90) {
        errors.push(`${prefix} latitude must be between -90 and 90`);
      }
      if (point.longitude < -180 || point.longitude > 180) {
        errors.push(`${prefix} longitude must be between -180 and 180`);
      }
      if (point.accuracy < 0) {
        errors.push(`${prefix} accuracy must be positive`);
      }
      if (point.batteryLevel && (point.batteryLevel < 0 || point.batteryLevel > 100)) {
        errors.push(`${prefix} batteryLevel must be between 0 and 100`);
      }

      // Validate timestamp
      const timestamp = new Date(point.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push(`${prefix} invalid timestamp format`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get sync status for an employee
   */
  async getSyncStatus(employeeId: string): Promise<{
    pendingConflicts: number;
    lastSyncedAt: Date | null;
    totalPoints: number;
  }> {
    const [pendingConflicts, lastPoint, totalPoints] = await Promise.all([
      prisma.gPSConflict.count({
        where: {
          employeeId,
          status: GPSConflictStatus.PENDING,
        },
      }),
      prisma.gPSPoint.findFirst({
        where: { employeeId },
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      }),
      prisma.gPSPoint.count({
        where: { employeeId },
      }),
    ]);

    return {
      pendingConflicts,
      lastSyncedAt: lastPoint?.syncedAt || null,
      totalPoints,
    };
  }

  /**
   * Get all pending conflicts for an employee
   */
  async getPendingConflicts(employeeId: string) {
    return prisma.gPSConflict.findMany({
      where: {
        employeeId,
        status: GPSConflictStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Reject a conflict (discard both client and server data)
   */
  async rejectConflict(conflictId: string): Promise<void> {
    await prisma.gPSConflict.update({
      where: { id: conflictId },
      data: {
        status: GPSConflictStatus.REJECTED,
        resolvedAt: new Date(),
      },
    });
  }
}

export const gpsQueueService = new GPSQueueService();

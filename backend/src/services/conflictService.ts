import prisma from '../config/database';
import {
  ConflictEntry,
  ConflictType,
  ConflictStatus,
  ConflictResolution,
  CalculationProfile,
  RoundingDirection,
  TimeStartMode
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateConflictDTO {
  timeEntryId: string;
  employeeId: string;
  calculationProfileId: string;
  conflictType: ConflictType;
  conflictDescription: string;
  originalStartTime: Date;
  originalEndTime?: Date;
  originalBreakDuration: number;
  suggestedStartTime: Date;
  suggestedEndTime?: Date;
  suggestedBreakDuration: number;
  deviationMinutes: number;
  deviationPercent: number;
}

export interface ResolveConflictDTO {
  resolution: ConflictResolution;
  resolvedBy: string;
  resolutionNote?: string;
  finalStartTime?: Date;
  finalEndTime?: Date;
  finalBreakDuration?: number;
}

/**
 * Hent alle konflikter med filtre
 */
export async function getAllConflicts(filters?: {
  status?: ConflictStatus;
  employeeId?: string;
  conflictType?: ConflictType;
  fromDate?: Date;
  toDate?: Date;
}) {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.employeeId) {
    where.employeeId = filters.employeeId;
  }

  if (filters?.conflictType) {
    where.conflictType = filters.conflictType;
  }

  if (filters?.fromDate || filters?.toDate) {
    where.createdAt = {};
    if (filters.fromDate) where.createdAt.gte = filters.fromDate;
    if (filters.toDate) where.createdAt.lte = filters.toDate;
  }

  return await prisma.conflictEntry.findMany({
    where,
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' }
    ]
  });
}

/**
 * Hent konflikt per ID
 */
export async function getConflictById(id: string): Promise<ConflictEntry | null> {
  return await prisma.conflictEntry.findUnique({
    where: { id }
  });
}

/**
 * Opret ny konflikt
 */
export async function createConflict(data: CreateConflictDTO): Promise<ConflictEntry> {
  return await prisma.conflictEntry.create({
    data: {
      timeEntryId: data.timeEntryId,
      employeeId: data.employeeId,
      calculationProfileId: data.calculationProfileId,
      conflictType: data.conflictType,
      conflictDescription: data.conflictDescription,
      originalStartTime: data.originalStartTime,
      originalEndTime: data.originalEndTime,
      originalBreakDuration: data.originalBreakDuration,
      suggestedStartTime: data.suggestedStartTime,
      suggestedEndTime: data.suggestedEndTime,
      suggestedBreakDuration: data.suggestedBreakDuration,
      deviationMinutes: data.deviationMinutes,
      deviationPercent: new Decimal(data.deviationPercent),
      status: ConflictStatus.PENDING
    }
  });
}

/**
 * Løs konflikt
 */
export async function resolveConflict(
  id: string,
  data: ResolveConflictDTO
): Promise<ConflictEntry> {
  const conflict = await prisma.conflictEntry.findUnique({
    where: { id }
  });

  if (!conflict) {
    throw new Error('Konflikt ikke fundet');
  }

  if (conflict.status !== ConflictStatus.PENDING) {
    throw new Error('Konflikt er allerede løst');
  }

  // Opdater konflikt med løsning
  const resolvedConflict = await prisma.conflictEntry.update({
    where: { id },
    data: {
      status: ConflictStatus.APPROVED,
      resolution: data.resolution,
      resolvedBy: data.resolvedBy,
      resolvedAt: new Date(),
      resolutionNote: data.resolutionNote,
      finalStartTime: data.finalStartTime,
      finalEndTime: data.finalEndTime,
      finalBreakDuration: data.finalBreakDuration
    }
  });

  // Opdater tidsregistrering hvis der er en final værdi
  if (data.finalStartTime || data.finalEndTime || data.finalBreakDuration !== undefined) {
    await prisma.timeEntry.update({
      where: { id: conflict.timeEntryId },
      data: {
        startTime: data.finalStartTime || conflict.originalStartTime,
        endTime: data.finalEndTime || conflict.originalEndTime,
        breakDuration: data.finalBreakDuration ?? conflict.originalBreakDuration
      }
    });
  }

  return resolvedConflict;
}

/**
 * Afvis konflikt (behold original tid)
 */
export async function rejectConflict(
  id: string,
  resolvedBy: string,
  note?: string
): Promise<ConflictEntry> {
  return await prisma.conflictEntry.update({
    where: { id },
    data: {
      status: ConflictStatus.REJECTED,
      resolution: ConflictResolution.ACCEPT_ORIGINAL,
      resolvedBy,
      resolvedAt: new Date(),
      resolutionNote: note,
      finalStartTime: undefined,
      finalEndTime: undefined,
      finalBreakDuration: undefined
    }
  });
}

/**
 * Batch godkend konflikter
 */
export async function batchApproveConflicts(
  conflictIds: string[],
  resolvedBy: string
): Promise<number> {
  const conflicts = await prisma.conflictEntry.findMany({
    where: {
      id: { in: conflictIds },
      status: ConflictStatus.PENDING
    }
  });

  // Opdater alle konflikter
  for (const conflict of conflicts) {
    await resolveConflict(conflict.id, {
      resolution: ConflictResolution.ACCEPT_SUGGESTED,
      resolvedBy,
      finalStartTime: conflict.suggestedStartTime,
      finalEndTime: conflict.suggestedEndTime || undefined,
      finalBreakDuration: conflict.suggestedBreakDuration
    });
  }

  return conflicts.length;
}

/**
 * Få konflikt statistik
 */
export async function getConflictStats(filters?: {
  employeeId?: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  const where: any = {};

  if (filters?.employeeId) {
    where.employeeId = filters.employeeId;
  }

  if (filters?.fromDate || filters?.toDate) {
    where.createdAt = {};
    if (filters.fromDate) where.createdAt.gte = filters.fromDate;
    if (filters.toDate) where.createdAt.lte = filters.toDate;
  }

  const [total, pending, approved, rejected, byType] = await Promise.all([
    prisma.conflictEntry.count({ where }),
    prisma.conflictEntry.count({ where: { ...where, status: ConflictStatus.PENDING } }),
    prisma.conflictEntry.count({ where: { ...where, status: ConflictStatus.APPROVED } }),
    prisma.conflictEntry.count({ where: { ...where, status: ConflictStatus.REJECTED } }),
    prisma.conflictEntry.groupBy({
      by: ['conflictType'],
      where,
      _count: true
    })
  ]);

  return {
    total,
    pending,
    approved,
    rejected,
    byType: byType.map(item => ({
      type: item.conflictType,
      count: item._count
    }))
  };
}

/**
 * Analyser tidsregistrering mod beregningsprofil
 * Returner konflikter hvis der er afvigelser
 */
export async function analyzeTimeEntry(
  timeEntryId: string,
  employeeId: string,
  profileId: string
): Promise<CreateConflictDTO[]> {
  const timeEntry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId }
  });

  const profile = await prisma.calculationProfile.findUnique({
    where: { id: profileId }
  });

  if (!timeEntry || !profile) {
    return [];
  }

  const conflicts: CreateConflictDTO[] = [];

  // 1. Tjek tidsafrunding
  if (profile.timeRoundingMinutes > 0) {
    const roundedStart = roundTime(
      timeEntry.startTime,
      profile.timeRoundingMinutes,
      profile.timeRoundingDirection
    );

    const roundedEnd = timeEntry.endTime
      ? roundTime(
          timeEntry.endTime,
          profile.timeRoundingMinutes,
          profile.timeRoundingDirection
        )
      : null;

    const startDiff = Math.abs(
      (roundedStart.getTime() - timeEntry.startTime.getTime()) / (1000 * 60)
    );

    const endDiff = roundedEnd && timeEntry.endTime
      ? Math.abs((roundedEnd.getTime() - timeEntry.endTime.getTime()) / (1000 * 60))
      : 0;

    if (startDiff > 0 || endDiff > 0) {
      const totalMinutes = timeEntry.endTime
        ? (timeEntry.endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60)
        : 480; // 8 timer default

      const deviationPercent = ((startDiff + endDiff) / totalMinutes) * 100;

      if (deviationPercent >= profile.conflictThresholdPercent.toNumber()) {
        conflicts.push({
          timeEntryId,
          employeeId,
          calculationProfileId: profileId,
          conflictType: ConflictType.TIME_ROUNDING,
          conflictDescription: `Tid skal afrundes til nærmeste ${profile.timeRoundingMinutes} minutter`,
          originalStartTime: timeEntry.startTime,
          originalEndTime: timeEntry.endTime || undefined,
          originalBreakDuration: timeEntry.breakDuration,
          suggestedStartTime: roundedStart,
          suggestedEndTime: roundedEnd || undefined,
          suggestedBreakDuration: timeEntry.breakDuration,
          deviationMinutes: Math.round(startDiff + endDiff),
          deviationPercent: Math.round(deviationPercent * 100) / 100
        });
      }
    }
  }

  // 2. Tjek tid før fastsat mødetid
  // Dette kræver at vi har scheduledStartTime - kan implementeres senere

  return conflicts;
}

/**
 * Hjælpefunktion til at afrunde tid
 */
function roundTime(
  date: Date,
  minutes: number,
  direction: RoundingDirection
): Date {
  const ms = 1000 * 60 * minutes;
  const roundedMs = Math.round(date.getTime() / ms) * ms;

  if (direction === RoundingDirection.UP) {
    return new Date(Math.ceil(date.getTime() / ms) * ms);
  } else if (direction === RoundingDirection.DOWN) {
    return new Date(Math.floor(date.getTime() / ms) * ms);
  } else {
    // NEAREST
    return new Date(roundedMs);
  }
}

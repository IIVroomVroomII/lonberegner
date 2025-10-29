import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Split a time entry into two separate periods
 * POST /api/v1/time-entries/:id/split
 */
export const splitTimeEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { splitTime, firstPeriod, secondPeriod } = req.body;

    // Get the original time entry
    const originalEntry = await prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!originalEntry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry ikke fundet',
      });
    }

    // Validate split time is between start and end
    const splitDateTime = new Date(splitTime);
    if (splitDateTime <= originalEntry.startTime || (originalEntry.endTime && splitDateTime >= originalEntry.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Split tidspunkt skal være mellem start og slut tidspunkt',
      });
    }

    // Cannot split entries that are already CALCULATED
    if (originalEntry.status === 'CALCULATED') {
      return res.status(400).json({
        success: false,
        message: 'Kan ikke splitte en time entry der allerede er beregnet til løn',
      });
    }

    // Create two new time entries
    const [firstEntry, secondEntry] = await prisma.$transaction(async (tx) => {
      // Create first period (original start to split time)
      const first = await tx.timeEntry.create({
        data: {
          employeeId: originalEntry.employeeId,
          date: originalEntry.date,
          startTime: originalEntry.startTime,
          endTime: splitDateTime,
          breakDuration: firstPeriod?.breakDuration ?? 0,
          breaks: originalEntry.breaks ? (originalEntry.breaks as Prisma.InputJsonValue) : Prisma.JsonNull,
          location: firstPeriod?.location ?? originalEntry.location,
          route: firstPeriod?.route ?? originalEntry.route,
          taskType: firstPeriod?.taskType ?? originalEntry.taskType,
          isIrregularHours: originalEntry.isIrregularHours,
          isNightWork: originalEntry.isNightWork,
          isWeekend: originalEntry.isWeekend,
          isHoliday: originalEntry.isHoliday,
          comment: firstPeriod?.comment ?? originalEntry.comment,
          status: 'PENDING',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      // Create second period (split time to original end)
      const second = await tx.timeEntry.create({
        data: {
          employeeId: originalEntry.employeeId,
          date: originalEntry.date,
          startTime: splitDateTime,
          endTime: originalEntry.endTime,
          breakDuration: secondPeriod?.breakDuration ?? 0,
          breaks: originalEntry.breaks ? (originalEntry.breaks as Prisma.InputJsonValue) : Prisma.JsonNull,
          location: secondPeriod?.location ?? originalEntry.location,
          route: secondPeriod?.route ?? originalEntry.route,
          taskType: secondPeriod?.taskType ?? originalEntry.taskType,
          isIrregularHours: originalEntry.isIrregularHours,
          isNightWork: originalEntry.isNightWork,
          isWeekend: originalEntry.isWeekend,
          isHoliday: originalEntry.isHoliday,
          comment: secondPeriod?.comment ?? originalEntry.comment,
          status: 'PENDING',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      // Delete the original entry
      await tx.timeEntry.delete({
        where: { id },
      });

      return [first, second];
    });

    return res.status(200).json({
      success: true,
      message: 'Time entry er blevet splittet',
      data: {
        firstPeriod: firstEntry,
        secondPeriod: secondEntry,
      },
    });
  } catch (error: any) {
    console.error('Error splitting time entry:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved splitting af time entry',
      error: error.message,
    });
  }
};

/**
 * Merge multiple time entries into one
 * POST /api/v1/time-entries/merge
 */
export const mergeTimeEntries = async (req: Request, res: Response) => {
  try {
    const { timeEntryIds, mergedData } = req.body;

    // Get all time entries to merge
    const entries = await prisma.timeEntry.findMany({
      where: {
        id: { in: timeEntryIds },
      },
      orderBy: { startTime: 'asc' },
    });

    if (entries.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Mindst to time entries skal vælges',
      });
    }

    // Validate all entries belong to same employee
    const employeeIds = new Set(entries.map(e => e.employeeId));
    if (employeeIds.size > 1) {
      return res.status(400).json({
        success: false,
        message: 'Alle time entries skal tilhøre samme medarbejder',
      });
    }

    // Cannot merge entries that are CALCULATED
    const calculatedEntries = entries.filter(e => e.status === 'CALCULATED');
    if (calculatedEntries.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kan ikke merge time entries der allerede er beregnet til løn',
      });
    }

    // Get earliest start and latest end time
    const startTime = entries[0].startTime;
    const endTime = entries[entries.length - 1].endTime || new Date();

    // Sum up break durations
    const totalBreakDuration = entries.reduce((sum, e) => sum + e.breakDuration, 0);

    // Create merged entry
    const mergedEntry = await prisma.$transaction(async (tx) => {
      // Create new merged entry
      const merged = await tx.timeEntry.create({
        data: {
          employeeId: entries[0].employeeId,
          date: entries[0].date,
          startTime,
          endTime,
          breakDuration: mergedData.breakDuration ?? totalBreakDuration,
          breaks: entries[0].breaks ? (entries[0].breaks as Prisma.InputJsonValue) : Prisma.JsonNull,
          location: mergedData.location ?? entries[0].location,
          route: mergedData.route ?? entries[0].route,
          taskType: mergedData.taskType,
          isIrregularHours: entries.some(e => e.isIrregularHours),
          isNightWork: entries.some(e => e.isNightWork),
          isWeekend: entries.some(e => e.isWeekend),
          isHoliday: entries.some(e => e.isHoliday),
          comment: mergedData.comment ?? entries[0].comment,
          status: 'PENDING',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      // Delete original entries
      await tx.timeEntry.deleteMany({
        where: {
          id: { in: timeEntryIds },
        },
      });

      return merged;
    });

    return res.status(200).json({
      success: true,
      message: `${entries.length} time entries er blevet merged`,
      data: mergedEntry,
    });
  } catch (error: any) {
    console.error('Error merging time entries:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved merging af time entries',
      error: error.message,
    });
  }
};

/**
 * Bulk edit multiple time entries
 * PUT /api/v1/time-entries/bulk-edit
 */
export const bulkEditTimeEntries = async (req: Request, res: Response) => {
  try {
    const { timeEntryIds, updates } = req.body;

    // Validate entries exist
    const entries = await prisma.timeEntry.findMany({
      where: {
        id: { in: timeEntryIds },
      },
    });

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ingen time entries fundet',
      });
    }

    // Cannot edit entries that are CALCULATED
    const calculatedEntries = entries.filter(e => e.status === 'CALCULATED');
    if (calculatedEntries.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kan ikke redigere time entries der allerede er beregnet til løn',
      });
    }

    // Perform bulk update
    const result = await prisma.timeEntry.updateMany({
      where: {
        id: { in: timeEntryIds },
      },
      data: updates,
    });

    // Fetch updated entries
    const updatedEntries = await prisma.timeEntry.findMany({
      where: {
        id: { in: timeEntryIds },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: `${result.count} time entries er blevet opdateret`,
      data: updatedEntries,
    });
  } catch (error: any) {
    console.error('Error bulk editing time entries:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved bulk edit af time entries',
      error: error.message,
    });
  }
};

/**
 * Get time entries for a period (for timeline view)
 * GET /api/v1/time-entries/period
 */
export const getTimeEntriesForPeriod = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate, status } = req.query;

    const where: any = {
      startTime: {
        gte: new Date(startDate as string),
      },
      endTime: {
        lte: new Date(endDate as string),
      },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error('Error fetching time entries for period:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af time entries',
      error: error.message,
    });
  }
};

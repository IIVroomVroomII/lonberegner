import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/database';
import { logger } from '../config/logger';

export const createTimeEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      employeeId,
      date,
      startTime,
      endTime,
      breakDuration = 0,
      location,
      route,
      taskType,
      comment,
    } = req.body;

    // Log received data for debugging
    logger.info(`Creating time entry - received: employeeId=${employeeId}, date=${date}, startTime=${startTime}, taskType=${taskType}`);

    if (!employeeId || !date || !startTime || !taskType) {
      logger.error(`Missing required fields: employeeId=${employeeId}, date=${date}, startTime=${startTime}, taskType=${taskType}`);
      throw new AppError('employeeId, date, startTime og taskType er påkrævet', 400);
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError('Medarbejder ikke fundet', 404);
    }

    // Detect night work, weekend, holiday
    const startDate = new Date(startTime);
    const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;
    const hour = startDate.getHours();
    const isNightWork = hour < 6 || hour >= 18;

    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        breakDuration,
        location,
        route,
        taskType,
        isNightWork,
        isWeekend,
        comment,
      },
    });

    logger.info(`Tidsregistrering oprettet: ${timeEntry.id}`);

    res.status(201).json({
      status: 'success',
      data: { timeEntry },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimeEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing employeeId
    delete updates.employeeId;

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: updates,
    });

    res.json({
      status: 'success',
      data: { timeEntry },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimeEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!timeEntry) {
      throw new AppError('Tidsregistrering ikke fundet', 404);
    }

    res.json({
      status: 'success',
      data: { timeEntry },
    });
  } catch (error) {
    next(error);
  }
};

export const listTimeEntries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      employeeId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = req.query;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    if (status) {
      // Handle comma-separated status values from mobile app
      const statusString = status as string;
      if (statusString.includes(',')) {
        where.status = { in: statusString.split(',') };
      } else {
        where.status = statusString;
      }
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo as string);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          employee: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.timeEntry.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        timeEntries,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const approveTimeEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    logger.info(`Tidsregistrering godkendt: ${id}`);

    res.json({
      status: 'success',
      data: { timeEntry },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTimeEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.timeEntry.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Tidsregistrering slettet',
    });
  } catch (error) {
    next(error);
  }
};

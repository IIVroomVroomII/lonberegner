import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get pending time entries count
    const pendingTimeEntries = await prisma.timeEntry.count({
      where: {
        status: 'PENDING',
      },
    });

    // Get draft payrolls count (ready for review)
    const draftPayrolls = await prisma.payrollCalculation.count({
      where: {
        status: 'DRAFT',
      },
    });

    // Get active employees count
    const activeEmployees = await prisma.employee.count({
      where: {
        user: {
          isActive: true,
        },
      },
    });

    // Get total hours this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const timeEntriesThisMonth = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: startOfMonth,
        },
        status: 'APPROVED',
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Calculate total hours
    let totalHoursThisMonth = 0;
    timeEntriesThisMonth.forEach((entry) => {
      if (entry.startTime && entry.endTime) {
        const hours = (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60);
        totalHoursThisMonth += hours;
      }
    });

    // Get recent activity (last 5 time entries or payrolls)
    const recentTimeEntries = await prisma.timeEntry.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const recentPayrolls = await prisma.payrollCalculation.findMany({
      take: 2,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const recentActivity = [
      ...recentTimeEntries.map((entry) => ({
        type: 'time_entry',
        description: `${entry.employee.user.name} - Tidsregistrering`,
        date: entry.createdAt,
        status: entry.status,
      })),
      ...recentPayrolls.map((payroll: any) => ({
        type: 'payroll',
        description: `${payroll.employee.user.name} - Lønberegning`,
        date: payroll.createdAt,
        status: payroll.status,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    res.json({
      success: true,
      data: {
        pendingTimeEntries,
        draftPayrolls,
        activeEmployees,
        totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
        recentActivity,
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved hentning af dashboard data',
    });
  }
};

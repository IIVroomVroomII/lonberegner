import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const teamId = (req as AuthRequest).user?.teamId || '1';

    // Get current month start/end
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get active employees count
    const activeEmployees = await prisma.employee.count({
      where: {
        teamId,
        isActive: true
      },
    });

    // Get time entries this month
    const timeEntriesCount = await prisma.timeEntry.count({
      where: {
        employee: { teamId },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    // Get hours worked this month
    const timeEntriesData = await prisma.timeEntry.findMany({
      where: {
        employee: { teamId },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: {
        actualStartTime: true,
        actualEndTime: true
      }
    });

    const totalHoursThisMonth = timeEntriesData.reduce((total, entry) => {
      if (entry.actualStartTime && entry.actualEndTime) {
        const hours = (new Date(entry.actualEndTime).getTime() - new Date(entry.actualStartTime).getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    // Get pending conflicts count
    const pendingConflicts = await prisma.conflictEntry.count({
      where: {
        timeEntry: {
          employee: { teamId }
        },
        status: 'PENDING'
      }
    });

    // Get payrolls this month
    const payrollsCount = await prisma.payroll.count({
      where: {
        employee: { teamId },
        payPeriodStart: {
          gte: monthStart
        }
      }
    });

    // Get recent activity from audit logs
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        user: {
          OR: [
            { teamId },
            { employee: { teamId } }
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Get upcoming payrolls (next 7 days)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingPayrolls = await prisma.payroll.findMany({
      where: {
        employee: { teamId },
        payPeriodEnd: {
          gte: now,
          lte: nextWeek
        }
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { payPeriodEnd: 'asc' },
      take: 5
    });

    // Get top employees by hours this month
    const employeeHours = await prisma.timeEntry.groupBy({
      by: ['employeeId'],
      where: {
        employee: { teamId },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _count: {
        id: true
      }
    });

    const topEmployees = await Promise.all(
      employeeHours
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 5)
        .map(async (e) => {
          const employee = await prisma.employee.findUnique({
            where: { id: e.employeeId },
            include: {
              user: {
                select: { name: true }
              }
            }
          });

          const entries = await prisma.timeEntry.findMany({
            where: {
              employeeId: e.employeeId,
              date: {
                gte: monthStart,
                lte: monthEnd
              }
            },
            select: {
              actualStartTime: true,
              actualEndTime: true
            }
          });

          const hours = entries.reduce((total, entry) => {
            if (entry.actualStartTime && entry.actualEndTime) {
              return total + (new Date(entry.actualEndTime).getTime() - new Date(entry.actualStartTime).getTime()) / (1000 * 60 * 60);
            }
            return total;
          }, 0);

          return {
            employeeName: employee?.user.name || 'Unknown',
            hours: Math.round(hours * 10) / 10,
            entries: e._count.id
          };
        })
    );

    res.json({
      success: true,
      data: {
        overview: {
          activeEmployees,
          timeEntriesThisMonth: timeEntriesCount,
          totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
          pendingConflicts,
          payrollsThisMonth: payrollsCount
        },
        recentActivity: recentActivity.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          userName: log.user.name,
          createdAt: log.createdAt,
          changes: log.changes
        })),
        upcomingPayrolls: upcomingPayrolls.map(p => ({
          id: p.id,
          employeeName: p.employee.user.name,
          payPeriodStart: p.payPeriodStart,
          payPeriodEnd: p.payPeriodEnd,
          totalGrossPay: p.totalGrossPay,
          status: p.status
        })),
        topEmployees
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

export const getMonthlyTrends = async (req: Request, res: Response) => {
  try {
    const teamId = (req as AuthRequest).user?.teamId || '1';
    const months = 6; // Last 6 months

    const trends = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          employee: { teamId },
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        select: {
          actualStartTime: true,
          actualEndTime: true
        }
      });

      const hours = timeEntries.reduce((total, entry) => {
        if (entry.actualStartTime && entry.actualEndTime) {
          return total + (new Date(entry.actualEndTime).getTime() - new Date(entry.actualStartTime).getTime()) / (1000 * 60 * 60);
        }
        return total;
      }, 0);

      trends.push({
        month: monthStart.toLocaleDateString('da-DK', { month: 'short', year: 'numeric' }),
        hours: Math.round(hours * 10) / 10,
        entries: timeEntries.length
      });
    }

    res.json({
      success: true,
      data: trends
    });
  } catch (error: any) {
    logger.error('Error fetching monthly trends:', error);
    res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af månedlige trends',
      error: error.message
    });
  }
};

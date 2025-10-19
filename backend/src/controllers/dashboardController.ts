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
        user: {
          teamId,
          isActive: true
        }
      },
    });

    // Get time entries this month
    const timeEntriesCount = await prisma.timeEntry.count({
      where: {
        employee: {
          user: { teamId }
        },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    // Get hours worked this month
    const timeEntriesData = await prisma.timeEntry.findMany({
      where: {
        employee: {
          user: { teamId }
        },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: {
        startTime: true,
        endTime: true
      }
    });

    const totalHoursThisMonth = timeEntriesData.reduce((total, entry) => {
      if (entry.startTime && entry.endTime) {
        const hours = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    // Get employee IDs for team
    const teamEmployeeIds = await prisma.employee.findMany({
      where: {
        user: { teamId }
      },
      select: {
        id: true
      }
    });
    const employeeIds = teamEmployeeIds.map(e => e.id);

    // Get pending deviations count
    const pendingDeviations = await prisma.conflictEntry.count({
      where: {
        employeeId: {
          in: employeeIds
        },
        status: 'PENDING'
      }
    });

    // Get payrolls this month
    const payrollsCount = await prisma.payrollCalculation.count({
      where: {
        employeeId: {
          in: employeeIds
        },
        periodStart: {
          gte: monthStart
        }
      }
    });

    // Get recent activity from audit logs
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        user: {
          teamId
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
    const upcomingPayrolls = await prisma.payrollCalculation.findMany({
      where: {
        employeeId: {
          in: employeeIds
        },
        periodEnd: {
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
      orderBy: { periodEnd: 'asc' },
      take: 5
    });

    // Get top employees by hours this month
    const employeeHours = await prisma.timeEntry.groupBy({
      by: ['employeeId'],
      where: {
        employee: {
          user: { teamId }
        },
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
        .sort((a, b) => (b._count?.id || 0) - (a._count?.id || 0))
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
              startTime: true,
              endTime: true
            }
          });

          const hours = entries.reduce((total, entry) => {
            if (entry.startTime && entry.endTime) {
              return total + (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
            }
            return total;
          }, 0);

          return {
            employeeName: employee?.user.name || 'Unknown',
            hours: Math.round(hours * 10) / 10,
            entries: e._count?.id || 0
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
          pendingDeviations,
          payrollsThisMonth: payrollsCount
        },
        recentActivity: recentActivity.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          userName: log.user.name,
          createdAt: log.createdAt
        })),
        upcomingPayrolls: upcomingPayrolls.map((p: any) => ({
          id: p.id,
          employeeName: p.employee.user.name,
          payPeriodStart: p.periodStart,
          payPeriodEnd: p.periodEnd,
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
          employee: {
            user: { teamId }
          },
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        select: {
          startTime: true,
          endTime: true
        }
      });

      const hours = timeEntries.reduce((total, entry) => {
        if (entry.startTime && entry.endTime) {
          return total + (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
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

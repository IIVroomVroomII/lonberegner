import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { Parser } from 'json2csv';

export const getPayrollSummaryReport = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { startDate, endDate, format = 'json' } = req.query;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get all employee IDs for the team
    const teamEmployees = await prisma.employee.findMany({
      where: { user: { teamId } },
      select: { id: true }
    });
    const employeeIds = teamEmployees.map(e => e.id);

    // Get payroll calculations for the period
    const payrolls = await prisma.payrollCalculation.findMany({
      where: {
        employeeId: { in: employeeIds },
        periodStart: { gte: start },
        periodEnd: { lte: end }
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { periodStart: 'desc' }
    });

    const reportData = payrolls.map(payroll => ({
      employeeName: payroll.employee.user.name,
      employeeEmail: payroll.employee.user.email,
      employeeNumber: payroll.employee.employeeNumber,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      regularHours: Number(payroll.regularHours),
      overtimeHours: Number(payroll.overtimeHours),
      nightHours: Number(payroll.nightHours),
      weekendHours: Number(payroll.weekendHours),
      totalHours: Number(payroll.totalHours),
      baseSalary: Number(payroll.baseSalary),
      overtimePay: Number(payroll.overtimePay),
      nightAllowance: Number(payroll.nightAllowance),
      weekendAllowance: Number(payroll.weekendAllowance),
      totalGrossPay: Number(payroll.totalGrossPay),
      status: payroll.status
    }));

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(reportData);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=payroll_summary_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          totalPayrolls: reportData.length,
          totalGrossPay: reportData.reduce((sum, p) => sum + p.totalGrossPay, 0),
          totalHours: reportData.reduce((sum, p) => sum + p.totalHours, 0)
        },
        payrolls: reportData
      }
    });

  } catch (error: any) {
    logger.error('Error generating payroll summary report:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved generering af lønrapport'
    });
  }
};

export const getTimeEntriesReport = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { startDate, endDate, employeeId, format = 'json' } = req.query;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: any = {
      employee: { user: { teamId } },
      date: {
        gte: start,
        lte: end
      }
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const reportData = timeEntries.map(entry => {
      const hoursWorked = entry.startTime && entry.endTime
        ? (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60)
        : 0;

      return {
        employeeName: entry.employee.user.name,
        employeeNumber: entry.employee.employeeNumber,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        breakDuration: entry.breakDuration || 0,
        location: entry.location || '-',
        comment: entry.comment || '-',
        status: entry.status
      };
    });

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(reportData);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=time_entries_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          totalEntries: reportData.length,
          totalHours: reportData.reduce((sum, e) => sum + e.hoursWorked, 0)
        },
        entries: reportData
      }
    });

  } catch (error: any) {
    logger.error('Error generating time entries report:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved generering af tidsregistreringsrapport'
    });
  }
};

export const getEmployeeHoursReport = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { startDate, endDate, format = 'json' } = req.query;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();

    const employees = await prisma.employee.findMany({
      where: { user: { teamId } },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            isActive: true
          }
        },
        timeEntries: {
          where: {
            date: {
              gte: start,
              lte: end
            }
          },
          select: {
            startTime: true,
            endTime: true,
            date: true
          }
        }
      }
    });

    const reportData = employees.map(employee => {
      const totalHours = employee.timeEntries.reduce((sum, entry) => {
        if (entry.startTime && entry.endTime) {
          const hours = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      return {
        employeeName: employee.user.name,
        employeeEmail: employee.user.email,
        employeeNumber: employee.employeeNumber,
        isActive: employee.user.isActive,
        totalEntries: employee.timeEntries.length,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHoursPerDay: employee.timeEntries.length > 0
          ? Math.round((totalHours / employee.timeEntries.length) * 100) / 100
          : 0
      };
    });

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(reportData);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=employee_hours_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          totalEmployees: reportData.length,
          activeEmployees: reportData.filter(e => e.isActive).length,
          totalHours: reportData.reduce((sum, e) => sum + e.totalHours, 0)
        },
        employees: reportData.sort((a, b) => b.totalHours - a.totalHours)
      }
    });

  } catch (error: any) {
    logger.error('Error generating employee hours report:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved generering af medarbejder timer rapport'
    });
  }
};

export const getDeviationsReport = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { startDate, endDate, status, format = 'json' } = req.query;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get employee IDs for the team
    const teamEmployees = await prisma.employee.findMany({
      where: { user: { teamId } },
      select: { id: true }
    });
    const employeeIds = teamEmployees.map(e => e.id);

    const where: any = {
      employeeId: { in: employeeIds },
      createdAt: {
        gte: start,
        lte: end
      }
    };

    if (status) {
      where.status = status;
    }

    const teamEmployeesData = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    const employeeMap = new Map(teamEmployeesData.map(e => [e.id, e]));

    const conflicts = await prisma.conflictEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const reportData = conflicts.map(conflict => {
      const employee = employeeMap.get(conflict.employeeId);
      return {
        employeeName: employee?.user.name || 'Unknown',
        employeeEmail: employee?.user.email || '-',
        employeeNumber: employee?.employeeNumber || '-',
        conflictType: conflict.conflictType,
        description: conflict.conflictDescription || '-',
        date: conflict.createdAt,
        status: conflict.status,
        resolvedAt: conflict.resolvedAt,
        resolvedBy: conflict.resolvedBy || '-',
        resolutionNote: conflict.resolutionNote || '-',
        createdAt: conflict.createdAt
      };
    });

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(reportData);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=deviations_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          totalDeviations: reportData.length,
          pendingDeviations: reportData.filter(d => d.status === 'PENDING').length,
          approvedDeviations: reportData.filter(d => d.status === 'APPROVED').length,
          rejectedDeviations: reportData.filter(d => d.status === 'REJECTED').length
        },
        deviations: reportData
      }
    });

  } catch (error: any) {
    logger.error('Error generating deviations report:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved generering af afvigelsesrapport'
    });
  }
};

export const getSalaryCostReport = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { year, month, format = 'json' } = req.query;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : currentDate.getMonth();

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0);

    // Get employee IDs for the team
    const teamEmployees = await prisma.employee.findMany({
      where: { user: { teamId } },
      select: { id: true }
    });
    const employeeIds = teamEmployees.map(e => e.id);

    const payrolls = await prisma.payrollCalculation.findMany({
      where: {
        employeeId: { in: employeeIds },
        periodStart: { gte: start, lte: end }
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
      }
    });

    const costByEmployee = payrolls.reduce((acc, payroll) => {
      const employeeName = payroll.employee.user.name;
      if (!acc[employeeName]) {
        acc[employeeName] = {
          employeeName,
          employeeNumber: payroll.employee.employeeNumber,
          totalGrossPay: 0,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          payrollCount: 0
        };
      }

      acc[employeeName].totalGrossPay += Number(payroll.totalGrossPay);
      acc[employeeName].totalHours += Number(payroll.totalHours);
      acc[employeeName].regularHours += Number(payroll.regularHours);
      acc[employeeName].overtimeHours += Number(payroll.overtimeHours);
      acc[employeeName].payrollCount += 1;

      return acc;
    }, {} as Record<string, any>);

    const reportData = Object.values(costByEmployee).map((data: any) => ({
      ...data,
      totalGrossPay: Math.round(data.totalGrossPay * 100) / 100,
      totalHours: Math.round(data.totalHours * 100) / 100,
      regularHours: Math.round(data.regularHours * 100) / 100,
      overtimeHours: Math.round(data.overtimeHours * 100) / 100
    }));

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(reportData);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=salary_cost_${targetYear}_${targetMonth + 1}.csv`);
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: {
        period: {
          year: targetYear,
          month: targetMonth + 1,
          start,
          end
        },
        summary: {
          totalCost: reportData.reduce((sum: number, e: any) => sum + e.totalGrossPay, 0),
          totalHours: reportData.reduce((sum: number, e: any) => sum + e.totalHours, 0),
          averageCostPerEmployee: reportData.length > 0
            ? reportData.reduce((sum: number, e: any) => sum + e.totalGrossPay, 0) / reportData.length
            : 0
        },
        employees: reportData.sort((a: any, b: any) => b.totalGrossPay - a.totalGrossPay)
      }
    });

  } catch (error: any) {
    logger.error('Error generating salary cost report:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved generering af lønomkostningsrapport'
    });
  }
};

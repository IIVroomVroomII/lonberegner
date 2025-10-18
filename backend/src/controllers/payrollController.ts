import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/database';
import payrollCalculationService from '../services/payrollCalculationService';
import { logger } from '../config/logger';

export const calculatePayroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId, periodStart, periodEnd } = req.body;

    if (!employeeId || !periodStart || !periodEnd) {
      throw new AppError('employeeId, periodStart og periodEnd er påkrævet', 400);
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Beregn løn
    const result = await payrollCalculationService.calculatePayroll(
      employeeId,
      start,
      end
    );

    // Gem beregning
    const payrollId = await payrollCalculationService.savePayrollCalculation(
      employeeId,
      start,
      end,
      result
    );

    res.json({
      status: 'success',
      data: {
        payrollId,
        calculation: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const calculateBatchPayroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeIds, periodStart, periodEnd } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new AppError('employeeIds skal være en ikke-tom array', 400);
    }

    if (!periodStart || !periodEnd) {
      throw new AppError('periodStart og periodEnd er påkrævet', 400);
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const results: Array<{
      employeeId: string;
      success: boolean;
      payrollId?: string;
      error?: string;
    }> = [];

    // Process each employee
    for (const employeeId of employeeIds) {
      try {
        // Beregn løn
        const result = await payrollCalculationService.calculatePayroll(
          employeeId,
          start,
          end
        );

        // Gem beregning
        const payrollId = await payrollCalculationService.savePayrollCalculation(
          employeeId,
          start,
          end,
          result
        );

        results.push({
          employeeId,
          success: true,
          payrollId,
        });

        logger.info(`Batch payroll calculated successfully for employee ${employeeId}`);
      } catch (error: any) {
        results.push({
          employeeId,
          success: false,
          error: error.message || 'Ukendt fejl',
        });

        logger.error(`Batch payroll calculation failed for employee ${employeeId}:`, error);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      status: 'success',
      data: {
        results,
        summary: {
          total: employeeIds.length,
          successful: successCount,
          failed: failureCount,
        },
      },
      message: `Lønberegning færdig: ${successCount} succesfulde, ${failureCount} fejlede`,
    });
  } catch (error) {
    next(error);
  }
};

export const getPayroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payrollCalculation.findUnique({
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
        components: true,
      },
    });

    if (!payroll) {
      throw new AppError('Lønberegning ikke fundet', 404);
    }

    res.json({
      status: 'success',
      data: { payroll },
    });
  } catch (error) {
    next(error);
  }
};

export const listPayrolls = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      employeeId,
      status,
      periodStart,
      periodEnd,
      page = 1,
      limit = 50,
    } = req.query;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    if (status) {
      where.status = status;
    }

    if (periodStart || periodEnd) {
      where.periodStart = {};
      if (periodStart) {
        where.periodStart.gte = new Date(periodStart as string);
      }
      if (periodEnd) {
        where.periodStart.lte = new Date(periodEnd as string);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payrolls, total] = await Promise.all([
      prisma.payrollCalculation.findMany({
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
        orderBy: { periodStart: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.payrollCalculation.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        payrolls,
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

export const updatePayrollStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const userId = (req as any).user.id;

    const payroll = await prisma.payrollCalculation.update({
      where: { id },
      data: { status },
    });

    // Log ændring
    await prisma.auditLog.create({
      data: {
        userId,
        payrollCalculationId: id,
        action: 'UPDATE_STATUS',
        entityType: 'PayrollCalculation',
        entityId: id,
        newValue: { status },
        comment,
      },
    });

    logger.info(`Lønberegning ${id} status opdateret til ${status}`);

    res.json({
      status: 'success',
      data: { payroll },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePayroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.payrollCalculation.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Lønberegning slettet',
    });
  } catch (error) {
    next(error);
  }
};

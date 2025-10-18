import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/database';

export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      userId,
      employeeNumber,
      jobCategory,
      agreementType,
      employmentDate,
      workTimeType,
      baseSalary,
      department,
      location,
    } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('Bruger ikke fundet', 404);
    }

    const employee = await prisma.employee.create({
      data: {
        userId,
        employeeNumber,
        jobCategory,
        agreementType,
        employmentDate: new Date(employmentDate),
        workTimeType,
        baseSalary,
        department,
        location,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: { employee },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!employee) {
      throw new AppError('Medarbejder ikke fundet', 404);
    }

    res.json({
      status: 'success',
      data: { employee },
    });
  } catch (error) {
    next(error);
  }
};

export const listEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobCategory, agreementType, page = 1, limit = 50 } = req.query;

    const where: any = {};

    if (jobCategory) {
      where.jobCategory = jobCategory;
    }

    if (agreementType) {
      where.agreementType = agreementType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        employees,
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

export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing userId
    delete updates.userId;

    const employee = await prisma.employee.update({
      where: { id },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      status: 'success',
      data: { employee },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.employee.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Medarbejder slettet',
    });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/database';
import { logger } from '../config/logger';

export const createGeofence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      description,
      latitude,
      longitude,
      radius,
      taskType,
      employeeId,
      calculationProfileId,
      isActive = true,
    } = req.body;

    // Validate that either employeeId or calculationProfileId is provided, but not both
    if (employeeId && calculationProfileId) {
      throw new AppError('Geofence kan kun tilknyttes enten medarbejder eller beregningsprofil, ikke begge', 400);
    }

    if (!employeeId && !calculationProfileId) {
      throw new AppError('Geofence skal tilknyttes enten en medarbejder eller beregningsprofil', 400);
    }

    // Verify employee exists if employeeId is provided
    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        throw new AppError('Medarbejder ikke fundet', 404);
      }
    }

    // Verify calculation profile exists if calculationProfileId is provided
    if (calculationProfileId) {
      const profile = await prisma.calculationProfile.findUnique({
        where: { id: calculationProfileId },
      });

      if (!profile) {
        throw new AppError('Beregningsprofil ikke fundet', 404);
      }
    }

    const geofence = await prisma.geofence.create({
      data: {
        name,
        description,
        latitude,
        longitude,
        radius,
        taskType,
        employeeId,
        calculationProfileId,
        isActive,
      },
    });

    logger.info(`Geofence oprettet: ${geofence.id} - ${geofence.name}`);

    res.status(201).json({
      status: 'success',
      data: { geofence },
    });
  } catch (error) {
    next(error);
  }
};

export const listGeofences = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId, calculationProfileId, isActive } = req.query;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    if (calculationProfileId) {
      where.calculationProfileId = calculationProfileId as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const geofences = await prisma.geofence.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            userId: true,
          },
        },
        calculationProfile: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      status: 'success',
      data: { geofences },
    });
  } catch (error) {
    next(error);
  }
};

export const getGeofence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const geofence = await prisma.geofence.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            userId: true,
          },
        },
        calculationProfile: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!geofence) {
      throw new AppError('Geofence ikke fundet', 404);
    }

    res.json({
      status: 'success',
      data: { geofence },
    });
  } catch (error) {
    next(error);
  }
};

export const updateGeofence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing employeeId or calculationProfileId after creation
    delete updates.employeeId;
    delete updates.calculationProfileId;

    const geofence = await prisma.geofence.update({
      where: { id },
      data: updates,
    });

    logger.info(`Geofence opdateret: ${geofence.id} - ${geofence.name}`);

    res.json({
      status: 'success',
      data: { geofence },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGeofence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.geofence.delete({
      where: { id },
    });

    logger.info(`Geofence slettet: ${id}`);

    res.json({
      status: 'success',
      message: 'Geofence slettet',
    });
  } catch (error) {
    next(error);
  }
};

// Check if a given coordinate is within any active geofence for an employee
export const checkGeofence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId, latitude, longitude } = req.body;

    if (!employeeId || latitude === undefined || longitude === undefined) {
      throw new AppError('employeeId, latitude og longitude er påkrævet', 400);
    }

    // Get all active geofences for this employee (both direct and via calculation profile)
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        geofences: {
          where: { isActive: true },
        },
        calculationProfile: {
          include: {
            geofences: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new AppError('Medarbejder ikke fundet', 404);
    }

    // Combine geofences from both sources
    const allGeofences = [
      ...employee.geofences,
      ...(employee.calculationProfile?.geofences || []),
    ];

    // Calculate distance using Haversine formula
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    };

    // Check each geofence
    const matchingGeofences = allGeofences.filter((geofence) => {
      const distance = calculateDistance(
        parseFloat(geofence.latitude.toString()),
        parseFloat(geofence.longitude.toString()),
        latitude,
        longitude
      );

      return distance <= geofence.radius;
    });

    res.json({
      status: 'success',
      data: {
        isInGeofence: matchingGeofences.length > 0,
        matchingGeofences: matchingGeofences.map((g) => ({
          id: g.id,
          name: g.name,
          taskType: g.taskType,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

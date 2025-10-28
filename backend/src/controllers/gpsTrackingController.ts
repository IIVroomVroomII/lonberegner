import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/database';
import { logger } from '../config/logger';

export const createGpsTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      timeEntryId,
      timestamp,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
    } = req.body;

    // Verify time entry exists
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      throw new AppError('Tidsregistrering ikke fundet', 404);
    }

    // Calculate if stationary (speed < 1 m/s ≈ 3.6 km/h)
    const isStationary = speed !== null && speed !== undefined ? speed < 1 : false;

    const gpsTracking = await prisma.gpsTracking.create({
      data: {
        timeEntryId,
        timestamp: new Date(timestamp),
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        isStationary,
        isInGeofence: false, // Will be calculated separately
      },
    });

    logger.info(`GPS tracking punkt oprettet for time entry: ${timeEntryId}`);

    res.status(201).json({
      status: 'success',
      data: { gpsTracking },
    });
  } catch (error) {
    next(error);
  }
};

export const createBatchGpsTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { timeEntryId, trackingPoints } = req.body;

    // Verify time entry exists
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      throw new AppError('Tidsregistrering ikke fundet', 404);
    }

    // Create all tracking points in a transaction
    const gpsTrackingPoints = await prisma.$transaction(
      trackingPoints.map((point: any) =>
        prisma.gpsTracking.create({
          data: {
            timeEntryId,
            timestamp: new Date(point.timestamp),
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy: point.accuracy,
            speed: point.speed,
            heading: point.heading,
            isStationary: point.speed !== null && point.speed !== undefined ? point.speed < 1 : false,
            isInGeofence: false,
          },
        })
      )
    );

    logger.info(
      `Batch GPS tracking oprettet: ${gpsTrackingPoints.length} punkter for time entry: ${timeEntryId}`
    );

    res.status(201).json({
      status: 'success',
      data: { count: gpsTrackingPoints.length, gpsTrackingPoints },
    });
  } catch (error) {
    next(error);
  }
};

export const listGpsTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { timeEntryId } = req.query;

    if (!timeEntryId) {
      throw new AppError('timeEntryId er påkrævet', 400);
    }

    const gpsTrackingPoints = await prisma.gpsTracking.findMany({
      where: {
        timeEntryId: timeEntryId as string,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    res.json({
      status: 'success',
      data: { gpsTrackingPoints },
    });
  } catch (error) {
    next(error);
  }
};

export const getGpsTrackingSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { timeEntryId } = req.params;

    const gpsTrackingPoints = await prisma.gpsTracking.findMany({
      where: { timeEntryId },
      orderBy: { timestamp: 'asc' },
    });

    if (gpsTrackingPoints.length === 0) {
      res.json({
        status: 'success',
        data: {
          totalPoints: 0,
          stationaryPercentage: 0,
          averageSpeed: 0,
          distance: 0,
        },
      });
      return;
    }

    // Calculate statistics
    const stationaryCount = gpsTrackingPoints.filter((p) => p.isStationary).length;
    const stationaryPercentage = (stationaryCount / gpsTrackingPoints.length) * 100;

    const speedPoints = gpsTrackingPoints.filter((p) => p.speed !== null);
    const averageSpeed =
      speedPoints.length > 0
        ? speedPoints.reduce((sum, p) => sum + parseFloat(p.speed!.toString()), 0) /
          speedPoints.length
        : 0;

    // Calculate total distance using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < gpsTrackingPoints.length; i++) {
      const prev = gpsTrackingPoints[i - 1];
      const curr = gpsTrackingPoints[i];

      const R = 6371e3; // Earth radius in meters
      const φ1 = (parseFloat(prev.latitude.toString()) * Math.PI) / 180;
      const φ2 = (parseFloat(curr.latitude.toString()) * Math.PI) / 180;
      const Δφ =
        ((parseFloat(curr.latitude.toString()) - parseFloat(prev.latitude.toString())) *
          Math.PI) /
        180;
      const Δλ =
        ((parseFloat(curr.longitude.toString()) - parseFloat(prev.longitude.toString())) *
          Math.PI) /
        180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      totalDistance += R * c;
    }

    res.json({
      status: 'success',
      data: {
        totalPoints: gpsTrackingPoints.length,
        stationaryPercentage: Math.round(stationaryPercentage * 100) / 100,
        averageSpeed: Math.round(averageSpeed * 100) / 100,
        distance: Math.round(totalDistance),
        firstPoint: gpsTrackingPoints[0],
        lastPoint: gpsTrackingPoints[gpsTrackingPoints.length - 1],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGpsTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { timeEntryId } = req.params;

    const result = await prisma.gpsTracking.deleteMany({
      where: { timeEntryId },
    });

    logger.info(`GPS tracking data slettet for time entry: ${timeEntryId} - ${result.count} punkter`);

    res.json({
      status: 'success',
      message: `${result.count} GPS punkter slettet`,
    });
  } catch (error) {
    next(error);
  }
};

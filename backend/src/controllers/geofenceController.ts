import { Request, Response } from 'express';
import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';

export const createGeofence = async (req: Request, res: Response) => {
  try {
    const { name, description, latitude, longitude, radius, taskType, employeeId, calculationProfileId, isActive } = req.body;

    const geofence = await prisma.geofence.create({
      data: {
        name,
        description,
        latitude: new Decimal(latitude),
        longitude: new Decimal(longitude),
        radius,
        taskType,
        employeeId,
        calculationProfileId,
        isActive: isActive ?? true,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            user: { select: { name: true } },
          },
        },
        calculationProfile: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: geofence,
    });
  } catch (error: any) {
    console.error('Error creating geofence:', error);
    res.status(500).json({
      success: false,
      message: 'Fejl ved oprettelse af geofence',
      error: error.message,
    });
  }
};

export const listGeofences = async (req: Request, res: Response) => {
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
            user: { select: { name: true } },
          },
        },
        calculationProfile: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: geofences,
      count: geofences.length,
    });
  } catch (error: any) {
    console.error('Error listing geofences:', error);
    res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af geofences',
      error: error.message,
    });
  }
};

export const getGeofence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const geofence = await prisma.geofence.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            user: { select: { name: true } },
          },
        },
        calculationProfile: { select: { id: true, name: true } },
      },
    });

    if (!geofence) {
      return res.status(404).json({
        success: false,
        message: 'Geofence ikke fundet',
      });
    }

    return res.status(200).json({
      success: true,
      data: geofence,
    });
  } catch (error: any) {
    console.error('Error getting geofence:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af geofence',
      error: error.message,
    });
  }
};

export const updateGeofence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, latitude, longitude, radius, taskType, employeeId, calculationProfileId, isActive } = req.body;

    // Check if geofence exists
    const existingGeofence = await prisma.geofence.findUnique({ where: { id } });
    if (!existingGeofence) {
      return res.status(404).json({
        success: false,
        message: 'Geofence ikke fundet',
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (latitude !== undefined) updateData.latitude = new Decimal(latitude);
    if (longitude !== undefined) updateData.longitude = new Decimal(longitude);
    if (radius !== undefined) updateData.radius = radius;
    if (taskType !== undefined) updateData.taskType = taskType;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (calculationProfileId !== undefined) updateData.calculationProfileId = calculationProfileId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const geofence = await prisma.geofence.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            user: { select: { name: true } },
          },
        },
        calculationProfile: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: geofence,
    });
  } catch (error: any) {
    console.error('Error updating geofence:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved opdatering af geofence',
      error: error.message,
    });
  }
};

export const deleteGeofence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if geofence exists
    const existingGeofence = await prisma.geofence.findUnique({ where: { id } });
    if (!existingGeofence) {
      return res.status(404).json({
        success: false,
        message: 'Geofence ikke fundet',
      });
    }

    await prisma.geofence.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Geofence slettet',
    });
  } catch (error: any) {
    console.error('Error deleting geofence:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved sletning af geofence',
      error: error.message,
    });
  }
};

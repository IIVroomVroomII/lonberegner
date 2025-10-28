import { z } from 'zod';

export const createGeofenceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().int().min(10).max(10000), // 10m til 10km
    taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING', 'SMART']),
    employeeId: z.string().uuid().optional().nullable(),
    calculationProfileId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().default(true),
  }).refine((data) => {
    // Mindst én af employeeId eller calculationProfileId skal være sat
    return data.employeeId || data.calculationProfileId;
  }, {
    message: 'Geofence skal tilknyttes enten en medarbejder eller en beregningsprofil',
  }),
});

export const updateGeofenceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt geofence ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radius: z.number().int().min(10).max(10000).optional(),
    taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING', 'SMART']).optional(),
    employeeId: z.string().uuid().optional().nullable(),
    calculationProfileId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteGeofenceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt geofence ID'),
  }),
});

export const getGeofenceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt geofence ID'),
  }),
});

export const listGeofencesSchema = z.object({
  query: z.object({
    employeeId: z.string().uuid().optional(),
    calculationProfileId: z.string().uuid().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

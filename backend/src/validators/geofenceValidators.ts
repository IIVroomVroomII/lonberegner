import { z } from 'zod';

export const createGeofenceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Navn er påkrævet').max(100, 'Navn må højst være 100 tegn'),
    description: z.string().max(500).optional().nullable(),
    latitude: z.number().min(-90).max(90, 'Latitude skal være mellem -90 og 90'),
    longitude: z.number().min(-180).max(180, 'Longitude skal være mellem -180 og 180'),
    radius: z.number().int().min(1, 'Radius skal være mindst 1 meter').max(10000, 'Radius må højst være 10000 meter'),
    taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING']),
    employeeId: z.string().uuid('Ugyldigt medarbejder ID').optional().nullable(),
    calculationProfileId: z.string().uuid('Ugyldigt beregningsprofil ID').optional().nullable(),
    isActive: z.boolean().default(true),
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
    radius: z.number().int().min(1).max(10000).optional(),
    taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING']).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const getGeofenceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt geofence ID'),
  }),
});

export const deleteGeofenceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt geofence ID'),
  }),
});

export const checkGeofenceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Ugyldigt medarbejder ID'),
    latitude: z.number().min(-90).max(90, 'Latitude skal være mellem -90 og 90'),
    longitude: z.number().min(-180).max(180, 'Longitude skal være mellem -180 og 180'),
  }),
});

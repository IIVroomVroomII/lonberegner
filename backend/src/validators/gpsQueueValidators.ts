import { z } from 'zod';

// GPS Point schema for queue data
const queuedGPSPointSchema = z.object({
  clientId: z.string().uuid('Ugyldigt client ID format'),
  employeeId: z.string().uuid('Ugyldigt medarbejder ID'),
  latitude: z.number().min(-90).max(90, 'Latitude skal være mellem -90 og 90'),
  longitude: z.number().min(-180).max(180, 'Longitude skal være mellem -180 og 180'),
  accuracy: z.number().min(0, 'Accuracy skal være positiv'),
  timestamp: z.coerce.date(),
  batteryLevel: z.number().min(0).max(100, 'Batteriniveau skal være mellem 0 og 100').optional().nullable(),
  speed: z.number().min(0, 'Hastighed skal være positiv').optional().nullable(),
  heading: z.number().min(0).max(360, 'Heading skal være mellem 0 og 360').optional().nullable(),
});

/**
 * Batch upload validation
 * POST /api/v1/gps-tracking/batch-upload
 */
export const batchUploadSchema = z.object({
  body: z.object({
    data: z
      .array(queuedGPSPointSchema)
      .min(1, 'Mindst ét GPS punkt er påkrævet')
      .max(100, 'Maksimalt 100 GPS punkter per batch'),
  }),
});

/**
 * Get sync status validation
 * GET /api/v1/gps-tracking/sync-status/:employeeId
 */
export const getSyncStatusSchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Ugyldigt medarbejder ID'),
  }),
});

/**
 * Get pending conflicts validation
 * GET /api/v1/gps-tracking/conflicts/:employeeId
 */
export const getPendingConflictsSchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Ugyldigt medarbejder ID'),
  }),
});

/**
 * Resolve conflict validation
 * POST /api/v1/gps-tracking/resolve-conflict/:id
 */
export const resolveConflictSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt konflikt ID'),
  }),
  body: z.object({
    resolution: z.enum(['client', 'server', 'manual'], {
      errorMap: () => ({ message: 'Resolution skal være: client, server, eller manual' }),
    }),
    manualData: queuedGPSPointSchema.optional(),
  }),
});

/**
 * Reject conflict validation
 * POST /api/v1/gps-tracking/reject-conflict/:id
 */
export const rejectConflictSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt konflikt ID'),
  }),
});

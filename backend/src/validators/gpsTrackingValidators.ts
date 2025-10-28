import { z } from 'zod';

const gpsPointSchema = z.object({
  timestamp: z.coerce.date(),
  latitude: z.number().min(-90).max(90, 'Latitude skal være mellem -90 og 90'),
  longitude: z.number().min(-180).max(180, 'Longitude skal være mellem -180 og 180'),
  accuracy: z.number().min(0).optional().nullable(),
  speed: z.number().min(0).optional().nullable(),
  heading: z.number().min(0).max(360, 'Heading skal være mellem 0 og 360').optional().nullable(),
});

export const createGpsTrackingSchema = z.object({
  body: z.object({
    timeEntryId: z.string().uuid('Ugyldigt tidsregistrerings ID'),
    timestamp: z.coerce.date(),
    latitude: z.number().min(-90).max(90, 'Latitude skal være mellem -90 og 90'),
    longitude: z.number().min(-180).max(180, 'Longitude skal være mellem -180 og 180'),
    accuracy: z.number().min(0).optional().nullable(),
    speed: z.number().min(0).optional().nullable(),
    heading: z.number().min(0).max(360, 'Heading skal være mellem 0 og 360').optional().nullable(),
  }),
});

export const createBatchGpsTrackingSchema = z.object({
  body: z.object({
    timeEntryId: z.string().uuid('Ugyldigt tidsregistrerings ID'),
    trackingPoints: z.array(gpsPointSchema).min(1, 'Mindst ét tracking punkt er påkrævet'),
  }),
});

export const listGpsTrackingSchema = z.object({
  query: z.object({
    timeEntryId: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
});

export const getGpsTrackingSummarySchema = z.object({
  params: z.object({
    timeEntryId: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
});

export const deleteGpsTrackingSchema = z.object({
  params: z.object({
    timeEntryId: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
});

import { z } from 'zod';

// Split a time entry into two periods at a specified split time
export const splitTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt time entry ID'),
  }),
  body: z.object({
    splitTime: z.string().datetime('Ugyldigt split tidspunkt'),
    firstPeriod: z.object({
      taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING', 'SMART']).optional(),
      location: z.string().max(255).optional().nullable(),
      route: z.string().max(255).optional().nullable(),
      comment: z.string().max(1000).optional().nullable(),
    }).optional(),
    secondPeriod: z.object({
      taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING', 'SMART']).optional(),
      location: z.string().max(255).optional().nullable(),
      route: z.string().max(255).optional().nullable(),
      comment: z.string().max(1000).optional().nullable(),
    }).optional(),
  }),
});

// Merge multiple time entries into one
export const mergeTimeEntriesSchema = z.object({
  body: z.object({
    timeEntryIds: z.array(z.string().uuid()).min(2, 'Mindst to time entries skal vælges'),
    mergedData: z.object({
      taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING', 'SMART']),
      location: z.string().max(255).optional().nullable(),
      route: z.string().max(255).optional().nullable(),
      comment: z.string().max(1000).optional().nullable(),
      breakDuration: z.number().int().min(0).optional(),
    }),
  }),
});

// Bulk edit multiple time entries
export const bulkEditTimeEntriesSchema = z.object({
  body: z.object({
    timeEntryIds: z.array(z.string().uuid()).min(1, 'Mindst en time entry skal vælges'),
    updates: z.object({
      taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING', 'SMART']).optional(),
      location: z.string().max(255).optional().nullable(),
      route: z.string().max(255).optional().nullable(),
      comment: z.string().max(1000).optional().nullable(),
      isNightWork: z.boolean().optional(),
      isWeekend: z.boolean().optional(),
      isHoliday: z.boolean().optional(),
      isIrregularHours: z.boolean().optional(),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CALCULATED']).optional(),
    }),
  }),
});

// Get time entries for period (for timeline view)
export const getTimeEntriesForPeriodSchema = z.object({
  query: z.object({
    employeeId: z.string().uuid('Ugyldigt employee ID').optional(),
    startDate: z.string().datetime('Ugyldig start dato'),
    endDate: z.string().datetime('Ugyldig slut dato'),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CALCULATED']).optional(),
  }),
});

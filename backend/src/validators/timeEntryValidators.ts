import { z } from 'zod';

export const createTimeEntrySchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Ugyldigt medarbejder ID'),
    date: z.coerce.date(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date().optional().nullable(),
    breakDuration: z.number().int().min(0).max(480).default(0),
    location: z.string().min(1).max(200).optional().nullable(),
    route: z.string().max(200).optional().nullable(),
    taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING']),
    isIrregularHours: z.boolean().default(false),
    isNightWork: z.boolean().default(false),
    isWeekend: z.boolean().default(false),
    isHoliday: z.boolean().default(false),
    comment: z.string().max(500).optional().nullable(),
  }).refine((data) => {
    if (data.endTime && data.startTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  }, {
    message: 'Sluttid skal være efter starttid',
    path: ['endTime'],
  }),
});

export const updateTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
  body: z.object({
    date: z.coerce.date().optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional().nullable(),
    breakDuration: z.number().int().min(0).max(480).optional(),
    location: z.string().min(1).max(200).optional(),
    route: z.string().max(200).optional().nullable(),
    taskType: z.enum(['DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING']).optional(),
    isIrregularHours: z.boolean().optional(),
    isNightWork: z.boolean().optional(),
    isWeekend: z.boolean().optional(),
    isHoliday: z.boolean().optional(),
    comment: z.string().max(500).optional().nullable(),
  }),
});

export const approveTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
});

export const deleteTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
});

export const getTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
});

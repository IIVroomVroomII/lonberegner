import { z } from 'zod';

export const createAgreementSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Navn skal være mindst 2 tegn').max(200),
    type: z.enum(['DRIVER_AGREEMENT', 'WAREHOUSE_AGREEMENT', 'MOVER_AGREEMENT']),
    validFrom: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Ugyldig dato for validFrom',
    }),
    validTo: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Ugyldig dato for validTo',
      })
      .optional()
      .nullable(),
    baseHourlyRate: z.number().positive('Grundløn skal være positiv'),
    weeklyHours: z.number().positive('Ugentlige timer skal være positive').default(37),
    overtime1to3Rate: z.number().positive('Overarbejdssats 1-3 timer skal være positiv'),
    overtimeAbove3Rate: z.number().positive('Overarbejdssats 4+ timer skal være positiv'),
    shiftedTimeRate: z.number().positive('Forskudt tid sats skal være positiv'),
    specialAllowancePercent: z.number().min(0).max(100, 'Særligt tillæg skal være mellem 0-100%'),
    pensionEmployerPercent: z.number().min(0).max(100, 'Arbejdsgiver pension skal være mellem 0-100%'),
    pensionEmployeePercent: z.number().min(0).max(100, 'Medarbejder pension skal være mellem 0-100%'),
    weekendAllowancePercent: z.number().min(0).max(100, 'Weekend tillæg skal være mellem 0-100%'),
    holidayAllowancePercent: z.number().min(0).max(100, 'Helligdag tillæg skal være mellem 0-100%'),
    vacationPercent: z.number().min(0).max(100, 'Ferieprocent skal være mellem 0-100%'),
    vacationDaysPerYear: z.number().int().positive('Feriedage pr. år skal være et positivt heltal').default(25),
    isActive: z.boolean().default(true),
  }),
});

export const updateAgreementSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt overenskomst ID'),
  }),
  body: z.object({
    name: z.string().min(2, 'Navn skal være mindst 2 tegn').max(200).optional(),
    type: z.enum(['DRIVER_AGREEMENT', 'WAREHOUSE_AGREEMENT', 'MOVER_AGREEMENT']).optional(),
    validFrom: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Ugyldig dato for validFrom',
      })
      .optional(),
    validTo: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Ugyldig dato for validTo',
      })
      .optional()
      .nullable(),
    baseHourlyRate: z.number().positive('Grundløn skal være positiv').optional(),
    weeklyHours: z.number().positive('Ugentlige timer skal være positive').optional(),
    overtime1to3Rate: z.number().positive('Overarbejdssats 1-3 timer skal være positiv').optional(),
    overtimeAbove3Rate: z.number().positive('Overarbejdssats 4+ timer skal være positiv').optional(),
    shiftedTimeRate: z.number().positive('Forskudt tid sats skal være positiv').optional(),
    specialAllowancePercent: z.number().min(0).max(100, 'Særligt tillæg skal være mellem 0-100%').optional(),
    pensionEmployerPercent: z.number().min(0).max(100, 'Arbejdsgiver pension skal være mellem 0-100%').optional(),
    pensionEmployeePercent: z.number().min(0).max(100, 'Medarbejder pension skal være mellem 0-100%').optional(),
    weekendAllowancePercent: z.number().min(0).max(100, 'Weekend tillæg skal være mellem 0-100%').optional(),
    holidayAllowancePercent: z.number().min(0).max(100, 'Helligdag tillæg skal være mellem 0-100%').optional(),
    vacationPercent: z.number().min(0).max(100, 'Ferieprocent skal være mellem 0-100%').optional(),
    vacationDaysPerYear: z.number().int().positive('Feriedage pr. år skal være et positivt heltal').optional(),
    isActive: z.boolean().optional(),
  }),
});

export const getAgreementSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt overenskomst ID'),
  }),
});

export const deleteAgreementSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt overenskomst ID'),
  }),
});

export const toggleAgreementStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt overenskomst ID'),
  }),
});

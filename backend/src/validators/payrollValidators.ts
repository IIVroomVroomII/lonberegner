import { z } from 'zod';

export const calculatePayrollSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Ugyldigt medarbejder ID'),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  }).refine((data) => {
    return new Date(data.periodEnd) >= new Date(data.periodStart);
  }, {
    message: 'Slutdato skal være efter eller lig med startdato',
    path: ['periodEnd'],
  }),
});

export const updatePayrollStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt lønberegnings ID'),
  }),
  body: z.object({
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'EXPORTED', 'PAID'], {
      errorMap: () => ({ message: 'Ugyldig status' }),
    }),
    comment: z.string().max(500).optional(),
  }),
});

export const getPayrollSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt lønberegnings ID'),
  }),
});

export const deletePayrollSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt lønberegnings ID'),
  }),
});

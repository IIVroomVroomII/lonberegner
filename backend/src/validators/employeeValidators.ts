import { z } from 'zod';

export const createEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Navn skal være mindst 2 tegn').max(100, 'Navn må maks være 100 tegn'),
    email: z.string().email('Ugyldig email adresse'),
    password: z.string().min(8, 'Password skal være mindst 8 tegn'),
    employeeNumber: z.string().min(1, 'Medarbejdernummer er påkrævet').max(50),
    cprNumber: z.string().length(10, 'CPR nummer skal være 10 cifre').optional().nullable(),
    jobCategory: z.enum(['DRIVER', 'WAREHOUSE', 'MOVER', 'TERMINAL', 'RENOVATION'], {
      errorMap: () => ({ message: 'Ugyldig job kategori' }),
    }),
    agreementType: z.enum(['DRIVER_AGREEMENT', 'WAREHOUSE_AGREEMENT', 'MOVER_AGREEMENT'], {
      errorMap: () => ({ message: 'Ugyldig overenskomsttype' }),
    }),
    workTimeType: z.enum(['HOURLY', 'SALARIED', 'SUBSTITUTE', 'SHIFT_WORK'], {
      errorMap: () => ({ message: 'Ugyldig ansættelsestype' }),
    }),
    baseSalary: z.number().positive('Grundløn skal være positiv').min(0.01).max(9999.99),
    department: z.string().max(100).optional().nullable(),
    location: z.string().max(100).optional().nullable(),
    employmentDate: z.coerce.date(),
  }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt medarbejder ID'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    employeeNumber: z.string().min(1).max(50).optional(),
    cprNumber: z.string().length(10).optional().nullable(),
    jobCategory: z.enum(['DRIVER', 'WAREHOUSE', 'MOVER', 'TERMINAL', 'RENOVATION']).optional(),
    agreementType: z.enum(['DRIVER_AGREEMENT', 'WAREHOUSE_AGREEMENT', 'MOVER_AGREEMENT']).optional(),
    workTimeType: z.enum(['HOURLY', 'SALARIED', 'SUBSTITUTE', 'SHIFT_WORK']).optional(),
    baseSalary: z.number().positive().min(0.01).max(9999.99).optional(),
    department: z.string().max(100).optional().nullable(),
    location: z.string().max(100).optional().nullable(),
    employmentDate: z.coerce.date().optional(),
  }),
});

export const getEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt medarbejder ID'),
  }),
});

export const deleteEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Ugyldigt medarbejder ID'),
  }),
});

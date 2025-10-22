import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Ugyldig email adresse'),
    password: z.string().min(1, 'Password er påkrævet'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Firmanavn skal være mindst 2 tegn').max(200),
    contactEmail: z.string().email('Ugyldig email adresse'),
    password: z.string().min(6, 'Password skal være mindst 6 tegn'),
    organizationNumber: z.string().optional(),
    contactPhone: z.string().optional(),
    email: z.string().email('Ugyldig email adresse').optional(), // For backward compatibility
  }),
});

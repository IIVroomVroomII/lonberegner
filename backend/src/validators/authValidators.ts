import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Ugyldig email adresse'),
    password: z.string().min(1, 'Password er påkrævet'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Ugyldig email adresse'),
    password: z.string()
      .min(8, 'Password skal være mindst 8 tegn')
      .regex(/[A-Z]/, 'Password skal indeholde mindst ét stort bogstav')
      .regex(/[a-z]/, 'Password skal indeholde mindst ét lille bogstav')
      .regex(/[0-9]/, 'Password skal indeholde mindst ét tal'),
    name: z.string().min(2, 'Navn skal være mindst 2 tegn').max(100),
  }),
});

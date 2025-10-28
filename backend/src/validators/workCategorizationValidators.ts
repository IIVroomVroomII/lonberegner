import { z } from 'zod';

export const categorizeWorkDaySchema = z.object({
  params: z.object({
    timeEntryId: z.string().uuid('Ugyldigt tidsregistrerings ID'),
  }),
});

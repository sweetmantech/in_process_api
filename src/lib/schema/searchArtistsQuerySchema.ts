import { z } from 'zod';
import handleSchema from '@/lib/schema/handleSchema';

const searchArtistsQuerySchema = z
  .object({
    query: z.string().trim().min(1, 'Missing param: query').optional(),
    handle: z.string().trim().toLowerCase().pipe(handleSchema).optional(),
    limit: z
      .string()
      .optional()
      .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
      .pipe(z.number().int().min(1).max(50).optional())
      .transform((v) => v ?? 10),
  })
  .superRefine(({ query, handle }, ctx) => {
    if (!query && !handle) {
      ctx.addIssue({
        code: 'custom',
        path: ['query'],
        message: 'Missing param: query or handle',
      });
    }
  });

export default searchArtistsQuerySchema;

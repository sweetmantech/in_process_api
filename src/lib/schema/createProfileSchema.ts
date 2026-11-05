import { z } from 'zod';
import handleSchema from '@/lib/schema/handleSchema';

const createProfileSchema = z.object({
  username: z
    .string()
    .optional()
    .transform((val) => (val === '' ? null : val)),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .transform((val) => val || null)
    .pipe(handleSchema.nullable())
    .optional(),
  bio: z.string().optional(),
  instagram: z.string().optional(),
  x: z.string().optional(),
  telegram: z.string().optional(),
});

export default createProfileSchema;

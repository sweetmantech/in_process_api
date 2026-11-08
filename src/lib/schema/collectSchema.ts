import { z } from 'zod';
import { momentSchema } from './momentSchema';

const quantitySchema = z.number().int().positive().optional();

export const collectSchema = z
  .object({
    moment: momentSchema,
    comment: z.string().default('In Process!!!'),
    amount: quantitySchema,
    quantity: quantitySchema,
  })
  .transform(({ quantity, amount, ...rest }) => ({
    ...rest,
    quantity: quantity ?? amount ?? 1,
  }));

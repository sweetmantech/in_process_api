import { z } from 'zod';
import { momentSchema } from './momentSchema';

export const collectSchema = z
  .object({
    moment: momentSchema,
    comment: z.string(),
    amount: z.number().optional(),
    quantity: z.number().optional(),
  })
  .refine((data) => data.quantity !== undefined || data.amount !== undefined, {
    message: 'quantity is required',
    path: ['quantity'],
  })
  .transform(({ quantity, amount, ...rest }) => ({
    ...rest,
    quantity: (quantity ?? amount) as number,
  }));

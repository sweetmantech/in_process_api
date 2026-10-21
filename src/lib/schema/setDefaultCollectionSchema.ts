import { z } from 'zod';
import addressSchema from '@/lib/schema/addressSchema';

export const setDefaultCollectionSchema = z.object({
  collectionAddress: addressSchema.nullable(),
});

import { z } from 'zod';
import { IS_TESTNET } from '@/lib/consts';

const timelineQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((v) => Math.min(Number(v) || 100, 100)),
    page: z
      .string()
      .optional()
      .transform((v) => Number(v) || 1),
    collection: z.string().optional(),
    artist: z.string().optional(),
    chain_id: z
      .string()
      .optional()
      .transform((v) => {
        if (v) return Number(v);
        return IS_TESTNET ? 84532 : null;
      }),
    hidden: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    content_type: z.string().optional(),
    period: z.string().optional(),
    channel: z.string().optional(),
    type: z.enum(['mutual', 'default']).optional(),
    protocol: z
      .enum(['in_process', 'catalog', 'sound.xyz', 'zora_media', 'zora'])
      .optional(),
    curated: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    future: z
      .string()
      .optional()
      .transform((v) => v !== 'false'),
  })
  .transform(({ chain_id, content_type, ...rest }) => ({
    ...rest,
    chainId: chain_id,
    mime: content_type ? `${content_type}/%` : undefined,
  }));

export default timelineQuerySchema;

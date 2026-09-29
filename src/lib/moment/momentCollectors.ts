import { z } from 'zod';
import { commentsSchema } from '../schema/commentsSchema';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import selectCollectors from '../supabase/in_process_transfers/selectCollectors';

export type GetCollectorsInput = z.infer<typeof commentsSchema>;

export async function momentCollectors({ moment, offset }: GetCollectorsInput) {
  const { data: moments, error: momentsError } =
    await getMomentsByAddressAndTokenId({
      moments: [moment],
    });

  if (momentsError) {
    throw new Error('Failed to get moments');
  }

  const momentData = moments?.[0];

  if (!momentData) {
    throw new Error('Moment not found');
  }

  const collectors = await selectCollectors({
    momentId: momentData.id,
    offset,
  });

  const formattedCollectors = collectors.map((collector) => ({
    id: collector.id,
    collector: collector.collector,
    username: collector.wallet?.artist?.username ?? '',
    amount: collector.amount,
    transactionHash: collector.transaction_hash,
    timestamp: collector.collected_at
      ? new Date(collector.collected_at).getTime()
      : 0,
  }));

  return {
    collectors: formattedCollectors,
  };
}

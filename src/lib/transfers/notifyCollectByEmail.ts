import findMoments from '@/lib/moment/findMoments';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import sendCollectEmailForTransfer from '@/lib/transfers/sendCollectEmailForTransfer';
import type { Transfers_t } from '@/types/envio';
import type { Moment } from '@/types/moment';

/**
 * Send email to `moment.collection.creator` when a moment is collected (paid transfer).
 *
 * Note: We intentionally keep this "indexer friendly":
 * - filter and bulk fetch in one go
 * - sequential email sends per batch
 */
export async function notifyCollectByEmail(
  batch: Transfers_t[]
): Promise<void> {
  const paidTransfers = batch.filter(
    (t) => t.value != null && t.currency != null
  );
  if (paidTransfers.length === 0) return;

  const collectors = [
    ...new Set(paidTransfers.map((t) => t.recipient.toLowerCase())),
  ];
  const moments: Moment[] = [
    ...new Map(
      paidTransfers.map((t) => [
        `${t.collection.toLowerCase()}:${t.chain_id}:${t.token_id}`,
        {
          collectionAddress:
            t.collection.toLowerCase() as Moment['collectionAddress'],
          tokenId: t.token_id,
          chainId: t.chain_id,
        },
      ])
    ).values(),
  ];

  const { data: collectorWallets } = await selectWallets({
    addresses: collectors,
  });
  const collectorUsernameByAddress = new Map<string, string | null>(
    (collectorWallets ?? []).map((w) => [
      w.address.toLowerCase(),
      w.artist?.username ?? null,
    ])
  );

  const { data: selectedMoments, error } = await findMoments({
    moments,
    includeMetadata: true,
  });
  if (error) throw error;

  console.log('[collect-email][dev] prepared', {
    paidTransfers: paidTransfers.length,
    collectors: collectors.length,
    requestedMoments: moments.length,
    selectedMoments: (selectedMoments ?? []).length,
  });

  const momentByKey = new Map<string, any>(
    (selectedMoments ?? []).map((m) => [
      `${m.collection.address.toLowerCase()}:${m.collection.chain_id}:${m.token_id}`,
      m,
    ])
  );

  const creatorEmailCache = new Map<string, string | null>();

  for (const transfer of paidTransfers) {
    const moment = momentByKey.get(
      `${transfer.collection.toLowerCase()}:${transfer.chain_id}:${transfer.token_id}`
    );
    if (!moment?.collection?.creator) continue;

    await sendCollectEmailForTransfer({
      collectorAddress: transfer.recipient,
      moment,
      creatorEmailCache,
      collectorUsernameByAddress,
    });
  }
}

export default notifyCollectByEmail;

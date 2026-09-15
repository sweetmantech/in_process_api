import { Address, Hash } from 'viem';
import { upsertTransfers } from '@/lib/supabase/in_process_transfers/upsertTransfers';
import { ensureWallets } from '@/lib/wallets/ensureWallets';

export type RecordCollectTransferParams = {
  momentId: string | null;
  recipient: Address;
  quantity: number;
  transactionHash: Hash;
};

/**
 * Writes a just-confirmed collect into Supabase immediately after the on-chain
 * transaction succeeds, instead of waiting for the async Envio indexer to catch
 * up (it lags by up to its polling interval). Shares the indexer's
 * `recipient,transaction_hash,moment` upsert key, so once the indexer later
 * writes the same row with a matching quantity, sync_moment_total_minted sees
 * a zero delta and total_minted is not double-counted.
 */
export async function recordCollectTransfer({
  momentId,
  recipient,
  quantity,
  transactionHash,
}: RecordCollectTransferParams): Promise<void> {
  if (!momentId) return;

  try {
    const normalizedRecipient = recipient.toLowerCase();
    await ensureWallets([normalizedRecipient]);
    await upsertTransfers([
      {
        moment: momentId,
        recipient: normalizedRecipient,
        quantity,
        transaction_hash: transactionHash,
        transferred_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error('❌ Failed to eagerly record collect transfer:', error);
  }
}

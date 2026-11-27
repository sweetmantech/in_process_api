import { BATCH_SIZE } from '@/lib/consts';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import resolveCollectorNames from '@/lib/wallets/resolveCollectorNames';
import { upsertTransfers } from '@/lib/supabase/in_process_transfers/upsertTransfers';
import type { Transfers_t } from '@/types/envio';
import { distribute } from './distribute';
import { mapTransfersToSupabase } from './mapTransfersToSupabase';
import notifyAirdrop from './notifyAirdrop';
import { notifyAirdropByEmail } from './notifyAirdropByEmail';
import { notifyCollectByEmail } from './notifyCollectByEmail';

export async function processTransfersInBatches(
  transfers: Transfers_t[]
): Promise<void> {
  if (transfers.length === 0) {
    console.log('ℹ️  No transfers to process');
    return;
  }

  const totalBatches = Math.ceil(transfers.length / BATCH_SIZE);
  let totalProcessed = 0;

  console.log(
    `🔄 Processing ${transfers.length} transfer(s) in ${totalBatches} batch(es) of ${BATCH_SIZE}`
  );

  for (let i = 0; i < transfers.length; i += BATCH_SIZE) {
    const batch = transfers.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    try {
      console.log(
        `🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} transfer(s))`
      );

      await distribute(batch);
      const { rows, processedTransfers } = await mapTransfersToSupabase(batch);

      const recipients = [...new Set(rows.map((r) => r.recipient))];
      if (recipients.length > 0) {
        await ensureWallets(recipients);
        await resolveCollectorNames(recipients);
      }

      await upsertTransfers(rows);
      await notifyCollectByEmail(batch);
      await notifyAirdrop(processedTransfers);
      await notifyAirdropByEmail(processedTransfers);
      totalProcessed += rows.length;
      console.log(
        `✅ Batch ${batchNumber}: Upserted ${rows.length} row(s) into in_process_transfers`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Batch ${batchNumber}: Error processing batch: ${errorMessage}`
      );
      throw error;
    }
  }

  console.log(
    `✅ Completed processing: ${totalProcessed}/${transfers.length} transfer row(s)`
  );
}

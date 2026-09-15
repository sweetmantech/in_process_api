import type { InProcess_Comments_t } from '@/types/envio';
import { BATCH_SIZE } from '@/lib/consts';
import { mapCommentsToSupabase } from './mapCommentsToSupabase';
import { upsertComments } from '@/lib/supabase/in_process_moment_comments/upsertComments';
import { ensureWallets } from '@/lib/wallets/ensureWallets';

export async function processCommentsInBatches(
  comments: InProcess_Comments_t[]
): Promise<void> {
  let totalProcessed = 0;

  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    try {
      const batch = comments.slice(i, i + BATCH_SIZE);
      const mappedComments = await mapCommentsToSupabase(batch);
      await ensureWallets(mappedComments.map((c) => c.artist_address));

      const protocolComments = mappedComments.filter((c) => c.comment_id);
      const mintComments = mappedComments.filter((c) => !c.comment_id);

      await upsertComments(protocolComments, 'comment_id');
      await upsertComments(mintComments, 'moment,transaction_hash,log_index');

      totalProcessed += mappedComments.length;
      console.log(
        `💬 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Processed ${mappedComments.length} comments`
      );
    } catch (error) {
      console.error(
        `❌ Failed to process batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
        error
      );
    }
  }

  if (totalProcessed > 0)
    console.log(`✅  Completed processing: ${totalProcessed} moment comments`);
  else console.log(`ℹ️  No moment comments to process`);
}

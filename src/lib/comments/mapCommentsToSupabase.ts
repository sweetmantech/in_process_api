import blockTsToISOString from '@/lib/blockTsToISOString';
import type { InProcess_Comments_t } from '@/types/envio';
import type { Database } from '@/lib/supabase/types';
import { getMomentIdMap } from '@/lib/moment/getMomentIdMap';

export async function mapCommentsToSupabase(
  momentComments: InProcess_Comments_t[]
): Promise<
  Database['public']['Tables']['in_process_moment_comments']['Insert'][]
> {
  const mappedComments: Array<
    Database['public']['Tables']['in_process_moment_comments']['Insert']
  > = [];
  const momentIdMap = await getMomentIdMap(momentComments);

  for (const comment of momentComments) {
    const tripletKey = `${comment.collection.toLowerCase()}:${comment.chain_id}:${comment.token_id}`;
    const momentId = momentIdMap.get(tripletKey);
    if (momentId) {
      mappedComments.push({
        moment: momentId,
        artist_address: comment.sender.toLowerCase(),
        comment: comment.comment ?? null,
        commented_at: blockTsToISOString(comment.commented_at),
        comment_id: comment.comment_id ?? null,
        reply_to_id: comment.reply_to_id ?? null,
        nonce: comment.nonce ?? null,
        sparks_quantity:
          comment.sparks_quantity === undefined ||
          comment.sparks_quantity === null
            ? null
            : Number(comment.sparks_quantity),
        transaction_hash: comment.transaction_hash,
        log_index: comment.log_index,
      });
    }
  }

  return mappedComments;
}

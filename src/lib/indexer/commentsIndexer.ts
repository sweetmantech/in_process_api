import { processCommentsInBatches } from '@/lib/comments/processCommentsInBatches';
import { selectMaxCommentedAt } from '@/lib/comments/selectMaxCommentedAt';
import type { InProcess_Comments_t } from '@/types/envio';
import type { IndexConfig } from '@/types/indexerFactory';

export const commentsIndexer: IndexConfig<InProcess_Comments_t> = {
  processBatchFn: processCommentsInBatches,
  selectMaxTimestampFn: selectMaxCommentedAt,
  indexName: 'comments',
  dataPath: 'InProcess_Comments',
  queryFragment: `InProcess_Comments(limit: $limit, offset: $offset_comments, order_by: {commented_at: asc}, where: {commented_at: {_gt: $minTimestamp_comments}}) {
    id collection sender token_id comment comment_id reply_to_id nonce sparks_quantity chain_id commented_at transaction_hash log_index
  }`,
};

import { Address, Log, parseEventLogs, zeroHash } from 'viem';
import { commentsABI } from '@zoralabs/protocol-deployments';
import { COMMENTS_ADDRESS } from '@/lib/consts';
import selectMoments from '@/lib/supabase/in_process_moments/selectMoments';
import { upsertComments } from '@/lib/supabase/in_process_moment_comments/upsertComments';
import { ensureWallets } from '@/lib/wallets/ensureWallets';

export type RecordCommentEagerlyParams = {
  logs: Log[];
  chainId: number;
  collectionAddress: Address;
  tokenId: string;
  sender: Address;
  text: string;
};

/**
 * Writes a just-posted comment into Supabase immediately after the on-chain
 * transaction succeeds, instead of waiting for the async Envio indexer to
 * catch up (it lags by up to its polling interval). Shares the indexer's
 * `comment_id` upsert key, so the indexer's later write of the same event is
 * an idempotent overwrite rather than a duplicate row.
 */
export async function recordCommentEagerly({
  logs,
  chainId,
  collectionAddress,
  tokenId,
  sender,
  text,
}: RecordCommentEagerlyParams): Promise<void> {
  try {
    const commentsAddress = COMMENTS_ADDRESS[chainId];
    if (!commentsAddress || !logs.length) return;

    const [commentedLog] = parseEventLogs({
      abi: commentsABI,
      logs,
      eventName: 'Commented',
    }).filter(
      (log) => log.address.toLowerCase() === commentsAddress.toLowerCase()
    );
    if (!commentedLog) return;

    const { data: moments } = await selectMoments({
      moments: [{ collectionAddress, tokenId, chainId }],
      limit: 1,
    });
    const momentId = moments?.[0]?.id;
    if (!momentId) return;

    const args = commentedLog.args as {
      commentId: `0x${string}`;
      commentIdentifier: { nonce: `0x${string}` };
      replyToId: `0x${string}`;
      sparksQuantity: bigint;
    };

    await ensureWallets([sender.toLowerCase()]);
    await upsertComments(
      [
        {
          moment: momentId,
          artist_address: sender.toLowerCase(),
          comment: text,
          commented_at: new Date().toISOString(),
          comment_id: args.commentId,
          reply_to_id: args.replyToId === zeroHash ? null : args.replyToId,
          nonce: args.commentIdentifier.nonce,
          sparks_quantity: Number(args.sparksQuantity),
          transaction_hash: commentedLog.transactionHash,
          log_index: commentedLog.logIndex,
        },
      ],
      'comment_id'
    );
  } catch (error) {
    console.error('❌ Failed to eagerly record comment:', error);
  }
}

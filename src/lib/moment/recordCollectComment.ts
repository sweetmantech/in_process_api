import { Address, Log, parseEventLogs } from 'viem';
import { upsertComments } from '@/lib/supabase/in_process_moment_comments/upsertComments';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import mintCommentAbi from '@/lib/abi/mintCommentAbi';

export type RecordCollectCommentParams = {
  momentId: string | null;
  logs: Log[];
  collectionAddress: Address;
  tokenId: string;
  sender: Address;
  comment: string;
};

/**
 * Writes a collect's inline "mint comment" into Supabase immediately after the
 * on-chain transaction succeeds, instead of waiting for the async Envio
 * indexer. Mint comments have no protocol comment_id (see
 * Coins-Beneficiaries-Indexer's buildComment), so they dedupe on the
 * immutable (moment, transaction_hash, log_index) triple instead — both
 * taken straight from the parsed log, so no extra RPC call is needed to keep
 * this idempotent against the indexer's later write of the same event.
 */
export async function recordCollectComment({
  momentId,
  logs,
  collectionAddress,
  tokenId,
  sender,
  comment,
}: RecordCollectCommentParams): Promise<void> {
  if (!momentId || !comment.trim() || !logs.length) return;

  try {
    const [mintCommentLog] = parseEventLogs({
      abi: mintCommentAbi,
      logs,
      eventName: 'MintComment',
    }).filter(
      (log) =>
        log.args.tokenContract.toLowerCase() ===
          collectionAddress.toLowerCase() &&
        log.args.tokenId.toString() === tokenId
    );
    if (!mintCommentLog) return;

    const normalizedSender = sender.toLowerCase();
    await ensureWallets([normalizedSender]);
    await upsertComments(
      [
        {
          moment: momentId,
          artist_address: normalizedSender,
          comment,
          commented_at: new Date().toISOString(),
          transaction_hash: mintCommentLog.transactionHash,
          log_index: mintCommentLog.logIndex,
        },
      ],
      'moment,transaction_hash,log_index'
    );
  } catch (error) {
    console.error('❌ Failed to eagerly record collect comment:', error);
  }
}

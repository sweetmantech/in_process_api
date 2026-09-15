import { Address, Hash, OneOf } from 'viem';
import { z } from 'zod';
import { CHAIN_ID, IS_TESTNET } from '@/lib/consts';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import { getArtistSmartAccount } from '@/lib/coinbase/getArtistSmartAccount';
import { collectSchema } from '../schema/collectSchema';
import getCollectCall from '../viem/getCollectCall';
import { validateBalanceAndAllowance } from '@/lib/sales/validateBalanceAndAllowance';
import { Call } from '@coinbase/coinbase-sdk/dist/types/calls';
import { resolveMomentInfo } from './resolveMomentInfo';
import { recordCollectTransfer } from './recordCollectTransfer';
import { recordCollectComment } from './recordCollectComment';

export type CollectMomentInput = z.infer<typeof collectSchema> & {
  artistId: string;
  primaryWallet: Address;
};

export interface CollectResult {
  hash: Hash;
  chainId: number;
}

/**
 * Collect a In Process 1155 token using a smart account via Coinbase CDP.
 * Accepts the full API input shape to collect a Moment.
 */
export async function collectMoment({
  moment,
  comment,
  amount,
  artistId,
  primaryWallet,
}: CollectMomentInput): Promise<CollectResult> {
  const smartAccount = await getArtistSmartAccount({ artistId });

  // Get token info and sale config
  const { saleConfig, id: momentId } = await resolveMomentInfo(moment);

  if (!saleConfig) {
    throw new Error('Sale config not found');
  }

  const approveCall = await validateBalanceAndAllowance(
    smartAccount.address,
    saleConfig,
    amount
  );

  // Get the collect call using the shared function
  const collectCall = getCollectCall(
    moment.collectionAddress,
    Number(moment.tokenId),
    saleConfig,
    primaryWallet,
    comment,
    amount
  );

  const calls = [...approveCall, collectCall] as OneOf<
    Call<unknown, { [key: string]: unknown }>
  >[];

  // Send the transaction and wait for receipt using the helper
  const transaction = await sendUserOperation({
    smartAccount,
    network: IS_TESTNET ? 'base-sepolia' : 'base',
    calls,
  });

  // Reflect the mint (and any inline comment) in Supabase right away, ahead
  // of the async chain indexer.
  await recordCollectTransfer({
    momentId,
    recipient: primaryWallet,
    quantity: amount,
    transactionHash: transaction.transactionHash as Hash,
  });
  await recordCollectComment({
    momentId,
    logs: transaction.logs,
    collectionAddress: moment.collectionAddress,
    tokenId: moment.tokenId,
    sender: primaryWallet,
    comment,
  });

  return {
    hash: transaction.transactionHash as Hash,
    chainId: CHAIN_ID,
  };
}

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

export async function collectMoment({
  moment,
  comment,
  quantity,
  artistId,
  primaryWallet,
}: CollectMomentInput): Promise<CollectResult> {
  const smartAccount = await getArtistSmartAccount({ artistId });

  const { saleConfig, id: momentId } = await resolveMomentInfo(moment);

  if (!saleConfig) {
    throw new Error('Sale config not found');
  }

  const approveCall = await validateBalanceAndAllowance(
    smartAccount.address,
    saleConfig,
    quantity
  );

  const collectCall = getCollectCall(
    moment.collectionAddress,
    Number(moment.tokenId),
    saleConfig,
    primaryWallet,
    comment,
    quantity
  );

  const calls = [...approveCall, collectCall] as OneOf<
    Call<unknown, { [key: string]: unknown }>
  >[];

  const transaction = await sendUserOperation({
    smartAccount,
    network: IS_TESTNET ? 'base-sepolia' : 'base',
    calls,
  });

  await recordCollectTransfer({
    momentId,
    recipient: primaryWallet,
    quantity,
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

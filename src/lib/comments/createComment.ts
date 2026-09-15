import { Address, Hash, Hex, OneOf, zeroAddress } from 'viem';
import { Call } from '@coinbase/coinbase-sdk/dist/types/calls';
import { CHAIN_ID, IS_TESTNET } from '@/lib/consts';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import { getCommenterSmartAccount } from '@/lib/coinbase/getCommenterSmartAccount';
import getCommentCall from '@/lib/viem/getCommentCall';
import { recordCommentEagerly } from './recordCommentEagerly';
import type { AuthResult } from '@/types/auth';

export type CreateCommentInput = {
  artist: AuthResult;
  collection: { address: Address; chainId: number };
  tokenId: string;
  text: string;
  replyTo?: {
    commenter: Address;
    contractAddress: Address;
    tokenId: string;
    nonce: string;
  };
  referrer?: Address;
};

export interface CreateCommentResult {
  hash: Hash;
  chainId: number;
}

export async function createComment({
  artist,
  collection,
  tokenId,
  text,
  replyTo,
  referrer,
}: CreateCommentInput): Promise<CreateCommentResult> {
  const smartAccount = await getCommenterSmartAccount();

  const commentCall = getCommentCall({
    chainId: collection.chainId,
    commenter: artist.primaryWallet,
    collectionAddress: collection.address,
    tokenId,
    text,
    replyTo: replyTo
      ? {
          commenter: replyTo.commenter,
          contractAddress: replyTo.contractAddress,
          tokenId: replyTo.tokenId,
          nonce: replyTo.nonce as Hex,
        }
      : undefined,
    referrer: referrer ?? zeroAddress,
  });

  const transaction = await sendUserOperation({
    smartAccount,
    network: IS_TESTNET ? 'base-sepolia' : 'base',
    calls: [commentCall] as OneOf<Call<unknown, { [key: string]: unknown }>>[],
  });

  // Reflect the comment in Supabase right away, ahead of the async chain indexer.
  await recordCommentEagerly({
    logs: transaction.logs ?? [],
    chainId: collection.chainId,
    collectionAddress: collection.address,
    tokenId,
    sender: artist.primaryWallet,
    text,
  });

  return {
    hash: transaction.transactionHash as Hash,
    chainId: CHAIN_ID,
  };
}

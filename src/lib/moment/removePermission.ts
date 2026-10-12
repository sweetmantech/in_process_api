import type { ArtistContext } from '@/types/artist';
import { Address, Hash } from 'viem';
import { z } from 'zod';
import { CHAIN_ID, IS_TESTNET } from '@/lib/consts';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import { getOperationalSmartWallet } from '@/lib/smartwallets/getOperationalSmartWallet';
import { permissionSchema } from '../schema/permissionSchema';
import getRemovePermissionCall from '../viem/getRemovePermissionCall';
import getCollectionOwner from '../viem/getCollectionOwner';
import getPermissionTargets from '../wallets/getPermissionTargets';

export type RemovePermissionInput = z.infer<typeof permissionSchema> & {
  artist: ArtistContext;
};

export interface RemovePermissionResult {
  hash: Hash;
  chainId: number;
}

export async function removePermission({
  moment,
  adminAddress,
  artist,
}: RemovePermissionInput): Promise<RemovePermissionResult> {
  const [smartAccount, owner, targets] = await Promise.all([
    getOperationalSmartWallet({ artist, moment }),
    getCollectionOwner(moment),
    getPermissionTargets(adminAddress),
  ]);

  const protectedAddresses = new Set(
    [owner, smartAccount.address].map((address) => address.toLowerCase())
  );
  if (protectedAddresses.has(adminAddress.toLowerCase())) {
    throw new Error(
      'Cannot remove the collection owner or the wallet sending this request'
    );
  }

  const transaction = await sendUserOperation({
    smartAccount,
    network: IS_TESTNET ? 'base-sepolia' : 'base',
    calls: targets
      .filter((target) => !protectedAddresses.has(target.toLowerCase()))
      .map((target) => getRemovePermissionCall(moment, target)),
  });

  return {
    hash: transaction.transactionHash as Hash,
    chainId: CHAIN_ID,
  };
}

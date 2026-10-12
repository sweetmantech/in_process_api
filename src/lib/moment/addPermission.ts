import type { ArtistContext } from '@/types/artist';
import { Address, Hash } from 'viem';
import { z } from 'zod';
import { CHAIN_ID, IS_TESTNET } from '@/lib/consts';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import { getOperationalSmartWallet } from '@/lib/smartwallets/getOperationalSmartWallet';
import { permissionSchema } from '../schema/permissionSchema';
import getAddPermissionCall from '../viem/getAddPermissionCall';
import getPermissionTargets from '../wallets/getPermissionTargets';

export type AddPermissionInput = z.infer<typeof permissionSchema> & {
  artist: ArtistContext;
};

export interface AddPermissionResult {
  hash: Hash;
  chainId: number;
}

export async function addPermission({
  moment,
  adminAddress,
  artist,
}: AddPermissionInput): Promise<AddPermissionResult> {
  const [smartAccount, targets] = await Promise.all([
    getOperationalSmartWallet({ artist, moment }),
    getPermissionTargets(adminAddress),
  ]);

  const transaction = await sendUserOperation({
    smartAccount,
    network: IS_TESTNET ? 'base-sepolia' : 'base',
    calls: targets.map((target) => getAddPermissionCall(moment, target)),
  });

  return {
    hash: transaction.transactionHash as Hash,
    chainId: CHAIN_ID,
  };
}

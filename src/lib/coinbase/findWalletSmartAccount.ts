import { type Address } from 'viem';
import { EvmSmartAccount } from '@coinbase/cdp-sdk';
import cdp from '@/lib/coinbase/client';
import { deterministicAccountName } from './deterministricAccountName';

export async function findWalletSmartAccount({
  address,
}: {
  address: Address;
}): Promise<EvmSmartAccount | null> {
  const name = deterministicAccountName(address.toLowerCase());
  const owner = await cdp.evm.getAccount({ name }).catch((error) => {
    if (error?.statusCode === 404) return null;
    throw error;
  });
  if (!owner) return null;
  return cdp.evm.getOrCreateSmartAccount({ name, owner });
}

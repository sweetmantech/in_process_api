import { type Address, zeroAddress } from 'viem';
import { EvmSmartAccount } from '@coinbase/cdp-sdk';
import cdp from '@/lib/coinbase/client';
import { deterministicAccountName } from './deterministricAccountName';
import ensureSmartWalletOwnerAddress from '@/lib/smartwallets/ensureSmartWalletOwnerAddress';
import saveOperatorWallet from '@/lib/wallets/saveOperatorWallet';

export async function getWalletSmartAccount({
  address,
}: {
  address: Address;
}): Promise<EvmSmartAccount> {
  const lowercased = address.toLowerCase() as Address;
  const evmAccount = await cdp.evm.getOrCreateAccount({
    name: deterministicAccountName(lowercased),
  });
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: evmAccount.name as string,
    owner: evmAccount,
  });

  if (lowercased !== zeroAddress) {
    await ensureSmartWalletOwnerAddress(smartAccount, lowercased);
    await saveOperatorWallet({
      eoa: lowercased,
      operator: smartAccount.address as Address,
    });
  }

  return smartAccount;
}

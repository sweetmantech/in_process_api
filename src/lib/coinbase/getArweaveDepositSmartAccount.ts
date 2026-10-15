import { EvmSmartAccount } from '@coinbase/cdp-sdk';
import cdp from '@/lib/coinbase/client';
import { IN_PROCESS_ARWEAVE_DEPOSIT_ACCOUNT_NAME } from '@/lib/consts';

export async function getArweaveDepositSmartAccount(): Promise<EvmSmartAccount> {
  const evmAccount = await cdp.evm.getOrCreateAccount({
    name: IN_PROCESS_ARWEAVE_DEPOSIT_ACCOUNT_NAME,
  });
  return cdp.evm.getOrCreateSmartAccount({
    name: evmAccount.name as string,
    owner: evmAccount,
  });
}

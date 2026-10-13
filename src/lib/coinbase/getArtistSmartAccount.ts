import cdp from '@/lib/coinbase/client';
import { EvmSmartAccount } from '@coinbase/cdp-sdk';
import { deterministicAccountName } from './deterministricAccountName';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';

export async function getArtistSmartAccount({
  artistId,
}: {
  artistId: string;
}): Promise<EvmSmartAccount> {
  const evmAccount = await cdp.evm.getOrCreateAccount({
    name: deterministicAccountName(artistId),
  });
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: evmAccount.name as string,
    owner: evmAccount,
  });

  const smartAddress = smartAccount.address.toLowerCase();

  const { data: existing } = await selectWallets({
    artistIds: [artistId],
    type: 'payment',
  });
  if (existing?.[0]?.address !== smartAddress) {
    await upsertWallets([
      {
        address: smartAddress,
        artist: artistId,
        type: 'payment',
      },
    ]);
  }

  return smartAccount;
}

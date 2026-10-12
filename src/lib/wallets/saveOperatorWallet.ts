import { Address } from 'viem';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import isSmartWalletType from './isSmartWalletType';

const saveOperatorWallet = async ({
  eoa,
  operator,
}: {
  eoa: Address;
  operator: Address;
}): Promise<void> => {
  try {
    const { data } = await selectWallets({ addresses: [eoa] });
    const eoaWallet = data?.[0];
    if (!eoaWallet || isSmartWalletType(eoaWallet.type)) return;

    await upsertWallets(
      [
        {
          address: operator.toLowerCase(),
          artist: eoaWallet.artist_id,
          type: 'operator',
          eoa: eoa.toLowerCase(),
        },
      ],
      { ignoreDuplicates: true }
    );
  } catch (error) {
    console.error('❌ saveOperatorWallet failed:', error);
  }
};

export default saveOperatorWallet;

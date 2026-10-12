import { Address } from 'viem';
import { CHAIN_ID } from '@/lib/consts';
import selectOperatorWallets from '@/lib/supabase/in_process_wallets/selectOperatorWallets';
import getWalletBalance from '@/lib/viem/getWalletBalance';
import migrateSmartWalletFunds from './migrateSmartWalletFunds';

const migrateOperatorWalletsFunds = async ({
  artistId,
  primarySmartAccountAddress,
  chainId = CHAIN_ID,
}: {
  artistId: string;
  primarySmartAccountAddress: Address;
  chainId?: number;
}) => {
  try {
    const { data: operators, error } = await selectOperatorWallets(artistId);
    if (error) throw error;

    const balances = await Promise.all(
      (operators ?? []).map(async (operator) => ({
        eoa: operator.eoa as Address,
        ...(await getWalletBalance(operator.address as Address, chainId)),
      }))
    );

    for (const { eoa, ethBalance, usdcBalance } of balances) {
      if (ethBalance === BigInt(0) && usdcBalance === BigInt(0)) continue;
      await migrateSmartWalletFunds({
        legacyWalletAddress: eoa,
        primarySmartAccountAddress,
        chainId,
      });
    }
  } catch (error) {
    console.error('❌ migrateOperatorWalletsFunds failed:', error);
  }
};

export default migrateOperatorWalletsFunds;

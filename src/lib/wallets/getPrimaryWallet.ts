import { Tables } from '../supabase/types';
import isSmartWalletType from './isSmartWalletType';

const getPrimaryWallet = (
  wallets: Tables<'in_process_wallets'>[] | null | undefined
): string | undefined => {
  if (!wallets?.length) return undefined;
  const externalWallet = wallets.find((w) => w.type === 'external');
  const privyWallet = wallets.find((w) => w.type === 'privy');
  const eoaWallet = wallets.find((w) => !isSmartWalletType(w.type));
  return (
    externalWallet?.address ??
    privyWallet?.address ??
    eoaWallet?.address ??
    wallets[0].address ??
    undefined
  );
};
export default getPrimaryWallet;

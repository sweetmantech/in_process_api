import { WalletType } from '@/types/wallets';

const SMART_WALLET_TYPES: WalletType[] = ['smart', 'operator'];

const isSmartWalletType = (type: WalletType | null | undefined): boolean =>
  !!type && SMART_WALLET_TYPES.includes(type);

export default isSmartWalletType;

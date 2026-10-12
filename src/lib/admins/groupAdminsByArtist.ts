import { Address } from 'viem';
import isSmartWalletType from '@/lib/wallets/isSmartWalletType';
import type { WalletType } from '@/types/wallets';

export type AdminGroup = {
  artistId: string | null;
  username: string | null;
  addresses: Address[];
};

type AdminWallet = {
  address: string;
  artist_id: string | null;
  type: WalletType | null;
  artist: { username: string | null } | null;
};

const groupAdminsByArtist = ({
  admins,
  wallets,
}: {
  admins: Address[];
  wallets: AdminWallet[];
}): AdminGroup[] => {
  const walletByAddress = new Map(
    wallets.map((wallet) => [wallet.address.toLowerCase(), wallet])
  );
  const groups = new Map<string, AdminGroup & { smart: Address[] }>();

  for (const admin of admins) {
    const wallet = walletByAddress.get(admin.toLowerCase());
    const artistId = wallet?.artist_id ?? null;
    const key = artistId ?? admin.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        artistId,
        username: wallet?.artist?.username ?? null,
        addresses: [],
        smart: [],
      });
    }
    const group = groups.get(key)!;
    if (isSmartWalletType(wallet?.type)) group.smart.push(admin);
    else group.addresses.push(admin);
  }

  return Array.from(groups.values()).map(({ smart, ...group }) => ({
    ...group,
    addresses: [...group.addresses, ...smart],
  }));
};

export default groupAdminsByArtist;

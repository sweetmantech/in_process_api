import { Address } from 'viem';
import { EvmSmartAccount } from '@coinbase/cdp-sdk';
import { getWalletSmartAccount } from '@/lib/coinbase/getWalletSmartAccount';
import getPermission from '@/lib/zora/getPermission';
import { PERMISSION_BIT_ADMIN } from '@/lib/consts';
import type { ArtistContext } from '@/types/artist';
import isSmartWalletType from '@/lib/wallets/isSmartWalletType';

export const getOperationalSmartWallet = async ({
  artist,
  moment,
}: {
  artist: ArtistContext;
  moment: {
    collectionAddress: Address | undefined;
    tokenId: string;
    chainId: number;
  };
}): Promise<EvmSmartAccount> => {
  const { primaryWallet, wallets } = artist;
  const { chainId, collectionAddress } = moment;

  const otherWallets = wallets.filter(
    (w) => w.address.toLowerCase() !== primaryWallet.toLowerCase()
  );
  const orderedWallets = [
    primaryWallet,
    ...otherWallets
      .filter((w) => !isSmartWalletType(w.type))
      .map((w) => w.address),
    ...otherWallets
      .filter((w) => isSmartWalletType(w.type))
      .map((w) => w.address),
  ];

  for (const walletAddress of orderedWallets) {
    const smartAccount = await getWalletSmartAccount({
      address: walletAddress,
    });
    if (!collectionAddress) return smartAccount;

    const permission = await getPermission(
      collectionAddress,
      smartAccount.address as Address,
      chainId
    );
    if (
      (BigInt(permission || 0) & BigInt(PERMISSION_BIT_ADMIN)) !==
      BigInt(0)
    ) {
      return smartAccount;
    }
  }

  throw new Error(
    `No authorized smart wallet found for collection ${collectionAddress}`
  );
};

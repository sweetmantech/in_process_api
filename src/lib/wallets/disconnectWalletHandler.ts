import { NextResponse } from 'next/server';
import { Address } from 'viem';
import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import { AuthResult } from '@/types/auth';
import { upsertArtists } from '../supabase/in_process_artists/upsertArtists';
import selectArtists from '../supabase/in_process_artists/selectArtists';

const disconnectWalletHandler = async ({
  artist,
  address,
}: {
  artist: AuthResult;
  address: Address;
}) => {
  const { artistId, wallets } = artist;
  const wallet = wallets.find(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  )!;

  if (wallet.type === 'external') {
    const { data: profiles } = await selectArtists({
      ids: [artistId],
    });
    const profile = profiles?.[0];
    await upsertArtists({
      id: artistId,
      username: null,
      bio: null,
      x: null,
      instagram: null,
      telegram: null,
      default_collection: null,
    });
    const [upserted] = await upsertArtists({
      username: profile?.username ?? null,
      bio: profile?.bio ?? null,
      x: profile?.x ?? null,
      instagram: profile?.instagram ?? null,
      telegram: profile?.telegram ?? null,
      default_collection: profile?.default_collection ?? null,
    });
    if (!upserted) throw new Error('Failed to update artist');
    await upsertWallets([
      { address: address.toLowerCase(), artist: upserted.id },
    ]);
    return NextResponse.json({ success: true });
  }

  await upsertWallets([{ address: address.toLowerCase(), artist: null }]);
  return NextResponse.json({ success: true });
};

export default disconnectWalletHandler;

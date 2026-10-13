import { Address } from 'viem';
import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import selectPhone from '@/lib/supabase/in_process_artist_phones/selectPhone';
import resolveAddressToEns from '@/lib/ens/resolveAddressToEns';
import getFarcasterUsernameByAddress from '@/lib/farcaster/getFarcasterUsernameByAddress';
import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';
import { upsertArtistNames } from '@/lib/supabase/in_process_artists/upsertArtistNames';

const emptyProfile = {
  id: undefined as string | undefined,
  username: null as string | null,
  bio: null as string | null,
  instagram: null as string | null,
  x: null as string | null,
  telegram: null as string | null,
};

type ArtistProfile = typeof emptyProfile & {
  phone?: Awaited<ReturnType<typeof selectPhone>>['data'];
};

const getArtistProfile = async (
  address: string
): Promise<ArtistProfile | null> => {
  try {
    const normalized = address.toLowerCase();

    const [upserted] = await upsertWallets([{ address: normalized }]);
    if (upserted.eoa) return getArtistProfile(upserted.eoa);

    let profile = upserted.artist ?? emptyProfile;

    if (!profile.username) {
      const username =
        (await getFarcasterUsernameByAddress(address)) ||
        (await resolveAddressToEns(address as Address));

      if (username) {
        await upsertArtistNames(new Map([[normalized, username]]));
        const { data: refreshed } = await selectWallets({
          addresses: [normalized],
        });
        profile = refreshed?.[0]?.artist ?? emptyProfile;
      } else if (!profile.id) {
        const [saved] = await upsertArtists({ username: null });
        if (!saved) throw new Error('Failed to save artist entity');
        await upsertWallets([{ address: normalized, artist: saved.id }]);
        profile = { ...emptyProfile, id: saved.id };
      }
    }

    let phone;
    if (profile.id) {
      const { data, error: phoneError } = await selectPhone({
        artist_id: profile.id,
      });
      if (phoneError) throw phoneError;
      phone = data ?? undefined;
    }

    return { ...profile, phone };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export default getArtistProfile;

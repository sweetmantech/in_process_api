import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type UpsertedWallet = {
  address: string;
  artist_id: string | null;
  eoa: string | null;
  artist: {
    id: string;
    username: string | null;
    bio: string | null;
    instagram: string | null;
    x: string | null;
    telegram: string | null;
  } | null;
};

const upsertWallets = async (
  wallets: Database['public']['Tables']['in_process_wallets']['Insert'][],
  { ignoreDuplicates = false }: { ignoreDuplicates?: boolean } = {}
): Promise<UpsertedWallet[]> => {
  if (!wallets.length) return [];
  const { data, error } = await supabase
    .from('in_process_wallets')
    .upsert(wallets, { onConflict: 'address', ignoreDuplicates })
    .select(
      'address, artist_id:artist, eoa, artist:in_process_artists(id, username, bio, instagram, x, telegram)'
    );
  if (error) throw error;
  return data ?? [];
};

export default upsertWallets;

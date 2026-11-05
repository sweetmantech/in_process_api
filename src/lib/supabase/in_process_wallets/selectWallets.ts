import { supabase } from '@/lib/supabase/client';
import { WalletType } from '@/types/wallets';

const selectWallets = async ({
  addresses,
  artistIds,
  type,
}: {
  addresses?: string[];
  artistIds?: string[];
  type?: WalletType;
} = {}) => {
  let query = supabase
    .from('in_process_wallets')
    .select(
      'address, artist_id:artist, type, artist:in_process_artists(id, username, handle, bio, x, telegram, instagram)'
    );

  if (addresses?.length) {
    query = query.in(
      'address',
      addresses.map((a) => a.toLowerCase())
    );
  } else if (artistIds?.length) {
    query = query.in('artist', artistIds);
    if (type) query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { data };
};

export default selectWallets;

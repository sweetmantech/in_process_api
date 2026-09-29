import { supabase } from '../client';
import type { Tables } from '@/lib/supabase/types';

// Only present when selected with includeCreator.
export type SelectedCollection = Tables<'in_process_collections'> & {
  creator_wallet?: { artist: { username: string | null } | null } | null;
};

const COLUMNS_WITH_CREATOR = `*,
  creator_wallet:in_process_wallets!creator(
    artist:in_process_artists(username)
  )`;

const selectCollections = async ({
  addresses,
  artist,
  uri,
  chainId,
  limit,
  includeCreator = false,
}: {
  addresses?: string[];
  artist?: string;
  uri?: string;
  chainId?: number;
  limit?: number;
  /** Also join the creator's wallet -> artist username (two extra lookups per row). */
  includeCreator?: boolean;
} = {}): Promise<SelectedCollection[]> => {
  // A conditional select string defeats supabase-js type inference, so the
  // columns are passed as a plain string and the row type is declared above.
  const columns: string = includeCreator ? COLUMNS_WITH_CREATOR : '*';
  let query = supabase.from('in_process_collections').select(columns);

  if (addresses?.length) {
    query = query.in(
      'address',
      addresses.map((address) => address.toLowerCase())
    );
  }

  if (artist) {
    query = query
      .eq('creator', artist.toLowerCase())
      .eq('protocol', 'in_process');
  }

  if (uri) query = query.eq('uri', uri);
  if (chainId) query = query.eq('chain_id', chainId);
  if (limit) query = query.limit(limit);

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SelectedCollection[];
};

export default selectCollections;

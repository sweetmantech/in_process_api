import { supabase } from '@/lib/supabase/client';

const selectArtistDefaultCollection = async (artistId: string) => {
  return supabase
    .from('in_process_artists')
    .select(
      `collection:in_process_collections!default_collection(
        id, address, name, chain_id, created_at, uri, protocol, creator,
        admins:in_process_admins(artist_address, token_id)
      )`
    )
    .eq('id', artistId)
    .maybeSingle();
};

export default selectArtistDefaultCollection;

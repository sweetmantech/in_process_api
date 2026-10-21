import { supabase } from '@/lib/supabase/client';

const updateArtistDefaultCollection = async (
  artistId: string,
  collectionId: string
) => {
  return supabase
    .from('in_process_artists')
    .update({ default_collection: collectionId })
    .eq('id', artistId);
};

export default updateArtistDefaultCollection;

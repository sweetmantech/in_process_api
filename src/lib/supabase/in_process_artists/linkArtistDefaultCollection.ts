import { supabase } from '@/lib/supabase/client';

const linkArtistDefaultCollection = async ({
  artistId,
  collectionId,
  expected,
}: {
  artistId: string;
  collectionId: string;
  expected: string | null;
}) => {
  const query = supabase
    .from('in_process_artists')
    .update({ default_collection: collectionId })
    .eq('id', artistId);
  return expected
    ? query.eq('default_collection', expected)
    : query.is('default_collection', null);
};

export default linkArtistDefaultCollection;

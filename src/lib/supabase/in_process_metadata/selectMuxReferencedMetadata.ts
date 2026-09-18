import { supabase } from '@/lib/supabase/client';

const selectMuxReferencedMetadata = async () => {
  return supabase
    .from('in_process_metadata')
    .select('animation_url, content')
    .or(
      'animation_url.ilike.%stream.mux.com%,content->>uri.ilike.%stream.mux.com%'
    );
};

export default selectMuxReferencedMetadata;

import { supabase } from '@/lib/supabase/client';

// PostgREST caps each response (1000 rows by default), so page through all.
const PAGE_SIZE = 1000;

/** Mux playback ids that moments stream from; these assets must be kept. */
const selectMuxPlaybackIds = async (): Promise<string[]> => {
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('in_process_video_playback')
      .select('playback_id')
      .eq('provider', 'mux')
      .not('playback_id', 'is', null)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error)
      throw new Error(`Failed to select playback ids: ${error.message}`);
    for (const row of data ?? [])
      if (row.playback_id) ids.push(row.playback_id);
    if (!data || data.length < PAGE_SIZE) return ids;
  }
};

export default selectMuxPlaybackIds;

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type VideoPlaybackInsert =
  Database['public']['Tables']['in_process_video_playback']['Insert'];

/** Inserts a row unless the moment already has one (e.g. the webhook won the race). */
const insertVideoPlaybackIfAbsent = async (row: VideoPlaybackInsert) => {
  return supabase
    .from('in_process_video_playback')
    .upsert(row, { onConflict: 'moment', ignoreDuplicates: true });
};

export default insertVideoPlaybackIfAbsent;

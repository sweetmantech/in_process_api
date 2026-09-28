import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type VideoPlaybackInsert =
  Database['public']['Tables']['in_process_video_playback']['Insert'];

const upsertVideoPlayback = async (row: VideoPlaybackInsert): Promise<void> => {
  const { error } = await supabase
    .from('in_process_video_playback')
    .upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: 'moment' }
    );
  if (error)
    throw new Error(`Failed to upsert video playback: ${error.message}`);
};

export default upsertVideoPlayback;

import { supabase } from '@/lib/supabase/client';

/** Playback for a moment, only once the asset is ready to stream. */
const selectReadyVideoPlayback = async (momentId: string) => {
  return supabase
    .from('in_process_video_playback')
    .select('provider, playback_id')
    .eq('moment', momentId)
    .eq('status', 'ready')
    .maybeSingle();
};

export default selectReadyVideoPlayback;

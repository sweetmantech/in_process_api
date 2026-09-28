import { supabase } from '@/lib/supabase/client';

/** Video moments without a playback row yet, newest first. */
const selectVideoMomentsPendingPlayback = async (limit: number) => {
  return supabase.rpc('get_video_moments_pending_playback', {
    p_limit: limit,
  });
};

export default selectVideoMomentsPendingPlayback;

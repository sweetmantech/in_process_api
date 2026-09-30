import { supabase } from '@/lib/supabase/client';

const selectVideoPlaybackMomentIds = async (momentIds: string[]) => {
  return supabase
    .from('in_process_video_playback')
    .select('moment')
    .in('moment', momentIds);
};

export default selectVideoPlaybackMomentIds;

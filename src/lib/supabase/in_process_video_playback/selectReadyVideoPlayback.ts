import { supabase } from '@/lib/supabase/client';

export type VideoPlayback = {
  provider: string;
  playback_id: string;
};

/** Playback for a moment, only once the asset is ready to stream. */
const selectReadyVideoPlayback = async (
  momentId: string
): Promise<VideoPlayback | null> => {
  const { data, error } = await supabase
    .from('in_process_video_playback')
    .select('provider, playback_id')
    .eq('moment', momentId)
    .eq('status', 'ready')
    .maybeSingle();
  if (error || !data?.playback_id) return null;
  return { provider: data.provider, playback_id: data.playback_id };
};

export default selectReadyVideoPlayback;

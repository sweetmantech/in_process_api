import { supabase } from '@/lib/supabase/client';

const updateVideoPlaybackAspectRatio = async (
  assetId: string,
  aspectRatio: string
) => {
  return supabase
    .from('in_process_video_playback')
    .update({ aspect_ratio: aspectRatio, updated_at: new Date().toISOString() })
    .eq('provider', 'mux')
    .eq('asset_id', assetId);
};

export default updateVideoPlaybackAspectRatio;

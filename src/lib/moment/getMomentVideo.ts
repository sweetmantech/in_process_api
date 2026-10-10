import selectReadyVideoPlayback from '@/lib/supabase/in_process_video_playback/selectReadyVideoPlayback';

export type MomentVideo = {
  provider: string;
  playback_id: string;
  aspect_ratio: string | null;
};

/** Ready streaming playback for a moment, or null to fall back to animation_url. */
const getMomentVideo = async (
  momentId: string | null
): Promise<MomentVideo | null> => {
  if (!momentId) return null;
  const { data, error } = await selectReadyVideoPlayback(momentId);
  if (error)
    throw new Error(`Failed to select video playback: ${error.message}`);
  if (!data?.playback_id) return null;
  return {
    provider: data.provider,
    playback_id: data.playback_id,
    aspect_ratio: data.aspect_ratio,
  };
};

export default getMomentVideo;

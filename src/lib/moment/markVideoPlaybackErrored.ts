import insertVideoPlaybackIfAbsent from '@/lib/supabase/in_process_video_playback/insertVideoPlaybackIfAbsent';

/** Records a moment whose video can't be ingested, taking it out of the queue. */
const markVideoPlaybackErrored = async (
  momentId: string,
  sourceUri: string
) => {
  const { error } = await insertVideoPlaybackIfAbsent({
    moment: momentId,
    provider: 'mux',
    status: 'errored',
    source_uri: sourceUri,
  });
  if (error)
    throw new Error(`Failed to mark playback errored: ${error.message}`);
};

export default markVideoPlaybackErrored;

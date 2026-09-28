import selectVideoMomentsPendingPlayback from '@/lib/supabase/in_process_video_playback/selectVideoMomentsPendingPlayback';
import ingestMomentVideoToMux from '@/lib/moment/ingestMomentVideoToMux';
import markVideoPlaybackErrored from '@/lib/moment/markVideoPlaybackErrored';
import isPermanentMuxError from './isPermanentMuxError';

export type IngestPendingSummary = {
  selected: number;
  created: number;
  errored: number;
  retryLater: number;
};

/**
 * Gives the next `limit` video moments without playback a Mux streaming copy,
 * newest first. Drives both the backfill and auto-ingest of new videos.
 */
const ingestPendingMomentVideos = async (
  limit: number
): Promise<IngestPendingSummary> => {
  const summary = { selected: 0, created: 0, errored: 0, retryLater: 0 };
  if (limit <= 0) return summary;

  const { data, error } = await selectVideoMomentsPendingPlayback(limit);
  if (error)
    throw new Error(`Failed to select pending videos: ${error.message}`);
  summary.selected = data?.length ?? 0;

  for (const { moment, source_uri } of data ?? []) {
    try {
      const result = await ingestMomentVideoToMux({
        momentId: moment,
        sourceUri: source_uri,
      });
      if (result.status === 'created') {
        summary.created++;
      } else {
        await markVideoPlaybackErrored(moment, source_uri);
        summary.errored++;
      }
    } catch (e) {
      if (isPermanentMuxError(e)) {
        await markVideoPlaybackErrored(moment, source_uri);
        summary.errored++;
        continue;
      }
      // Transient (rate limit, Mux/DB outage): leave it pending for the next
      // run and stop this one instead of hammering the API.
      console.error(`Mux ingest failed for moment ${moment}:`, e);
      summary.retryLater++;
      break;
    }
  }

  return summary;
};

export default ingestPendingMomentVideos;

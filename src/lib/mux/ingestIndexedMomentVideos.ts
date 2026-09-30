import type { Database } from '@/lib/supabase/types';
import selectVideoPlaybackMomentIds from '@/lib/supabase/in_process_video_playback/selectVideoPlaybackMomentIds';
import ingestMomentVideoToMux from '@/lib/moment/ingestMomentVideoToMux';

type MetadataRecord =
  Database['public']['Tables']['in_process_metadata']['Insert'];

const ingestIndexedMomentVideos = async (
  records: MetadataRecord[]
): Promise<void> => {
  const candidates = records
    .map((record) => {
      const content = record.content as { mime?: string; uri?: string } | null;
      return {
        momentId: record.moment,
        mime: content?.mime ?? '',
        sourceUri: record.animation_url || content?.uri || '',
      };
    })
    .filter(
      ({ mime, sourceUri }) =>
        mime.startsWith('video') &&
        sourceUri &&
        !sourceUri.includes('stream.mux.com')
    );
  if (!candidates.length) return;

  const { data: existing, error } = await selectVideoPlaybackMomentIds(
    candidates.map((c) => c.momentId)
  );
  if (error) {
    console.error('[mux-ingest] failed to read playback rows:', error.message);
    return;
  }
  const withPlayback = new Set((existing ?? []).map((row) => row.moment));

  for (const { momentId, sourceUri } of candidates) {
    if (withPlayback.has(momentId)) continue;
    try {
      const result = await ingestMomentVideoToMux({ momentId, sourceUri });
      if (result.status === 'created') {
        console.log(
          `[mux-ingest] created moment=${momentId} asset=${result.assetId} source=${sourceUri}`
        );
      } else {
        console.log(
          `[mux-ingest] skipped moment=${momentId} reason="${result.reason}" source=${sourceUri}`
        );
      }
    } catch (e) {
      console.error(`[mux-ingest] failed moment=${momentId}:`, e);
    }
  }
};

export default ingestIndexedMomentVideos;

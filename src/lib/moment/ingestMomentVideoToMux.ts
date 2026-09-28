import getMuxIngestUrl from '@/lib/mux/getMuxIngestUrl';
import createMuxAssetFromUrl from '@/lib/mux/createMuxAssetFromUrl';
import buildMuxMomentPassthrough from '@/lib/mux/buildMuxMomentPassthrough';
import insertVideoPlaybackIfAbsent from '@/lib/supabase/in_process_video_playback/insertVideoPlaybackIfAbsent';

export type IngestMomentVideoResult =
  | { status: 'created'; assetId: string; playbackId: string }
  | { status: 'skipped'; reason: string };

/**
 * Creates the Mux streaming copy of a moment's video from its source URI and
 * records it as `preparing`; the Mux webhook then marks it ready or errored.
 */
const ingestMomentVideoToMux = async ({
  momentId,
  sourceUri,
}: {
  momentId: string;
  sourceUri: string;
}): Promise<IngestMomentVideoResult> => {
  const url = getMuxIngestUrl(sourceUri);
  if (!url) return { status: 'skipped', reason: 'no fetchable source' };

  const { assetId, playbackId } = await createMuxAssetFromUrl(
    url,
    buildMuxMomentPassthrough(momentId)
  );

  const { error } = await insertVideoPlaybackIfAbsent({
    moment: momentId,
    provider: 'mux',
    asset_id: assetId,
    playback_id: playbackId,
    status: 'preparing',
    source_uri: sourceUri,
  });
  if (error)
    throw new Error(`Failed to record video playback: ${error.message}`);

  return { status: 'created', assetId, playbackId };
};

export default ingestMomentVideoToMux;

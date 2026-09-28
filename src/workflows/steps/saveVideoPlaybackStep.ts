import { Address } from 'viem';
import selectMoments from '@/lib/supabase/in_process_moments/selectMoments';
import upsertVideoPlayback from '@/lib/supabase/in_process_video_playback/upsertVideoPlayback';
import { findMuxAssetIdFromPlaybackUrl } from '@/lib/mux/findMuxAssetIdFromPlaybackUrl';
import getMuxPlaybackIdFromUrl from '@/lib/mux/getMuxPlaybackIdFromUrl';

/** Records the moment's Mux asset as its streaming playback. */
export default async function saveVideoPlaybackStep(
  moment: { collectionAddress: Address; tokenId: string; chainId: number },
  playbackUrl: string
): Promise<{ momentId: string; playbackId: string }> {
  'use step';
  const playbackId = getMuxPlaybackIdFromUrl(playbackUrl);
  if (!playbackId) throw new Error(`Not a Mux playback URL: ${playbackUrl}`);

  const { data, error } = await selectMoments({
    moments: [moment],
    chainId: moment.chainId,
  });
  if (error) throw new Error(error.message);
  const momentId = data?.find(
    (m) =>
      m.collection.address.toLowerCase() ===
        moment.collectionAddress.toLowerCase() &&
      String(m.token_id) === moment.tokenId
  )?.id;
  // Throwing lets the workflow retry once the indexer has stored the moment.
  if (!momentId) throw new Error('Moment not indexed yet');

  const assetId = await findMuxAssetIdFromPlaybackUrl(playbackUrl);
  if (!assetId) throw new Error(`Mux asset not found for ${playbackId}`);

  const { error: upsertError } = await upsertVideoPlayback({
    moment: momentId,
    provider: 'mux',
    asset_id: assetId,
    playback_id: playbackId,
    status: 'ready',
  });
  if (upsertError) throw new Error(upsertError.message);
  return { momentId, playbackId };
}

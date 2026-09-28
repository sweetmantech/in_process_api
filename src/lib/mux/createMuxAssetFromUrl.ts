import mux from '@/lib/mux';

/** Asks Mux to fetch and transcode a video from a public URL. */
const createMuxAssetFromUrl = async (
  url: string,
  passthrough: string
): Promise<{ assetId: string; playbackId: string }> => {
  const asset = await mux.video.assets.create({
    inputs: [{ url }],
    playback_policy: ['public'],
    video_quality: 'basic',
    passthrough,
  });
  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) throw new Error(`Mux asset ${asset.id} has no playback id`);
  return { assetId: asset.id, playbackId };
};

export default createMuxAssetFromUrl;

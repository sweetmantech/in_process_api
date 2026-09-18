import mux from '.';
import { deleteMuxAsset } from './deleteAsset';
import getReferencedMuxPlaybackIds from './getReferencedMuxPlaybackIds';

const cleanTemporaryAssets = async () => {
  const temporaryAssets = [];
  const currentEpoch = Date.now();
  const AGE_MS = 60 * 60 * 1000; // 1 hour in milliseconds
  try {
    const referencedPlaybackIds = await getReferencedMuxPlaybackIds();

    for await (const asset of mux.video.assets.list()) {
      // Delete temporary assets: if an asset was uploaded more than 1 hour ago and is still in Mux,
      // it indicates the artist uploaded the asset but never completed the moment creation process.
      // Assets still referenced by indexed-but-not-yet-migrated moment metadata are kept regardless
      // of age — migrateAssetToArweave owns deleting those, only after it has copied them to Arweave.
      const assetCreatedAt = Number(asset.created_at) * 1000;
      const threshold = currentEpoch - AGE_MS;
      const isStillReferenced = asset.playback_ids?.some((p) =>
        referencedPlaybackIds.has(p.id)
      );
      if (assetCreatedAt < threshold && !isStillReferenced) {
        temporaryAssets.push(asset);
      }
    }
    const promise = temporaryAssets.map(async (asset) => {
      await deleteMuxAsset(asset.id);
    });
    await Promise.all(promise);
  } catch (assetsError: any) {
    console.error('Error fetching assets list:', assetsError);
  }
};

export default cleanTemporaryAssets;

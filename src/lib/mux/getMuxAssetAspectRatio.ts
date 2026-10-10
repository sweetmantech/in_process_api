import mux from '@/lib/mux';

const getMuxAssetAspectRatio = async (
  assetId: string
): Promise<string | null> => {
  try {
    const asset = await mux.video.assets.retrieve(assetId);
    return asset.aspect_ratio ?? null;
  } catch (error: any) {
    console.error('getMuxAssetAspectRatio error:', error?.message ?? error);
    return null;
  }
};

export default getMuxAssetAspectRatio;

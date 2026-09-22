import { sleep } from 'workflow';
import { start } from 'workflow/api';
import { Address } from 'viem';
import fetchMetadataStep from './steps/fetchMetadataStep';
import fetchCarouselContentStep from './steps/fetchCarouselContentStep';
import downloadAndUploadStep from './steps/downloadAndUploadStep';
import uploadMigratedMetadataStep from './steps/uploadMigratedMetadataStep';
import uploadMigratedCarouselStep from './steps/uploadMigratedCarouselStep';
import updateOnChainStep from './steps/updateOnChainStep';
import deleteMuxAssetStep from './steps/deleteMuxAssetStep';
import deleteSupabaseFilesStep from './steps/deleteSupabaseFilesStep';
import getOnChainUriStep from './steps/getOnChainUriStep';
import waitMuxMp4ReadyStep from './steps/waitMuxMp4ReadyStep';
import getMigrationTargets from '@/lib/arweave/getMigrationTargets';
import buildUrlMapFromResults from '@/lib/arweave/buildUrlMapFromResults';
import { INSTAGRAM_CAROUSEL_MIME } from '@/types/carousel';

export interface MigrateAssetToArweavePayload {
  artistAddress: Address;
  moment: { collectionAddress: Address; tokenId: string; chainId: number };
  uri: string;
}

async function migrateAssetToArweave(p: MigrateAssetToArweavePayload) {
  'use workflow';

  const { moment, artistAddress, uri } = p;
  const metadata = await fetchMetadataStep(uri);

  const isCarousel = metadata.content?.mime === INSTAGRAM_CAROUSEL_MIME;
  const carouselItems =
    isCarousel && metadata.content?.uri
      ? await fetchCarouselContentStep(metadata.content.uri)
      : undefined;

  const { downloadCandidates, hlsAnimationUrl, hasTargets } = getMigrationTargets(
    metadata,
    carouselItems
  );

  if (!hasTargets) {
    return { success: true, skipped: true, tokenId: moment.tokenId };
  }

  if (hlsAnimationUrl) {
    while (1) {
      const ready = await waitMuxMp4ReadyStep(hlsAnimationUrl);
      if (ready) break;
      await sleep('20 seconds');
    }
  }

  const uniqueSourceUrls = [...new Set(downloadCandidates.map((c) => c.value))];
  const resultsBySourceUrl = new Map<string, string>();
  for (const sourceUrl of uniqueSourceUrls) {
    const r = await downloadAndUploadStep(sourceUrl, artistAddress);
    resultsBySourceUrl.set(sourceUrl, r.arweave_uri);
  }

  const urlMap = buildUrlMapFromResults(
    downloadCandidates,
    resultsBySourceUrl,
    hlsAnimationUrl
  );

  const carouselUri =
    isCarousel && carouselItems
      ? await uploadMigratedCarouselStep(carouselItems, urlMap)
      : undefined;

  const metadataUri = await uploadMigratedMetadataStep(
    metadata,
    urlMap,
    carouselUri
  );

  const supabaseUrls = [
    ...new Set([
      uri,
      ...(isCarousel && metadata.content?.uri ? [metadata.content.uri] : []),
      ...downloadCandidates.map((c) => c.value),
    ]),
  ];

  await sleep(hlsAnimationUrl ? '10 minutes' : '5 minutes');

  const onChainUri = await getOnChainUriStep(moment);

  if (onChainUri === uri) {
    await updateOnChainStep({
      moment,
      metadataUri,
      metadataName: metadata.name,
      artistAddress,
    });
  }

  if (hlsAnimationUrl) await deleteMuxAssetStep(hlsAnimationUrl);
  await deleteSupabaseFilesStep(supabaseUrls);

  if (onChainUri !== uri) {
    return { success: true, superseded: true, tokenId: moment.tokenId };
  }

  return { success: true, tokenId: moment.tokenId, metadataUri };
}

export default (payload: MigrateAssetToArweavePayload): void => {
  start(migrateAssetToArweave, [payload]).catch((e) =>
    console.error('migrateAssetToArweave workflow start failed', e)
  );
};

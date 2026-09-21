import { uploadJson } from '@/lib/arweave/uploadJson';
import { TokenMetadataJson } from '@/lib/protocolSdk/ipfs/types';

export default async function uploadMigratedMetadataStep(
  metadata: TokenMetadataJson,
  urlMap: Map<string, string>,
  // Carousel moments rebuild content.uri from their migrated slides
  // (uploadMigratedCarouselStep) instead of a single urlMap entry.
  contentUriOverride?: string
): Promise<string> {
  'use step';
  const updated: TokenMetadataJson = { ...metadata };
  if (urlMap.has('image')) updated.image = urlMap.get('image');
  if (urlMap.has('animation_url'))
    updated.animation_url = urlMap.get('animation_url');
  const newContentUri = contentUriOverride ?? urlMap.get('content.uri');
  if (newContentUri && updated.content)
    updated.content = { ...updated.content, uri: newContentUri };

  const result = await uploadJson(updated);
  return result.arweave_uri;
}

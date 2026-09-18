import selectMuxReferencedMetadata from '@/lib/supabase/in_process_metadata/selectMuxReferencedMetadata';
import addPlaybackIds from './addPlaybackIds';

/**
 * Playback IDs still referenced by indexed moment metadata that hasn't been
 * migrated to Arweave yet (animation_url/content.uri still point at Mux).
 * cleanTemporaryAssets must never delete these — migrateAssetToArweave owns
 * deleting them, once it has safely copied the asset off Mux.
 */
const getReferencedMuxPlaybackIds = async (): Promise<Set<string>> => {
  const ids = new Set<string>();
  const { data, error } = await selectMuxReferencedMetadata();
  if (error || !data) return ids;

  for (const row of data) {
    addPlaybackIds(row.animation_url, ids);
    addPlaybackIds((row.content as { uri?: string } | null)?.uri, ids);
  }

  return ids;
};

export default getReferencedMuxPlaybackIds;

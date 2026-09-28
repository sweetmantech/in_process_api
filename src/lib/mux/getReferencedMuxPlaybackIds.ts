import selectMuxReferencedMetadata from '@/lib/supabase/in_process_metadata/selectMuxReferencedMetadata';
import selectMuxPlaybackIds from '@/lib/supabase/in_process_video_playback/selectMuxPlaybackIds';
import addPlaybackIds from './addPlaybackIds';

/**
 * Playback IDs cleanTemporaryAssets must never delete:
 * - still referenced by indexed moment metadata that hasn't been migrated to
 *   Arweave yet (animation_url/content.uri still point at Mux) —
 *   migrateAssetToArweave records those as playback once migrated;
 * - recorded in in_process_video_playback as a moment's streaming copy.
 */
const getReferencedMuxPlaybackIds = async (): Promise<Set<string>> => {
  const ids = new Set<string>();
  // Deleting a kept asset can't be undone, so fail closed: if either source
  // can't be read, throw and let the caller skip cleanup entirely.
  const [metadata, playbackIds] = await Promise.all([
    selectMuxReferencedMetadata(),
    selectMuxPlaybackIds(),
  ]);
  if (metadata.error) throw metadata.error;

  for (const row of metadata.data ?? []) {
    addPlaybackIds(row.animation_url, ids);
    addPlaybackIds((row.content as { uri?: string } | null)?.uri, ids);
  }
  for (const id of playbackIds) ids.add(id);

  return ids;
};

export default getReferencedMuxPlaybackIds;

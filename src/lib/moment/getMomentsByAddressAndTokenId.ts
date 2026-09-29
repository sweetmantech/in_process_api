import { Moment } from '@/types/moment';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import selectMoments, {
  SelectedMoment,
} from '@/lib/supabase/in_process_moments/selectMoments';

/**
 * Looks up moments by (collection address, token id).
 *
 * Collection ids are resolved first so the moments query uses the
 * (collection, token_id) unique index. Filtering on the embedded
 * collection.address instead made Postgres walk in_process_moments by
 * created_at, reading most of the table for older moments.
 */
const getMomentsByAddressAndTokenId = async ({
  moments,
  chainId,
  limit,
  includeMetadata,
}: {
  moments: Moment[];
  chainId?: number;
  limit?: number;
  includeMetadata?: boolean;
}): Promise<{
  data: SelectedMoment[] | null;
  error: { message: string } | null;
}> => {
  if (!moments.length) return { data: [], error: null };

  const addresses = [
    ...new Set(moments.map((m) => m.collectionAddress.toLowerCase())),
  ];
  let collections;
  try {
    collections = await selectCollections({ addresses, chainId });
  } catch (error) {
    return { data: null, error: error as { message: string } };
  }
  if (!collections.length) return { data: [], error: null };

  return selectMoments({
    collectionIds: collections.map((c) => c.id),
    tokenIds: moments.map((m) => Number(m.tokenId)),
    chainId,
    limit,
    includeMetadata,
  });
};

export default getMomentsByAddressAndTokenId;

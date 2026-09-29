import { Moment } from '@/types/moment';
import selectCollectionIdsByAddresses from '@/lib/supabase/in_process_collections/selectCollectionIdsByAddresses';
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
const findMoments = async ({
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
  const { data: collections, error } = await selectCollectionIdsByAddresses(
    addresses,
    chainId
  );
  if (error) return { data: null, error };
  if (!collections?.length) return { data: [], error: null };

  return selectMoments({
    collectionIds: collections.map((c) => c.id),
    tokenIds: moments.map((m) => Number(m.tokenId)),
    chainId,
    limit,
    includeMetadata,
  });
};

export default findMoments;

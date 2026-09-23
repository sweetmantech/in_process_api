import type { Address } from 'viem';
import selectMoments from '@/lib/supabase/in_process_moments/selectMoments';
import type { Transfers_t } from '@/types/envio';

/** The moment's metadata name, or a "moment #<tokenId>" fallback when it has none. */
const getMomentTitleForTransfer = async (t: Transfers_t): Promise<string> => {
  const { data } = await selectMoments({
    moments: [
      {
        collectionAddress: t.collection.toLowerCase() as Address,
        tokenId: t.token_id,
        chainId: t.chain_id,
      },
    ],
    includeMetadata: true,
    limit: 1,
  });

  return data?.[0]?.metadata?.name?.trim() || `moment #${t.token_id}`;
};

export default getMomentTitleForTransfer;

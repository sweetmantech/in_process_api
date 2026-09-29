import { supabase } from '../client';

/** Collection ids for the given addresses (uses the (address, chain_id) unique index). */
const selectCollectionIdsByAddresses = async (
  addresses: string[],
  chainId?: number
) => {
  let query = supabase
    .from('in_process_collections')
    .select('id')
    .in('address', addresses);
  if (chainId) query = query.eq('chain_id', chainId);
  return query;
};

export default selectCollectionIdsByAddresses;

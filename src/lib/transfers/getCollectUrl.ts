import { SHORT_CHAIN_NAME, SITE_ORIGINAL_URL } from '@/lib/consts';
import type { Transfers_t } from '@/types/envio';

const getCollectUrl = (t: Transfers_t) =>
  `${SITE_ORIGINAL_URL}/collect/${SHORT_CHAIN_NAME[t.chain_id] ?? 'base'}:${t.collection.toLowerCase()}/${t.token_id}`;

export default getCollectUrl;

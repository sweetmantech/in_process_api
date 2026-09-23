import truncateAddress from '@/lib/truncateAddress';
import type { Transfers_t } from '@/types/envio';

/**
 * "#20 · 0x58dff4…499ccc · chain 8453" — a human-labeled breakdown of the
 * token, instead of Envio's opaque underscore-joined composite `t.id`
 * (`{collection}_{tokenId}_{chainId}_{txHash}_{logIndex}`).
 */
const formatTokenReference = (t: Transfers_t) =>
  `#${t.token_id} · ${truncateAddress(t.collection)} · chain ${t.chain_id}`;

export default formatTokenReference;

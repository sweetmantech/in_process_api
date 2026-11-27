import lookupArtistEmail from '@/lib/emails/lookupArtistEmail';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import type { Transfers_t } from '@/types/envio';
import type { Moment } from '@/types/moment';
import getAirdropOperator from './getAirdropOperator';
import isSameArtist from './isSameArtist';
import sendAirdropEmailForTransfer from './sendAirdropEmailForTransfer';

export async function notifyAirdropByEmail(
  batch: Transfers_t[]
): Promise<void> {
  const airdropTransfers = batch.filter((t) => !(t.value && t.currency));
  if (airdropTransfers.length === 0) return;

  const moments: Moment[] = [
    ...new Map(
      airdropTransfers.map((t) => [
        `${t.collection.toLowerCase()}:${t.chain_id}:${t.token_id}`,
        {
          collectionAddress:
            t.collection.toLowerCase() as Moment['collectionAddress'],
          tokenId: t.token_id,
          chainId: t.chain_id,
        },
      ])
    ).values(),
  ];

  const { data: selectedMoments, error } = await getMomentsByAddressAndTokenId({
    moments,
    includeMetadata: true,
  });
  if (error) throw error;

  const momentByKey = new Map<string, any>(
    (selectedMoments ?? []).map((m) => [
      `${m.collection.address.toLowerCase()}:${m.collection.chain_id}:${m.token_id}`,
      m,
    ])
  );

  const recipientEmailCache = new Map<string, string | null>();

  for (const transfer of airdropTransfers) {
    const recipient = transfer.recipient.toLowerCase();
    try {
      const operator = await getAirdropOperator(transfer);
      if (!operator?.address) continue;
      if (await isSameArtist(operator.address, recipient)) continue;

      const moment = momentByKey.get(
        `${transfer.collection.toLowerCase()}:${transfer.chain_id}:${transfer.token_id}`
      );
      if (!moment) continue;

      let email: string | null;
      if (recipientEmailCache.has(recipient)) {
        email = recipientEmailCache.get(recipient) ?? null;
      } else {
        email = await lookupArtistEmail(recipient);
        recipientEmailCache.set(recipient, email);
      }
      if (!email) continue;

      await sendAirdropEmailForTransfer({
        to: email,
        senderAddress: operator.address,
        senderUsername: operator.username,
        moment,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `❌ notifyAirdropByEmail failed (recipient ${recipient}, transfer ${transfer.id}):`,
        msg
      );
    }
  }
}

export default notifyAirdropByEmail;

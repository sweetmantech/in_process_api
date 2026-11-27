import { SITE_ORIGINAL_URL, SHORT_CHAIN_NAME } from '@/lib/consts';
import buildAirdropNotificationHtml from '@/lib/emails/buildAirdropNotificationHtml';
import buildImageProxyUrl from '@/lib/media/buildImageProxyUrl';
import sendResendEmail from '@/lib/resend/sendResendEmail';

type MomentForAirdropEmail = {
  token_id: number;
  collection: {
    address: string;
    chain_id: number;
  };
  metadata: {
    name: string | null;
    image: string | null;
  };
};

export default async function sendAirdropEmailForTransfer({
  to,
  senderAddress,
  senderUsername,
  moment,
}: {
  to: string;
  senderAddress: string;
  senderUsername: string | null;
  moment: MomentForAirdropEmail;
}): Promise<void> {
  const normalizedSenderAddress = senderAddress.toLowerCase();
  const momentName = moment.metadata?.name?.trim() || null;
  const chain = SHORT_CHAIN_NAME[moment.collection.chain_id] ?? 'base';
  const collectUrl = `${SITE_ORIGINAL_URL}/collect/${chain}:${moment.collection.address.toLowerCase()}/${moment.token_id}`;
  const senderUrl = `${SITE_ORIGINAL_URL}/${normalizedSenderAddress}`;
  const imageUrl = moment.metadata?.image
    ? buildImageProxyUrl(moment.metadata.image)
    : null;

  const subject = 'In Process notification: you received an airdrop';
  const textSender = senderUsername ?? normalizedSenderAddress;
  const html = buildAirdropNotificationHtml({
    textSender,
    senderUrl,
    momentName,
    collectUrl,
    imageUrl,
  });

  try {
    await sendResendEmail({
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error('[resend] airdrop email send failed:', e);
  }
}

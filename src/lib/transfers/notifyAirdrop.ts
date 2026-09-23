import type { Transfers_t } from '@/types/envio';
import selectAccountNotification from '@/lib/supabase/account_notifications/selectAccountNotification';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import { telegramChatBotClient } from '@/lib/telegram/client';
import { postWatchDogMessage } from '@/lib/telegram/postWatchDogMessage';
import resolveLinkedWalletAddresses from '@/lib/wallets/resolveLinkedWalletAddresses';
import formatWalletIdentity from '@/lib/wallets/formatWalletIdentity';
import getExplorerTxUrl from '@/lib/viem/getExplorerTxUrl';
import formatReadableUtcDate from '@/lib/formatReadableUtcDate';
import getAirdropOperator from './getAirdropOperator';
import isSameArtist from './isSameArtist';
import getCollectUrl from './getCollectUrl';
import getMomentTitleForTransfer from './getMomentTitleForTransfer';

const watchDog = (text: string) =>
  postWatchDogMessage(process.env.TELEGRAM_WATCH_DOG_CHAT_ID!, text);

/**
 * One Telegram per airdrop transfer in `batch` (`value` and `currency` not
 * both set). Every outcome (sent / skipped / failed) is also reported to the
 * watch-dog group so who-airdropped-what-to-whom-and-when is visible even
 * when the recipient never gets their Telegram notification.
 */
const notifyAirdrop = async (batch: Transfers_t[]): Promise<void> => {
  for (const t of batch) {
    if (t.value && t.currency) continue;
    const recipient = t.recipient.toLowerCase();
    const when = formatReadableUtcDate(t.transferred_at);
    try {
      const wallets = await resolveLinkedWalletAddresses(recipient);
      if (!wallets.length) continue;

      const [{ data: recipientWallets }, momentTitle, { address, username }] =
        await Promise.all([
          selectWallets({ addresses: [recipient] }),
          getMomentTitleForTransfer(t),
          getAirdropOperator(t),
        ]);
      const recipientLabel = formatWalletIdentity(
        recipient,
        recipientWallets?.[0]?.artist?.username
      );
      const senderLabel =
        address || username
          ? formatWalletIdentity(address, username)
          : '⚠️ unknown sender';
      const headline = `${senderLabel} airdropped "${momentTitle}" to ${recipientLabel}`;

      if (!address && !username) {
        await watchDog(
          `🚨 AIRDROP NOTIFY FAILED — operator not found\n\n` +
            `${headline}\n\n` +
            `when     : ${when}\n` +
            `transfer : ${t.id}\n` +
            `tx       : ${getExplorerTxUrl(t.chain_id, t.transaction_hash)}\n` +
            `note     : possible smart wallet ↔ artist link gap`
        );
        continue;
      }

      const data = await selectAccountNotification({ wallets });
      if (!data?.notify_enabled) {
        await watchDog(
          `ℹ️ AIRDROP NOTIFY SKIPPED — notifications off\n\n` +
            `${headline}\n\n` +
            `when     : ${when}\n` +
            `transfer : ${t.id}\n` +
            `tx       : ${getExplorerTxUrl(t.chain_id, t.transaction_hash)}`
        );
        continue;
      }

      if (await isSameArtist(address, recipient)) continue;
      const text = `${username || address} airdropped a moment to you. \n\n${getCollectUrl(t)}`;

      await telegramChatBotClient.sendMessage(data.telegram_chat_id, text);
      await watchDog(
        `✅ AIRDROP NOTIFY SENT\n\n` +
          `${headline}\n\n` +
          `when     : ${when}\n` +
          `transfer : ${t.id}\n` +
          `link     : ${getCollectUrl(t)}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `❌ notifyAirdrop failed (recipient ${recipient}, transfer ${t.id}):`,
        msg
      );
      await watchDog(
        `🚨 AIRDROP NOTIFY EXCEPTION\n\n` +
          `recipient : ${formatWalletIdentity(recipient)}\n\n` +
          `when     : ${when}\n` +
          `transfer : ${t.id}\n` +
          `error    : ${msg}`
      );
    }
  }
};

export default notifyAirdrop;

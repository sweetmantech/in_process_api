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

const watchDog = (text: string) =>
  postWatchDogMessage(process.env.TELEGRAM_WATCH_DOG_CHAT_ID!, text);

/** One Telegram per airdrop transfer in `batch` (`value` and `currency` not both set). */
const notifyAirdrop = async (batch: Transfers_t[]): Promise<void> => {
  for (const t of batch) {
    if (t.value && t.currency) continue;
    const recipient = t.recipient.toLowerCase();
    const date = formatReadableUtcDate(t.transferred_at);
    try {
      const wallets = await resolveLinkedWalletAddresses(recipient);
      if (!wallets.length) continue;

      const { data: recipientWallets } = await selectWallets({
        addresses: [recipient],
      });
      const recipientLabel = formatWalletIdentity(
        recipient,
        recipientWallets?.[0]?.artist?.username
      );

      const data = await selectAccountNotification({ wallets });
      if (!data?.notify_enabled) {
        await watchDog(
          `ℹ️ AIRDROP NOTIFY SKIPPED — notifications off\n\n` +
            `recipient : ${recipientLabel}\n` +
            `transfer  : ${t.id}\n` +
            `tx        : ${getExplorerTxUrl(t.chain_id, t.transaction_hash)}\n\n` +
            `date      : ${date}`
        );
        continue;
      }

      const { address, username } = await getAirdropOperator(t);

      if (!address && !username) {
        await watchDog(
          `🚨 AIRDROP NOTIFY FAILED — operator not found\n\n` +
            `recipient : ${recipientLabel}\n` +
            `transfer  : ${t.id}\n` +
            `tx        : ${getExplorerTxUrl(t.chain_id, t.transaction_hash)}\n` +
            `note      : possible smart wallet ↔ artist link gap\n\n` +
            `date      : ${date}`
        );
        continue;
      }
      if (await isSameArtist(address, recipient)) continue;
      const text = `${username || address} airdropped a moment to you. \n\n${getCollectUrl(t)}`;

      await telegramChatBotClient.sendMessage(data.telegram_chat_id, text);
      await watchDog(
        `✅ AIRDROP NOTIFY SENT\n\n` +
          `${formatWalletIdentity(address, username)} → ${recipientLabel}\n` +
          `transfer : ${t.id}\n` +
          `link     : ${getCollectUrl(t)}\n\n` +
          `date     : ${date}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `❌ notifyAirdrop failed (recipient ${recipient}, transfer ${t.id}):`,
        msg
      );
      await watchDog(
        `🚨 AIRDROP NOTIFY EXCEPTION\n\n` +
          `recipient : ${formatWalletIdentity(recipient)}\n` +
          `transfer  : ${t.id}\n` +
          `error     : ${msg}\n\n` +
          `date      : ${date}`
      );
    }
  }
};

export default notifyAirdrop;

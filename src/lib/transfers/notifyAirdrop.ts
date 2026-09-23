import { SHORT_CHAIN_NAME, SITE_ORIGINAL_URL } from '@/lib/consts';
import selectAccountNotification from '@/lib/supabase/account_notifications/selectAccountNotification';
import type { Transfers_t } from '@/types/envio';
import { telegramChatBotClient } from '@/lib/telegram/client';
import { postWatchDogMessage } from '@/lib/telegram/postWatchDogMessage';
import resolveLinkedWalletAddresses from '@/lib/wallets/resolveLinkedWalletAddresses';
import getAirdropOperator from './getAirdropOperator';
import isSameArtist from './isSameArtist';

const watchDog = (text: string) =>
  postWatchDogMessage(process.env.TELEGRAM_WATCH_DOG_CHAT_ID!, text);

/** One Telegram per airdrop transfer in `batch` (`value` and `currency` not both set). */
const notifyAirdrop = async (batch: Transfers_t[]): Promise<void> => {
  for (const t of batch) {
    if (t.value && t.currency) continue;
    const recipient = t.recipient.toLowerCase();
    try {
      const wallets = await resolveLinkedWalletAddresses(recipient);
      if (!wallets.length) continue;

      const data = await selectAccountNotification({ wallets });
      if (!data?.notify_enabled) {
        await watchDog(
          `ℹ️ Airdrop notify skipped — notifications off\n\nrecipient: ${recipient}\ntransfer: ${t.id} · tx: ${t.transaction_hash}`
        );
        continue;
      }

      const { address, username } = await getAirdropOperator(t);

      if (!address && !username) {
        await watchDog(
          `🚨 Airdrop notify FAILED — operator not found\n\nrecipient: ${recipient}\ntransfer: ${t.id} · tx: ${t.transaction_hash}`
        );
        continue;
      }
      if (await isSameArtist(address, recipient)) continue;
      const text = `${username || address} airdropped a moment to you. \n\n${SITE_ORIGINAL_URL}/collect/${SHORT_CHAIN_NAME[t.chain_id] ?? 'base'}:${t.collection.toLowerCase()}/${t.token_id}`;

      await telegramChatBotClient.sendMessage(data.telegram_chat_id, text);
      await watchDog(
        `✅ Airdrop notify sent\n\nfrom: ${username || address} → to: ${recipient}\ntransfer: ${t.id}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `❌ notifyAirdrop failed (recipient ${recipient}, transfer ${t.id}):`,
        msg
      );
      await watchDog(
        `🚨 Airdrop notify EXCEPTION\n\nrecipient: ${recipient}\ntransfer: ${t.id}\nerror: ${msg}`
      );
    }
  }
};

export default notifyAirdrop;

import { SHORT_CHAIN_NAME, SITE_ORIGINAL_URL } from '@/lib/consts';
import selectAccountNotification from '@/lib/supabase/account_notifications/selectAccountNotification';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import type { Transfers_t } from '@/types/envio';
import { telegramChatBotClient } from '@/lib/telegram/client';
import { postWatchDogMessage } from '@/lib/telegram/postWatchDogMessage';
import resolveLinkedWalletAddresses from '@/lib/wallets/resolveLinkedWalletAddresses';
import getAirdropOperator from './getAirdropOperator';
import isSameArtist from './isSameArtist';

const watchDog = (text: string) =>
  postWatchDogMessage(process.env.TELEGRAM_WATCH_DOG_CHAT_ID!, text);

const shortenAddress = (address: string) =>
  `${address.slice(0, 10)}...${address.slice(-6)}`;

/** "username (0x1234...abcd)", or just the shortened address when no artist is linked. */
const formatIdentity = (address: string, username?: string | null) =>
  username ? `${username} (${shortenAddress(address)})` : shortenAddress(address);

const explorerTxUrl = (chainId: number, transactionHash: string) =>
  `${chainId === 84532 ? 'https://sepolia.basescan.org' : 'https://basescan.org'}/tx/${transactionHash}`;

const formatDate = (transferredAt: number) =>
  new Date(transferredAt * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, ' UTC');

const collectUrl = (t: Transfers_t) =>
  `${SITE_ORIGINAL_URL}/collect/${SHORT_CHAIN_NAME[t.chain_id] ?? 'base'}:${t.collection.toLowerCase()}/${t.token_id}`;

/** One Telegram per airdrop transfer in `batch` (`value` and `currency` not both set). */
const notifyAirdrop = async (batch: Transfers_t[]): Promise<void> => {
  for (const t of batch) {
    if (t.value && t.currency) continue;
    const recipient = t.recipient.toLowerCase();
    const date = formatDate(t.transferred_at);
    try {
      const wallets = await resolveLinkedWalletAddresses(recipient);
      if (!wallets.length) continue;

      const { data: recipientWallets } = await selectWallets({
        addresses: [recipient],
      });
      const recipientLabel = formatIdentity(
        recipient,
        recipientWallets?.[0]?.artist?.username
      );

      const data = await selectAccountNotification({ wallets });
      if (!data?.notify_enabled) {
        await watchDog(
          `ℹ️ AIRDROP NOTIFY SKIPPED — notifications off\n\n` +
            `recipient : ${recipientLabel}\n` +
            `transfer  : ${t.id}\n` +
            `tx        : ${explorerTxUrl(t.chain_id, t.transaction_hash)}\n\n` +
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
            `tx        : ${explorerTxUrl(t.chain_id, t.transaction_hash)}\n` +
            `note      : possible smart wallet ↔ artist link gap\n\n` +
            `date      : ${date}`
        );
        continue;
      }
      if (await isSameArtist(address, recipient)) continue;
      const text = `${username || address} airdropped a moment to you. \n\n${collectUrl(t)}`;

      await telegramChatBotClient.sendMessage(data.telegram_chat_id, text);
      await watchDog(
        `✅ AIRDROP NOTIFY SENT\n\n` +
          `${formatIdentity(address, username)} → ${recipientLabel}\n` +
          `transfer : ${t.id}\n` +
          `link     : ${collectUrl(t)}\n\n` +
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
          `recipient : ${shortenAddress(recipient)}\n` +
          `transfer  : ${t.id}\n` +
          `error     : ${msg}\n\n` +
          `date      : ${date}`
      );
    }
  }
};

export default notifyAirdrop;

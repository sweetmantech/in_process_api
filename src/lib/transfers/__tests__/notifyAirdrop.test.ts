import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Transfers_t } from '@/types/envio';

vi.mock(
  '@/lib/supabase/account_notifications/selectAccountNotification',
  () => ({
    default: vi.fn(),
  })
);
vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/telegram/client', () => ({
  telegramChatBotClient: { sendMessage: vi.fn() },
}));
vi.mock('@/lib/telegram/postWatchDogMessage', () => ({
  postWatchDogMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../getAirdropOperator', () => ({ default: vi.fn() }));
vi.mock('../isSameArtist', () => ({ default: vi.fn() }));
vi.mock('@/lib/consts', () => ({
  SHORT_CHAIN_NAME: { 8453: 'base' },
  SITE_ORIGINAL_URL: 'https://inprocess.world',
}));

import selectAccountNotification from '@/lib/supabase/account_notifications/selectAccountNotification';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import { telegramChatBotClient } from '@/lib/telegram/client';
import { postWatchDogMessage } from '@/lib/telegram/postWatchDogMessage';
import getAirdropOperator from '../getAirdropOperator';
import isSameArtist from '../isSameArtist';
import notifyAirdrop from '../notifyAirdrop';

const WATCH_DOG_CHAT_ID = '-5577113678';
process.env.TELEGRAM_WATCH_DOG_CHAT_ID = WATCH_DOG_CHAT_ID;

const RECIPIENT = '0xrecipient0000000000000000000000000000000';
const EXTERNAL = '0xexternal00000000000000000000000000000000';
const SENDER = '0xsender00000000000000000000000000000000000';
const ARTIST_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CHAT_ID = '1352384640';

const makeTransfer = (overrides: Partial<Transfers_t> = {}): Transfers_t =>
  ({
    id: 'transfer-1',
    recipient: RECIPIENT,
    collection: '0xcollection',
    token_id: 1,
    chain_id: 8453,
    value: null,
    currency: null,
    transaction_hash: '0xtxhash',
    transferred_at: 1757352201, // 2025-09-08T17:23:21Z
    ...overrides,
  }) as Transfers_t;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(selectWallets)
    .mockResolvedValueOnce({
      data: [{ address: RECIPIENT, artist_id: ARTIST_ID }],
    } as never)
    .mockResolvedValueOnce({
      data: [
        { address: RECIPIENT, artist_id: ARTIST_ID },
        { address: EXTERNAL, artist_id: ARTIST_ID },
      ],
    } as never)
    .mockResolvedValue({
      data: [
        {
          address: RECIPIENT,
          artist_id: ARTIST_ID,
          artist: { username: 'cxy' },
        },
      ],
    } as never);
  vi.mocked(selectAccountNotification).mockResolvedValue({
    telegram_chat_id: CHAT_ID,
    notify_enabled: true,
  } as any);
  vi.mocked(getAirdropOperator).mockResolvedValue({
    address: SENDER,
    username: 'alice',
  });
  vi.mocked(isSameArtist).mockResolvedValue(false);
  vi.mocked(telegramChatBotClient.sendMessage).mockResolvedValue(
    undefined as never
  );
});

describe('notifyAirdrop', () => {
  it('skips transfers where both value and currency are set', async () => {
    await notifyAirdrop([makeTransfer({ value: '100', currency: '0xusdc' })]);
    expect(selectWallets).not.toHaveBeenCalled();
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).not.toHaveBeenCalled();
  });

  it('skips notification when recipient wallet is unknown', async () => {
    vi.mocked(selectWallets).mockReset();
    vi.mocked(selectWallets).mockResolvedValue({ data: [] } as never);

    await notifyAirdrop([makeTransfer()]);

    expect(selectAccountNotification).not.toHaveBeenCalled();
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).not.toHaveBeenCalled();
  });

  it('watch-dogs and skips notification when artist has no notification settings', async () => {
    vi.mocked(selectAccountNotification).mockResolvedValue(null);
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).toHaveBeenCalledWith(
      WATCH_DOG_CHAT_ID,
      expect.stringContaining('notifications off')
    );
  });

  it('watch-dogs and skips notification when notify is disabled', async () => {
    vi.mocked(selectAccountNotification).mockResolvedValue({
      telegram_chat_id: CHAT_ID,
      notify_enabled: false,
    } as any);
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).toHaveBeenCalledWith(
      WATCH_DOG_CHAT_ID,
      expect.stringContaining('notifications off')
    );
  });

  it('watch-dogs and skips notification when the operator cannot be identified', async () => {
    vi.mocked(getAirdropOperator).mockResolvedValue({
      address: '',
      username: null,
    });
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).toHaveBeenCalledWith(
      WATCH_DOG_CHAT_ID,
      expect.stringContaining('operator not found')
    );
  });

  it('watch-dogs the exception when a step throws', async () => {
    vi.mocked(getAirdropOperator).mockRejectedValue(new Error('rpc down'));
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).toHaveBeenCalledWith(
      WATCH_DOG_CHAT_ID,
      expect.stringContaining('rpc down')
    );
  });

  it('looks up notifications across all wallets of the recipient artist', async () => {
    await notifyAirdrop([makeTransfer()]);

    expect(selectWallets).toHaveBeenNthCalledWith(1, {
      addresses: [RECIPIENT],
    });
    expect(selectWallets).toHaveBeenNthCalledWith(2, {
      artistIds: [ARTIST_ID],
    });
    expect(selectAccountNotification).toHaveBeenCalledWith({
      wallets: [RECIPIENT, EXTERNAL],
    });
  });

  it('skips notification when operator and recipient are the same artist', async () => {
    vi.mocked(isSameArtist).mockResolvedValue(true);
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).not.toHaveBeenCalled();
  });

  it('sends telegram notification with airdrop details and watch-dogs the success', async () => {
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining('airdropped a moment')
    );
    expect(postWatchDogMessage).toHaveBeenCalledWith(
      WATCH_DOG_CHAT_ID,
      expect.stringContaining('AIRDROP NOTIFY SENT')
    );
  });

  it('uses username in message when available', async () => {
    await notifyAirdrop([makeTransfer()]);
    const message = vi.mocked(telegramChatBotClient.sendMessage).mock
      .calls[0][1];
    expect(message).toContain('alice');
  });

  it('labels the recipient with their artist username in watch-dog messages', async () => {
    await notifyAirdrop([makeTransfer()]);
    const watchDogText = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    const shortRecipient = `${RECIPIENT.slice(0, 10)}...${RECIPIENT.slice(-6)}`;
    expect(watchDogText).toContain(`cxy (${shortRecipient})`);
  });

  it('includes a human-readable date at the bottom of every watch-dog message', async () => {
    await notifyAirdrop([makeTransfer()]);
    const watchDogText = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    expect(watchDogText).toContain('date     : 2025-09-08 17:23:21 UTC');
  });
});

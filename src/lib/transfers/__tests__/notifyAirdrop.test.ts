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
vi.mock('../getMomentTitleForTransfer', () => ({ default: vi.fn() }));
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
import getMomentTitleForTransfer from '../getMomentTitleForTransfer';
import notifyAirdrop from '../notifyAirdrop';

const WATCH_DOG_CHAT_ID = '-5577113678';
process.env.TELEGRAM_WATCH_DOG_CHAT_ID = WATCH_DOG_CHAT_ID;

const RECIPIENT = '0xrecipient0000000000000000000000000000000';
const EXTERNAL = '0xexternal00000000000000000000000000000000';
const SENDER = '0xsender00000000000000000000000000000000000';
const ARTIST_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CHAT_ID = '1352384640';
const MOMENT_TITLE = 'Telegram Demo with CY';

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
  vi.mocked(getMomentTitleForTransfer).mockResolvedValue(MOMENT_TITLE);
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

    expect(getAirdropOperator).not.toHaveBeenCalled();
    expect(selectAccountNotification).not.toHaveBeenCalled();
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).not.toHaveBeenCalled();
  });

  it('skips silently when the transfer is not a mint (e.g. secondary sale)', async () => {
    vi.mocked(getAirdropOperator).mockResolvedValue(null);

    await notifyAirdrop([makeTransfer()]);

    expect(selectAccountNotification).not.toHaveBeenCalled();
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).not.toHaveBeenCalled();
  });

  it('watch-dogs and skips notification when the operator cannot be identified, before checking notify settings', async () => {
    vi.mocked(getAirdropOperator).mockResolvedValue({
      address: '',
      username: null,
    });
    await notifyAirdrop([makeTransfer()]);
    expect(selectAccountNotification).not.toHaveBeenCalled();
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).toHaveBeenCalledWith(
      WATCH_DOG_CHAT_ID,
      expect.stringContaining('operator not found')
    );
    const text = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    expect(text).toContain('⚠️ unknown sender');
    expect(text).toContain(`"${MOMENT_TITLE}"`);
  });

  it('watch-dogs and skips notification, distinguishing "never linked Telegram" from "notifications off"', async () => {
    vi.mocked(selectAccountNotification).mockResolvedValue(null);
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    const text = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    expect(text).toContain('recipient never linked Telegram');
    expect(text).not.toContain('notifications off');
  });

  it('watch-dogs and skips notification when notify is disabled', async () => {
    vi.mocked(selectAccountNotification).mockResolvedValue({
      telegram_chat_id: CHAT_ID,
      notify_enabled: false,
    } as any);
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    const text = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    expect(text).toContain('notifications off');
    expect(text).not.toContain('never linked Telegram');
    expect(text).toContain(
      `alice (0xsend…0000) airdropped "${MOMENT_TITLE}" to cxy (0xreci…0000)`
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

  it('does not watch-dog a self-airdrop even when the artist has no notification settings (regression: self-check must run before the notify_enabled check)', async () => {
    vi.mocked(isSameArtist).mockResolvedValue(true);
    vi.mocked(selectAccountNotification).mockResolvedValue(null);
    await notifyAirdrop([makeTransfer()]);
    expect(selectAccountNotification).not.toHaveBeenCalled();
    expect(telegramChatBotClient.sendMessage).not.toHaveBeenCalled();
    expect(postWatchDogMessage).not.toHaveBeenCalled();
  });

  it('sends telegram notification with airdrop details and watch-dogs the success with full direction', async () => {
    await notifyAirdrop([makeTransfer()]);
    expect(telegramChatBotClient.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining('airdropped a moment')
    );
    const text = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    expect(text).toContain('AIRDROP NOTIFY SENT');
    expect(text).toContain(
      `alice (0xsend…0000) airdropped "${MOMENT_TITLE}" to cxy (0xreci…0000)`
    );
  });

  it('uses username in message when available', async () => {
    await notifyAirdrop([makeTransfer()]);
    const message = vi.mocked(telegramChatBotClient.sendMessage).mock
      .calls[0][1];
    expect(message).toContain('alice');
  });

  it('includes a human-readable date at the bottom of every watch-dog message', async () => {
    await notifyAirdrop([makeTransfer()]);
    const watchDogText = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    expect(watchDogText).toContain('when     : 2025-09-08 17:23:21 UTC');
  });

  it('labels the token/collection/chain instead of printing the raw composite transfer id', async () => {
    await notifyAirdrop([makeTransfer()]);
    const watchDogText = vi.mocked(postWatchDogMessage).mock.calls[0][1];
    expect(watchDogText).toContain('token    : #1 · 0xcoll…tion · chain 8453');
    expect(watchDogText).not.toContain('transfer-1');
  });
});

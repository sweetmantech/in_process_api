import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Transfers_t } from '@/types/envio';

vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/emails/lookupArtistEmail', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/resend/client', () => ({
  getResendClient: vi.fn(),
}));

vi.mock('@/lib/resend/validateResendEnv', () => ({
  validateResendEnv: vi.fn(),
}));

vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/consts', () => ({
  SHORT_CHAIN_NAME: { 8453: 'base' },
  SITE_ORIGINAL_URL: 'https://inprocess.world',
}));

import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import lookupArtistEmail from '@/lib/emails/lookupArtistEmail';
import { getResendClient } from '@/lib/resend/client';
import { validateResendEnv } from '@/lib/resend/validateResendEnv';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import notifyCollectByEmail from '../notifyCollectByEmail';

const RESEND_FROM_EMAIL = 'from@example.com';
const CREATOR_EMAIL = 'creator@example.com';
const COLLECTOR_ADDRESS = '0xcollector000000000000000000000000000000';
const CREATOR_ADDRESS = '0xcreator0000000000000000000000000000000';

const makeTransfer = (overrides: Partial<Transfers_t> = {}): Transfers_t =>
  ({
    id: 'transfer-1',
    collection: '0xcol',
    token_id: '1',
    chain_id: 8453,
    recipient: COLLECTOR_ADDRESS,
    quantity: '1',
    value: null,
    currency: null,
    transaction_hash: '0xtx',
    transferred_at: 1700000000,
    ...overrides,
  }) as any;

describe('notifyCollectByEmail', () => {
  const sendMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getResendClient).mockReturnValue({
      emails: { send: sendMock },
    } as any);
    vi.mocked(validateResendEnv).mockReturnValue({
      apiKey: 'api-key',
      fromEmail: RESEND_FROM_EMAIL,
    });
    vi.mocked(lookupArtistEmail).mockResolvedValue(CREATOR_EMAIL);

    vi.mocked(selectWallets).mockResolvedValue({
      data: [
        {
          address: COLLECTOR_ADDRESS.toLowerCase(),
          artist_id: null,
          type: 'external',
          artist: { username: 'collector_alice' },
        },
      ],
    } as any);
  });

  it('skips when there are no paid (collect) transfers', async () => {
    await notifyCollectByEmail([
      makeTransfer({ value: undefined, currency: undefined }),
    ]);

    expect(getResendClient).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends a Resend email for a collect transfer', async () => {
    const momentRow = {
      token_id: 1,
      collection: {
        address: '0xcol',
        chain_id: 8453,
        creator: CREATOR_ADDRESS,
      },
      metadata: { name: 'My Moment', image: 'ar://image-hash' },
    };

    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [momentRow],
      error: null,
    } as any);

    await notifyCollectByEmail([
      makeTransfer({ value: '0', currency: '0xusdc' }),
    ]);

    expect(lookupArtistEmail).toHaveBeenCalledWith(CREATOR_ADDRESS);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const payload = sendMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      from: RESEND_FROM_EMAIL,
      to: CREATOR_EMAIL,
    });
    expect(payload.subject).toContain(
      'In Process notification: someone collected your moment'
    );
    expect(payload.html).toContain('collector_alice');
    expect(payload.html).toContain(
      'https://inprocess.world/collect/base:0xcol/1'
    );
    expect(payload.html).toContain('https://turbo-gateway.com/image-hash');
  });

  it('caches creator email lookups per creator address', async () => {
    const momentRow1 = {
      token_id: 1,
      collection: {
        address: '0xcol',
        chain_id: 8453,
        creator: CREATOR_ADDRESS,
      },
      metadata: { name: 'My Moment 1', image: null },
    };
    const momentRow2 = {
      token_id: 2,
      collection: {
        address: '0xcol',
        chain_id: 8453,
        creator: CREATOR_ADDRESS,
      },
      metadata: { name: 'My Moment 2', image: null },
    };

    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [momentRow1, momentRow2],
      error: null,
    } as any);

    await notifyCollectByEmail([
      makeTransfer({
        id: 'transfer-1',
        token_id: '1',
        value: '0',
        currency: '0xusdc',
      }),
      makeTransfer({
        id: 'transfer-2',
        token_id: '2',
        value: '0',
        currency: '0xusdc',
      }),
    ]);

    expect(lookupArtistEmail).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

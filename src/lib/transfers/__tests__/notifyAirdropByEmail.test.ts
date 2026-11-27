import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transfers_t } from '@/types/envio';

vi.mock('@/lib/emails/lookupArtistEmail', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));
vi.mock('../getAirdropOperator', () => ({ default: vi.fn() }));
vi.mock('../isSameArtist', () => ({ default: vi.fn() }));
vi.mock('../sendAirdropEmailForTransfer', () => ({ default: vi.fn() }));

import lookupArtistEmail from '@/lib/emails/lookupArtistEmail';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import getAirdropOperator from '../getAirdropOperator';
import isSameArtist from '../isSameArtist';
import sendAirdropEmailForTransfer from '../sendAirdropEmailForTransfer';
import notifyAirdropByEmail from '../notifyAirdropByEmail';

const RECIPIENT = '0xrecipient0000000000000000000000000000000';
const SENDER = '0xsender00000000000000000000000000000000000';
const EMAIL = 'recipient@example.com';

const momentRow = {
  token_id: 1,
  collection: {
    address: '0xcollection',
    chain_id: 8453,
  },
  metadata: { name: 'Dawn', image: null },
};

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
    transferred_at: 1757352201,
    ...overrides,
  }) as Transfers_t;

describe('notifyAirdropByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [momentRow],
      error: null,
    } as any);
    vi.mocked(getAirdropOperator).mockResolvedValue({
      address: SENDER,
      username: 'alice',
    });
    vi.mocked(isSameArtist).mockResolvedValue(false);
    vi.mocked(lookupArtistEmail).mockResolvedValue(EMAIL);
    vi.mocked(sendAirdropEmailForTransfer).mockResolvedValue(undefined);
  });

  it('skips paid collect transfers', async () => {
    await notifyAirdropByEmail([
      makeTransfer({ value: '100', currency: '0xusdc' }),
    ]);

    expect(getMomentsByAddressAndTokenId).not.toHaveBeenCalled();
    expect(sendAirdropEmailForTransfer).not.toHaveBeenCalled();
  });

  it('sends email for an airdrop when the recipient has a linked email', async () => {
    await notifyAirdropByEmail([makeTransfer()]);

    expect(lookupArtistEmail).toHaveBeenCalledWith(RECIPIENT);
    expect(sendAirdropEmailForTransfer).toHaveBeenCalledWith({
      to: EMAIL,
      senderAddress: SENDER,
      senderUsername: 'alice',
      moment: momentRow,
    });
  });

  it('skips when operator cannot be identified', async () => {
    vi.mocked(getAirdropOperator).mockResolvedValue(null);

    await notifyAirdropByEmail([makeTransfer()]);

    expect(lookupArtistEmail).not.toHaveBeenCalled();
    expect(sendAirdropEmailForTransfer).not.toHaveBeenCalled();
  });

  it('skips self-airdrops', async () => {
    vi.mocked(isSameArtist).mockResolvedValue(true);

    await notifyAirdropByEmail([makeTransfer()]);

    expect(lookupArtistEmail).not.toHaveBeenCalled();
    expect(sendAirdropEmailForTransfer).not.toHaveBeenCalled();
  });

  it('skips when the recipient has no linked email', async () => {
    vi.mocked(lookupArtistEmail).mockResolvedValue(null);

    await notifyAirdropByEmail([makeTransfer()]);

    expect(sendAirdropEmailForTransfer).not.toHaveBeenCalled();
  });

  it('caches recipient email lookups within the batch', async () => {
    await notifyAirdropByEmail([
      makeTransfer({ id: 'transfer-1', token_id: 1 }),
      makeTransfer({ id: 'transfer-2', token_id: 1 }),
    ]);

    expect(lookupArtistEmail).toHaveBeenCalledTimes(1);
    expect(sendAirdropEmailForTransfer).toHaveBeenCalledTimes(2);
  });

  it('logs and continues when one transfer throws', async () => {
    vi.mocked(getAirdropOperator)
      .mockRejectedValueOnce(new Error('operator boom'))
      .mockResolvedValueOnce({ address: SENDER, username: 'alice' });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await notifyAirdropByEmail([
      makeTransfer({ id: 'transfer-1' }),
      makeTransfer({ id: 'transfer-2' }),
    ]);

    expect(consoleError).toHaveBeenCalled();
    expect(sendAirdropEmailForTransfer).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

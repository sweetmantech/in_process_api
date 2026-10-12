import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import saveOperatorWallet from '../saveOperatorWallet';

vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_wallets/upsertWallets', () => ({
  default: vi.fn(),
}));

const mockSelectWallets = vi.mocked(selectWallets);
const mockUpsertWallets = vi.mocked(upsertWallets);

const EOA = '0x2222222222222222222222222222222222222222' as Address;
const OPERATOR = '0x3333333333333333333333333333333333333333' as Address;

const walletRow = (type: string | null, artistId: string | null) =>
  ({ data: [{ address: EOA, artist_id: artistId, type }] }) as never;

describe('saveOperatorWallet', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpsertWallets.mockResolvedValue([]);
  });

  it('inserts the operator row linked to the EOA and its artist without overwriting', async () => {
    mockSelectWallets.mockResolvedValue(walletRow('privy', 'artist-1'));

    await saveOperatorWallet({ eoa: EOA, operator: OPERATOR });

    expect(mockSelectWallets).toHaveBeenCalledWith({ addresses: [EOA] });
    expect(mockUpsertWallets).toHaveBeenCalledWith(
      [
        {
          address: OPERATOR,
          artist: 'artist-1',
          type: 'operator',
          eoa: EOA,
        },
      ],
      { ignoreDuplicates: true }
    );
  });

  it('saves an operator for an EOA that has no artist yet', async () => {
    mockSelectWallets.mockResolvedValue(walletRow(null, null));

    await saveOperatorWallet({ eoa: EOA, operator: OPERATOR });

    expect(mockUpsertWallets).toHaveBeenCalledWith(
      [expect.objectContaining({ artist: null, eoa: EOA })],
      { ignoreDuplicates: true }
    );
  });

  it('skips addresses that are not a known wallet', async () => {
    mockSelectWallets.mockResolvedValue({ data: [] } as never);

    await saveOperatorWallet({ eoa: EOA, operator: OPERATOR });

    expect(mockUpsertWallets).not.toHaveBeenCalled();
  });

  it.each(['smart', 'operator'])(
    'skips when the source address is a %s wallet',
    async (type) => {
      mockSelectWallets.mockResolvedValue(walletRow(type, 'artist-1'));

      await saveOperatorWallet({ eoa: EOA, operator: OPERATOR });

      expect(mockUpsertWallets).not.toHaveBeenCalled();
    }
  );

  it('never throws when the database call fails', async () => {
    mockSelectWallets.mockRejectedValue(new Error('db down'));
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(
      saveOperatorWallet({ eoa: EOA, operator: OPERATOR })
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

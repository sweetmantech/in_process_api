import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import getAdminGroups from '../getAdminGroups';

vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));

const ADMIN = '0x00000000000000000000000000000000000000a1' as Address;

describe('getAdminGroups', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns an empty list without querying when there are no admins', async () => {
    expect(await getAdminGroups([])).toEqual([]);
    expect(selectWallets).not.toHaveBeenCalled();
  });

  it('looks up the admin wallets once and groups them', async () => {
    vi.mocked(selectWallets).mockResolvedValue({
      data: [
        {
          address: ADMIN,
          artist_id: 'artist-1',
          type: 'privy',
          artist: { username: 'bob' },
        },
      ],
    } as never);

    expect(await getAdminGroups([ADMIN])).toEqual([
      { artistId: 'artist-1', username: 'bob', addresses: [ADMIN] },
    ]);
    expect(selectWallets).toHaveBeenCalledWith({ addresses: [ADMIN] });
  });

  it('returns null instead of throwing when the lookup fails', async () => {
    vi.mocked(selectWallets).mockRejectedValue(new Error('db down'));
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(await getAdminGroups([ADMIN])).toBeNull();

    consoleError.mockRestore();
  });
});

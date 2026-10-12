import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import selectLinkedOperators from '@/lib/supabase/in_process_wallets/selectLinkedOperators';
import getPermissionTargets from '../getPermissionTargets';

vi.mock('@/lib/supabase/in_process_wallets/selectLinkedOperators', () => ({
  default: vi.fn(),
}));

const EOA = '0x00000000000000000000000000000000000000b1' as Address;

describe('getPermissionTargets', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the address followed by its linked operators', async () => {
    vi.mocked(selectLinkedOperators).mockResolvedValue({
      data: [{ address: '0xop1' }, { address: '0xop2' }],
      error: null,
    } as never);

    expect(await getPermissionTargets(EOA)).toEqual([EOA, '0xop1', '0xop2']);
    expect(selectLinkedOperators).toHaveBeenCalledWith(EOA);
  });

  it('throws when the lookup fails', async () => {
    vi.mocked(selectLinkedOperators).mockResolvedValue({
      data: null,
      error: new Error('db down'),
    } as never);

    await expect(getPermissionTargets(EOA)).rejects.toThrow('db down');
  });
});

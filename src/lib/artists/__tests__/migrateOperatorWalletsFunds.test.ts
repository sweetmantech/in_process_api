import { describe, it, expect, vi, beforeEach } from 'vitest';
import selectOperatorWallets from '@/lib/supabase/in_process_wallets/selectOperatorWallets';
import getWalletBalance from '@/lib/viem/getWalletBalance';
import migrateSmartWalletFunds from '@/lib/artists/migrateSmartWalletFunds';
import migrateOperatorWalletsFunds from '@/lib/artists/migrateOperatorWalletsFunds';

vi.mock('@/lib/supabase/in_process_wallets/selectOperatorWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/viem/getWalletBalance', () => ({ default: vi.fn() }));
vi.mock('@/lib/artists/migrateSmartWalletFunds', () => ({ default: vi.fn() }));

const mockSelectOperatorWallets = vi.mocked(selectOperatorWallets);
const mockGetWalletBalance = vi.mocked(getWalletBalance);
const mockMigrate = vi.mocked(migrateSmartWalletFunds);

const payment = '0xa123456789012345678901234567890123456789' as const;
const funded = { address: '0xop1', eoa: '0xeoa1' };
const empty = { address: '0xop2', eoa: '0xeoa2' };

describe('migrateOperatorWalletsFunds', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetWalletBalance.mockImplementation(async (address) =>
      address === funded.address
        ? { ethBalance: BigInt(0), usdcBalance: BigInt(5) }
        : { ethBalance: BigInt(0), usdcBalance: BigInt(0) }
    );
  });

  it('migrates only operator wallets that hold funds, signing with their eoa', async () => {
    mockSelectOperatorWallets.mockResolvedValue({
      data: [funded, empty],
      error: null,
    } as never);

    await migrateOperatorWalletsFunds({
      artistId: 'artist-1',
      primarySmartAccountAddress: payment,
      chainId: 8453,
    });

    expect(mockSelectOperatorWallets).toHaveBeenCalledWith('artist-1');
    expect(mockMigrate).toHaveBeenCalledTimes(1);
    expect(mockMigrate).toHaveBeenCalledWith({
      legacyWalletAddress: '0xeoa1',
      primarySmartAccountAddress: payment,
      chainId: 8453,
    });
  });

  it('does nothing when the artist has no operator wallets', async () => {
    mockSelectOperatorWallets.mockResolvedValue({
      data: [],
      error: null,
    } as never);

    await migrateOperatorWalletsFunds({
      artistId: 'artist-1',
      primarySmartAccountAddress: payment,
    });

    expect(mockGetWalletBalance).not.toHaveBeenCalled();
    expect(mockMigrate).not.toHaveBeenCalled();
  });

  it('swallows query errors so the balances endpoint keeps working', async () => {
    mockSelectOperatorWallets.mockResolvedValue({
      data: null,
      error: { message: 'column in_process_wallets.eoa does not exist' },
    } as never);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(
      migrateOperatorWalletsFunds({
        artistId: 'artist-1',
        primarySmartAccountAddress: payment,
      })
    ).resolves.toBeUndefined();

    expect(mockMigrate).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('swallows balance lookup errors', async () => {
    mockSelectOperatorWallets.mockResolvedValue({
      data: [funded],
      error: null,
    } as never);
    mockGetWalletBalance.mockRejectedValue(new Error('rpc down'));
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(
      migrateOperatorWalletsFunds({
        artistId: 'artist-1',
        primarySmartAccountAddress: payment,
      })
    ).resolves.toBeUndefined();

    expect(mockMigrate).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

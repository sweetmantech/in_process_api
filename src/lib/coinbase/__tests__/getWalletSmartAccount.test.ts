import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress, zeroAddress } from 'viem';
import ensureSmartWalletOwnerAddress from '@/lib/smartwallets/ensureSmartWalletOwnerAddress';
import { getWalletSmartAccount } from '../getWalletSmartAccount';

vi.mock('@/lib/coinbase/client', () => ({
  default: {
    evm: {
      getOrCreateAccount: vi.fn(),
      getOrCreateSmartAccount: vi.fn(),
    },
  },
}));
vi.mock('@/lib/smartwallets/ensureSmartWalletOwnerAddress', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/wallets/saveOperatorWallet', () => ({
  default: vi.fn(),
}));

import cdp from '@/lib/coinbase/client';
import saveOperatorWallet from '@/lib/wallets/saveOperatorWallet';

const mockCdp = vi.mocked(cdp);
const mockEnsure = vi.mocked(ensureSmartWalletOwnerAddress);
const mockSave = vi.mocked(saveOperatorWallet);

const eoa = getAddress('0x2222222222222222222222222222222222222222');
const smartAccountAddress = getAddress(
  '0x3333333333333333333333333333333333333333'
);
const mockSmartAccount = { address: smartAccountAddress };
const mockEvmAccount = { name: 'test-account', address: eoa };

describe('getWalletSmartAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCdp.evm.getOrCreateAccount.mockResolvedValue(mockEvmAccount as never);
    mockCdp.evm.getOrCreateSmartAccount.mockResolvedValue(
      mockSmartAccount as never
    );
    mockEnsure.mockResolvedValue(undefined);
  });

  it('calls ensureSmartWalletOwnerAddress with lowercased EOA', async () => {
    const result = await getWalletSmartAccount({ address: eoa });

    expect(mockEnsure).toHaveBeenCalledOnce();
    expect(mockEnsure).toHaveBeenCalledWith(
      mockSmartAccount,
      eoa.toLowerCase()
    );
    expect(result).toBe(mockSmartAccount);
  });

  it('skips ensureSmartWalletOwnerAddress when address is zeroAddress', async () => {
    await getWalletSmartAccount({ address: zeroAddress });
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it('saves the operator wallet linked to the lowercased EOA', async () => {
    await getWalletSmartAccount({ address: eoa });

    expect(mockSave).toHaveBeenCalledWith({
      eoa: eoa.toLowerCase(),
      operator: smartAccountAddress,
    });
  });

  it('does not save an operator wallet for zeroAddress', async () => {
    await getWalletSmartAccount({ address: zeroAddress });
    expect(mockSave).not.toHaveBeenCalled();
  });
});

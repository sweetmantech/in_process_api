import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress } from 'viem';
import { FACTORY_ADDRESSES } from '@/lib/protocolSdk/create/factory-addresses';
import isCoinbaseSmartWallet from '@/lib/smartwallets/isCoinbaseSmartWallet';
import getSmartWalletOwnerAddresses from '@/lib/smartwallets/getSmartWalletOwnerAddresses';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import getOperatorFromTransferReceipt from '../getOperatorFromTransferReceipt';
import type { Transfers_t } from '@/types/envio';
import getAirdropOperator from '../getAirdropOperator';

vi.mock('../getOperatorFromTransferReceipt', () => ({ default: vi.fn() }));
vi.mock('@/lib/smartwallets/isCoinbaseSmartWallet', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/smartwallets/getSmartWalletOwnerAddresses', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_collections/selectCollections', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));

const mockGetOperator = vi.mocked(getOperatorFromTransferReceipt);
const mockIsCb = vi.mocked(isCoinbaseSmartWallet);
const mockGetOwnerAddresses = vi.mocked(getSmartWalletOwnerAddresses);
const mockSelectCollections = vi.mocked(selectCollections);
const mockSelectWallets = vi.mocked(selectWallets);

const chainId = 8453;
const collectionAddress = getAddress(
  '0x16af6f4491a4aa8cabd4f0f959dbe0ec24cb88ec'
);
const operatorAddress = getAddress(
  '0x4444444444444444444444444444444444444444'
);
const factoryAddress = getAddress(FACTORY_ADDRESSES[8453]);
const creatorAddress = getAddress('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
const eoaAddress = getAddress('0x5555555555555555555555555555555555555555');

const transferFixture = (over: Partial<Transfers_t> = {}): Transfers_t => ({
  id: 't1',
  collection: collectionAddress,
  token_id: '1',
  chain_id: chainId,
  recipient: '0xaf1452d289e22fbd0dea9d5097353c72a90fac33',
  quantity: '1',
  value: undefined,
  currency: undefined,
  transaction_hash:
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  transferred_at: 0,
  ...over,
});

describe('getAirdropOperator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOperator.mockResolvedValue(operatorAddress);
    mockIsCb.mockResolvedValue(false);
  });

  describe('factory operator', () => {
    beforeEach(() => {
      mockGetOperator.mockResolvedValue(factoryAddress);
    });

    it('returns collection creator when operator is factory', async () => {
      mockSelectCollections.mockResolvedValue([
        {
          creator: creatorAddress,
          creator_wallet: { artist: { username: 'factoryCreator' } },
        },
      ] as never);

      const result = await getAirdropOperator(transferFixture());

      expect(mockSelectCollections).toHaveBeenCalledWith({
        addresses: [collectionAddress],
        chainId,
      });
      expect(mockIsCb).not.toHaveBeenCalled();
      expect(result).toEqual({
        address: creatorAddress,
        username: 'factoryCreator',
      });
    });

    it('throws Collection not found when selectCollections returns empty', async () => {
      mockSelectCollections.mockResolvedValue([] as never);
      await expect(getAirdropOperator(transferFixture())).rejects.toThrow(
        'Collection not found'
      );
    });

    it('throws Collection not found when selectCollections returns null', async () => {
      mockSelectCollections.mockResolvedValue(null as never);
      await expect(getAirdropOperator(transferFixture())).rejects.toThrow(
        'Collection not found'
      );
    });
  });

  describe('Coinbase Smart Wallet operator', () => {
    beforeEach(() => {
      mockIsCb.mockResolvedValue(true);
      mockGetOwnerAddresses.mockResolvedValue([eoaAddress]);
    });

    it('looks up artist via smart wallet owner addresses', async () => {
      mockSelectWallets.mockResolvedValue({
        data: [
          { address: eoaAddress, type: 'privy', artist: { username: 'bob' } },
        ],
      } as never);

      const result = await getAirdropOperator(transferFixture());

      expect(mockGetOwnerAddresses).toHaveBeenCalledWith(operatorAddress);
      expect(mockSelectWallets).toHaveBeenCalledWith({
        addresses: [eoaAddress],
      });
      expect(result).toEqual({ address: eoaAddress, username: 'bob' });
    });

    it('throws when no wallet found for owner addresses', async () => {
      mockSelectWallets.mockResolvedValue({ data: null } as never);
      await expect(getAirdropOperator(transferFixture())).rejects.toThrow(
        'Airdrop operator not found'
      );
    });

    it('falls back to a smart wallet when owners match only smart wallets', async () => {
      mockSelectWallets.mockResolvedValue({
        data: [
          { address: eoaAddress, type: 'smart', artist: { username: 'bob' } },
        ],
      } as never);

      const result = await getAirdropOperator(transferFixture());

      expect(result).toEqual({ address: eoaAddress, username: 'bob' });
    });

    it('prefers a non-smart wallet over a smart wallet', async () => {
      mockGetOwnerAddresses.mockResolvedValue([eoaAddress, creatorAddress]);
      mockSelectWallets.mockResolvedValue({
        data: [
          {
            address: creatorAddress,
            type: 'smart',
            artist: { username: 'bob' },
          },
          { address: eoaAddress, type: 'privy', artist: { username: 'bob' } },
        ],
      } as never);

      const result = await getAirdropOperator(transferFixture());

      expect(result).toEqual({ address: eoaAddress, username: 'bob' });
    });
  });

  describe('plain EOA operator', () => {
    it('looks up artist directly by operator address', async () => {
      mockSelectWallets.mockResolvedValue({
        data: [
          {
            address: operatorAddress,
            type: 'privy',
            artist: { username: 'ann' },
          },
        ],
      } as never);

      const result = await getAirdropOperator(transferFixture());

      expect(mockGetOwnerAddresses).not.toHaveBeenCalled();
      expect(mockSelectWallets).toHaveBeenCalledWith({
        addresses: [operatorAddress],
      });
      expect(result).toEqual({ address: operatorAddress, username: 'ann' });
    });

    it('throws when artist is not found in DB', async () => {
      mockSelectWallets.mockResolvedValue({ data: null } as never);
      await expect(getAirdropOperator(transferFixture())).rejects.toThrow(
        'Airdrop operator not found'
      );
    });

    it('throws when selectWallets returns empty list', async () => {
      mockSelectWallets.mockResolvedValue({ data: [] } as never);
      await expect(getAirdropOperator(transferFixture())).rejects.toThrow(
        'Airdrop operator not found'
      );
    });
  });
});

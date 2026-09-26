import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress } from 'viem';
import { getPublicClient } from '@/lib/viem/publicClient';
import type { Transfers_t } from '@/types/envio';
import getOperatorFromTransferReceipt from '../getOperatorFromTransferReceipt';

const TRANSFER_SINGLE_TOPIC =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
const hash =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const collectionAddress = getAddress(
  '0x16af6f4491a4aa8cabd4f0f959dbe0ec24cb88ec'
);
const ZERO_FROM_TOPIC =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
const toTopic =
  '0x000000000000000000000000af1452d289e22fbd0dea9d5097353c72a90fac33' as const;
const operatorTopic =
  '0x0000000000000000000000004444444444444444444444444444444444444444' as const;
const operatorAddress = getAddress(
  `0x${operatorTopic.slice(-40)}` as `0x${string}`
);
const recipientLc = getAddress(
  `0x${toTopic.slice(-40)}` as `0x${string}`
).toLowerCase();

const mintTopics = [
  TRANSFER_SINGLE_TOPIC,
  operatorTopic,
  ZERO_FROM_TOPIC,
  toTopic,
] as const;

const transferFixture = (over: Partial<Transfers_t> = {}): Transfers_t => ({
  id: 't1',
  collection: collectionAddress,
  token_id: '1',
  chain_id: 8453,
  recipient: recipientLc,
  quantity: '1',
  value: undefined,
  currency: undefined,
  transaction_hash: hash,
  transferred_at: 0,
  ...over,
});

const receiptWith = (
  topics: readonly (string | undefined)[],
  logAddress: string = collectionAddress
) => ({
  logs: [{ address: logAddress, topics: [...topics] }],
});

vi.mock('@/lib/viem/publicClient', () => ({ getPublicClient: vi.fn() }));

const mockGetPublicClient = vi.mocked(getPublicClient);

describe('getOperatorFromTransferReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublicClient.mockReturnValue({
      getTransactionReceipt: vi.fn().mockResolvedValue(receiptWith(mintTopics)),
    } as never);
  });

  it('returns operator address from matching TransferSingle log', async () => {
    await expect(
      getOperatorFromTransferReceipt(transferFixture())
    ).resolves.toBe(operatorAddress);
  });

  it('returns null when logs array is empty', async () => {
    mockGetPublicClient.mockReturnValue({
      getTransactionReceipt: vi.fn().mockResolvedValue({ logs: [] }),
    } as never);
    await expect(
      getOperatorFromTransferReceipt(transferFixture())
    ).resolves.toBeNull();
  });

  it('returns null when topics[0] does not match TransferSingle', async () => {
    mockGetPublicClient.mockReturnValue({
      getTransactionReceipt: vi
        .fn()
        .mockResolvedValue(
          receiptWith(['0x' + '11'.repeat(32), operatorTopic])
        ),
    } as never);
    await expect(
      getOperatorFromTransferReceipt(transferFixture())
    ).resolves.toBeNull();
  });

  it('returns null when log is from a different contract', async () => {
    mockGetPublicClient.mockReturnValue({
      getTransactionReceipt: vi
        .fn()
        .mockResolvedValue(receiptWith(mintTopics, operatorAddress)),
    } as never);
    await expect(
      getOperatorFromTransferReceipt(transferFixture())
    ).resolves.toBeNull();
  });

  it('returns null when from topic is not zero address (not a mint)', async () => {
    mockGetPublicClient.mockReturnValue({
      getTransactionReceipt: vi
        .fn()
        .mockResolvedValue(
          receiptWith([
            TRANSFER_SINGLE_TOPIC,
            operatorTopic,
            toTopic,
            ZERO_FROM_TOPIC,
          ])
        ),
    } as never);
    await expect(
      getOperatorFromTransferReceipt(transferFixture())
    ).resolves.toBeNull();
  });

  it('returns null when to topic does not match recipient', async () => {
    await expect(
      getOperatorFromTransferReceipt(
        transferFixture({
          recipient: '0x0000000000000000000000000000000000000001',
        })
      )
    ).resolves.toBeNull();
  });
});

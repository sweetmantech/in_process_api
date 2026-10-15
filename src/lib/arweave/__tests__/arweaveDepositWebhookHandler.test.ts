import { describe, it, expect, vi, beforeEach } from 'vitest';

const afterTasks: (() => void | Promise<void>)[] = [];

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: (task: () => void | Promise<void>) => {
      afterTasks.push(task);
    },
  };
});
vi.mock('@/lib/arweave/forwardArweaveDeposit', () => ({
  default: vi.fn(),
}));

import arweaveDepositWebhookHandler from '@/lib/arweave/arweaveDepositWebhookHandler';
import forwardArweaveDeposit from '@/lib/arweave/forwardArweaveDeposit';
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/consts';

const activity = (category: string, address: string) => ({
  event: { activity: [{ category, rawContract: { address } }] },
});

beforeEach(() => {
  vi.clearAllMocks();
  afterTasks.length = 0;
});

describe('arweaveDepositWebhookHandler', () => {
  it('forwards the deposit after responding on a USDC transfer', async () => {
    const res = arweaveDepositWebhookHandler(
      activity('token', USDC_ADDRESS[CHAIN_ID].toUpperCase())
    );

    expect(await res.json()).toEqual({ status: 'success', forwarding: true });
    expect(forwardArweaveDeposit).not.toHaveBeenCalled();
    await afterTasks[0]();
    expect(forwardArweaveDeposit).toHaveBeenCalledTimes(1);
  });

  it('ignores other tokens', async () => {
    const res = arweaveDepositWebhookHandler(
      activity('token', '0x1111111111111111111111111111111111111111')
    );

    expect(await res.json()).toEqual({ status: 'success', forwarding: false });
    expect(afterTasks).toHaveLength(0);
  });

  it('ignores native ETH transfers', async () => {
    arweaveDepositWebhookHandler(activity('external', ''));

    expect(afterTasks).toHaveLength(0);
  });

  it('logs instead of throwing when forwarding fails', async () => {
    vi.mocked(forwardArweaveDeposit).mockRejectedValue(new Error('boom'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    arweaveDepositWebhookHandler(activity('token', USDC_ADDRESS[CHAIN_ID]));
    await afterTasks[0]();

    expect(error).toHaveBeenCalled();
  });
});

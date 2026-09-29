import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Address } from 'viem';

vi.mock('@/lib/moment/findMoments', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_sales/selectSale', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_sales/upsertSales', () => ({
  upsertSales: vi.fn(),
}));
vi.mock('@/lib/sales/getFeeRecipientsForSale', () => ({
  getFeeRecipientsForSale: vi.fn(),
}));
vi.mock('@/lib/wallets/ensureWallets', () => ({
  ensureWallets: vi.fn(),
}));
vi.mock(
  '@/lib/supabase/in_process_moment_fee_recipients/deleteFeeRecipientsByMoment',
  () => ({ default: vi.fn() })
);
vi.mock(
  '@/lib/supabase/in_process_moment_fee_recipients/upsertFeeRecipients',
  () => ({ upsertFeeRecipients: vi.fn() })
);

import findMoments from '@/lib/moment/findMoments';
import selectSale from '@/lib/supabase/in_process_sales/selectSale';
import { upsertSales } from '@/lib/supabase/in_process_sales/upsertSales';
import { getFeeRecipientsForSale } from '@/lib/sales/getFeeRecipientsForSale';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import deleteFeeRecipientsByMoment from '@/lib/supabase/in_process_moment_fee_recipients/deleteFeeRecipientsByMoment';
import { upsertFeeRecipients } from '@/lib/supabase/in_process_moment_fee_recipients/upsertFeeRecipients';
import indexSale from '../indexSale';

const COLLECTION = '0x0000000000000000000000000000000000000001' as Address;
const RECIPIENT = '0x000000000000000000000000000000000000bEEF' as Address;
const MOMENT_ID = 'moment-uuid';
const CREATED_AT = '2024-01-01T00:00:00.000Z';

const moment = {
  collectionAddress: COLLECTION,
  tokenId: '1',
  chainId: 8453,
};

const sale = {
  saleStart: BigInt(1000),
  saleEnd: BigInt(9999999),
  maxTokensPerAddress: BigInt(0),
  pricePerToken: BigInt(500),
  fundsRecipient: RECIPIENT,
};

const dbMoment = {
  id: MOMENT_ID,
  token_id: 1,
  collection: {
    address: COLLECTION,
    chain_id: 8453,
  },
};

const existingSale = {
  moment: MOMENT_ID,
  currency: '0x0000000000000000000000000000000000000000',
  created_at: CREATED_AT,
};

const feeRecipients = [
  {
    moment: MOMENT_ID,
    artist_address: RECIPIENT.toLowerCase(),
    percent_allocation: 100,
  },
];

describe('indexSale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findMoments).mockResolvedValue({
      data: [dbMoment],
      error: null,
    } as never);
    vi.mocked(selectSale).mockResolvedValue(existingSale as never);
    vi.mocked(upsertSales).mockResolvedValue(undefined);
    vi.mocked(getFeeRecipientsForSale).mockResolvedValue(feeRecipients);
    vi.mocked(ensureWallets).mockResolvedValue(undefined as never);
    vi.mocked(deleteFeeRecipientsByMoment).mockResolvedValue(undefined);
    vi.mocked(upsertFeeRecipients).mockResolvedValue(undefined);
  });

  it('returns without writing when the moment is not in the database', async () => {
    vi.mocked(findMoments).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    await indexSale({ moment, sale });

    expect(selectSale).not.toHaveBeenCalled();
    expect(upsertSales).not.toHaveBeenCalled();
  });

  it('returns without writing when no sale row exists', async () => {
    vi.mocked(selectSale).mockResolvedValue(null);

    await indexSale({ moment, sale });

    expect(upsertSales).not.toHaveBeenCalled();
    expect(getFeeRecipientsForSale).not.toHaveBeenCalled();
  });

  it('upserts the sale while preserving created_at and currency', async () => {
    await indexSale({ moment, sale });

    expect(upsertSales).toHaveBeenCalledWith([
      {
        moment: MOMENT_ID,
        currency: existingSale.currency,
        funds_recipient: RECIPIENT.toLowerCase(),
        max_tokens_per_address: 0,
        price_per_token: 500,
        sale_end: 9999999,
        sale_start: 1000,
        created_at: CREATED_AT,
      },
    ]);
  });

  it('replaces fee recipients for the moment', async () => {
    await indexSale({ moment, sale });

    expect(getFeeRecipientsForSale).toHaveBeenCalledWith(
      {
        funds_recipient: RECIPIENT,
        chain_id: 8453,
      },
      MOMENT_ID
    );
    expect(ensureWallets).toHaveBeenCalledWith([RECIPIENT.toLowerCase()]);
    expect(deleteFeeRecipientsByMoment).toHaveBeenCalledWith(MOMENT_ID);
    expect(upsertFeeRecipients).toHaveBeenCalledWith(feeRecipients);
  });
});

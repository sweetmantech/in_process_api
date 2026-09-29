import type { Moment } from '@/types/moment';
import type { SaleConfig } from '@/types/sale';
import findMoments from '@/lib/moment/findMoments';
import selectSale from '@/lib/supabase/in_process_sales/selectSale';
import { upsertSales } from '@/lib/supabase/in_process_sales/upsertSales';
import { getFeeRecipientsForSale } from '@/lib/sales/getFeeRecipientsForSale';
import { mapSaleToSupabaseRow } from '@/lib/sales/mapSaleToSupabaseRow';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import deleteFeeRecipientsByMoment from '@/lib/supabase/in_process_moment_fee_recipients/deleteFeeRecipientsByMoment';
import { upsertFeeRecipients } from '@/lib/supabase/in_process_moment_fee_recipients/upsertFeeRecipients';

const indexSale = async ({
  moment,
  sale,
}: {
  moment: Moment;
  sale: SaleConfig;
}) => {
  const collectionAddress = moment.collectionAddress.toLowerCase();
  const { data: moments } = await findMoments({
    moments: [moment],
    chainId: moment.chainId,
    limit: 1,
  });
  const dbMoment = moments?.find(
    (row) =>
      row.collection.address.toLowerCase() === collectionAddress &&
      String(row.token_id) === String(moment.tokenId) &&
      row.collection.chain_id === moment.chainId
  );
  if (!dbMoment) return;

  const existing = await selectSale(dbMoment.id);
  if (!existing) return;

  await upsertSales([
    mapSaleToSupabaseRow({
      momentId: dbMoment.id,
      currency: existing.currency,
      fundsRecipient: sale.fundsRecipient,
      maxTokensPerAddress: sale.maxTokensPerAddress,
      pricePerToken: sale.pricePerToken,
      saleEnd: sale.saleEnd,
      saleStart: sale.saleStart,
      createdAt: existing.created_at,
    }),
  ]);

  const feeRecipients = await getFeeRecipientsForSale(
    {
      funds_recipient: sale.fundsRecipient,
      chain_id: moment.chainId,
    },
    dbMoment.id
  );

  await ensureWallets(
    feeRecipients.map((recipient) => recipient.artist_address)
  );
  await deleteFeeRecipientsByMoment(dbMoment.id);
  await upsertFeeRecipients(feeRecipients);
};

export default indexSale;

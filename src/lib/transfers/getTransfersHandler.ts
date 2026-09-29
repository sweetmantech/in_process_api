import { NextResponse } from 'next/server';
import { z } from 'zod';
import transfersQuerySchema from '@/lib/schema/transfersQuerySchema';
import getTransfers from '@/lib/transfers/getTransfers';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import { Transfer_Type } from '@/types/transfer';
import normalizeTransfer from './normalizeTransfer';

type TransfersParams = z.infer<typeof transfersQuerySchema> & {
  momentId?: string;
};

const getTransfersHandler = async (params: TransfersParams) => {
  const { collection, tokenId, chainId, type, page, limit } = params;
  let momentId = params.momentId;
  if (collection !== undefined && tokenId !== undefined) {
    const { data: moments } = await getMomentsByAddressAndTokenId({
      moments: [
        { collectionAddress: collection, tokenId: String(tokenId), chainId },
      ],
    });
    momentId = moments?.[0]?.id ?? momentId;
  }
  const { data, count } = await getTransfers({
    ...params,
    momentId,
  } as TransfersParams);
  const totalCount = count ?? 0;
  const transfers =
    type === Transfer_Type.airdrop
      ? (data ?? [])
      : (data ?? []).map(normalizeTransfer);
  return NextResponse.json({
    transfers,
    pagination: {
      total_count: totalCount,
      page,
      limit,
      total_pages: Math.ceil(totalCount / limit),
    },
  });
};

export default getTransfersHandler;

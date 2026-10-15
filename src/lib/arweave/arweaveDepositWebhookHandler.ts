import { after, NextResponse } from 'next/server';
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/consts';
import forwardArweaveDeposit from './forwardArweaveDeposit';

export interface AlchemyAddressActivityWebhook {
  event?: {
    activity?: {
      category?: string;
      rawContract?: { address?: string };
    }[];
  };
}

const arweaveDepositWebhookHandler = (
  payload: AlchemyAddressActivityWebhook
) => {
  const usdc = USDC_ADDRESS[CHAIN_ID].toLowerCase();
  const hasUsdcTransfer = (payload.event?.activity ?? []).some(
    (a) =>
      a.category === 'token' && a.rawContract?.address?.toLowerCase() === usdc
  );

  if (hasUsdcTransfer) {
    after(async () => {
      try {
        const result = await forwardArweaveDeposit();
        console.log('[arweave-deposit-webhook]', JSON.stringify(result));
      } catch (e) {
        console.error('[arweave-deposit-webhook]', e);
      }
    });
  }

  return NextResponse.json({ status: 'success', forwarding: hasUsdcTransfer });
};

export default arweaveDepositWebhookHandler;

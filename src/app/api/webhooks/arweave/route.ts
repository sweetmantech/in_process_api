import { NextRequest, NextResponse } from 'next/server';
import validateAlchemyWebhook from '@/lib/alchemy/validateAlchemyWebhook';
import arweaveDepositWebhookHandler, {
  type AlchemyAddressActivityWebhook,
} from '@/lib/arweave/arweaveDepositWebhookHandler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const validated =
      await validateAlchemyWebhook<AlchemyAddressActivityWebhook>(
        req,
        process.env.ALCHEMY_ARWEAVE_DEPOSIT_SIGNING_KEY
      );
    if (validated instanceof NextResponse) return validated;
    return arweaveDepositWebhookHandler(validated);
  } catch (e: any) {
    console.error('[POST /api/webhooks/arweave]', e);
    return NextResponse.json(
      { message: e?.message ?? 'Failed' },
      { status: 500 }
    );
  }
}

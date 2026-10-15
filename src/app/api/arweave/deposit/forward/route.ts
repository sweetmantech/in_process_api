import { NextRequest, NextResponse } from 'next/server';
import validateCronHandler from '@/lib/cron/validateCronHandler';
import forwardArweaveDeposit from '@/lib/arweave/forwardArweaveDeposit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauthorized = validateCronHandler(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await forwardArweaveDeposit();
    return NextResponse.json({ status: 'success', ...result });
  } catch (e: any) {
    console.error('[GET /api/arweave/deposit/forward]', e);
    return NextResponse.json(
      { message: e?.message ?? 'Failed' },
      { status: 500 }
    );
  }
}

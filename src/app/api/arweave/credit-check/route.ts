import { NextRequest, NextResponse } from 'next/server';
import validateCronHandler from '@/lib/cron/validateCronHandler';
import notifyLowTurboCredits from '@/lib/arweave/notifyLowTurboCredits';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorized = validateCronHandler(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await notifyLowTurboCredits();
    return NextResponse.json({ status: 'success', ...result });
  } catch (e: any) {
    console.error('[GET /api/arweave/credit-check]', e);
    return NextResponse.json(
      { message: e?.message ?? 'Failed' },
      { status: 500 }
    );
  }
}

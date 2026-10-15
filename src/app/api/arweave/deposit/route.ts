import { NextResponse } from 'next/server';
import getArweaveDepositHandler from '@/lib/arweave/getArweaveDepositHandler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return await getArweaveDepositHandler();
  } catch (e: any) {
    console.error('[GET /api/arweave/deposit]', e);
    return NextResponse.json(
      { message: e?.message ?? 'Failed' },
      { status: 500 }
    );
  }
}

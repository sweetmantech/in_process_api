import { NextRequest, NextResponse } from 'next/server';
import validateCronHandler from '@/lib/cron/validateCronHandler';
import ingestPendingMomentVideos from '@/lib/mux/ingestPendingMomentVideos';
import getMuxIngestBatchSize from '@/lib/mux/getMuxIngestBatchSize';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorized = validateCronHandler(req);
  if (unauthorized) return unauthorized;

  try {
    const summary = await ingestPendingMomentVideos(getMuxIngestBatchSize());
    return NextResponse.json({ status: 'success', ...summary });
  } catch (e: any) {
    console.error('[GET /api/mux/ingest]', e);
    return NextResponse.json(
      { message: e?.message ?? 'Failed' },
      { status: 500 }
    );
  }
}

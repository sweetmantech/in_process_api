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
    const batchSize = getMuxIngestBatchSize();
    const summary = await ingestPendingMomentVideos(batchSize);
    // Skip the log while the cron is off (batch size 0) to keep logs quiet.
    if (batchSize > 0)
      console.log(`[mux-ingest] run batch=${batchSize}`, summary);
    return NextResponse.json({ status: 'success', ...summary });
  } catch (e: any) {
    console.error('[GET /api/mux/ingest]', e);
    return NextResponse.json(
      { message: e?.message ?? 'Failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import validateCronHandler from '@/lib/cron/validateCronHandler';
import runIndexerHandler from '@/lib/indexer/runIndexerHandler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const unauthorized = validateCronHandler(req);
  if (unauthorized) return unauthorized;

  return runIndexerHandler(maxDuration, startedAt);
}

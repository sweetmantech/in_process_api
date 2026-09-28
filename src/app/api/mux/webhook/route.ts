import { NextRequest, NextResponse } from 'next/server';
import validateMuxWebhook from '@/lib/mux/validateMuxWebhook';
import muxWebhookHandler from '@/lib/mux/muxWebhookHandler';

export async function POST(req: NextRequest) {
  try {
    const validated = await validateMuxWebhook(req);
    if (validated instanceof NextResponse) return validated;
    return await muxWebhookHandler(validated);
  } catch (e: any) {
    console.error('Mux webhook error:', e);
    const message = e?.message ?? 'Failed to handle Mux webhook';
    return Response.json({ message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

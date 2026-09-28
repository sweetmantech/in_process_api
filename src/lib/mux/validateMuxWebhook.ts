import { NextRequest, NextResponse } from 'next/server';
import type { UnwrapWebhookEvent } from '@mux/mux-node/resources/webhooks';
import mux from '@/lib/mux';

/** Verifies the Mux signature (MUX_WEBHOOK_SECRET) and parses the event. */
const validateMuxWebhook = async (
  req: NextRequest
): Promise<UnwrapWebhookEvent | NextResponse> => {
  const body = await req.text();
  try {
    return mux.webhooks.unwrap(body, req.headers);
  } catch {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }
};

export default validateMuxWebhook;

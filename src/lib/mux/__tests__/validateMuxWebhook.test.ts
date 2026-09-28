import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Real Mux SDK + real HMAC signature: checks that Next's Headers work with unwrap().
const SECRET = 'test-webhook-secret';

const sign = (body: string, timestamp = Math.floor(Date.now() / 1000)) =>
  `t=${timestamp},v1=${createHmac('sha256', SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex')}`;

const request = (body: string, signature: string) =>
  new NextRequest('https://api.test/api/mux/webhook', {
    method: 'POST',
    body,
    headers: { 'mux-signature': signature, 'content-type': 'application/json' },
  });

let validateMuxWebhook: typeof import('../validateMuxWebhook').default;

describe('validateMuxWebhook', () => {
  beforeAll(async () => {
    process.env.MUX_WEBHOOK_SECRET = SECRET;
    process.env.MUX_TOKEN_ID = 'id';
    process.env.MUX_TOKEN_SECRET = 'secret';
    validateMuxWebhook = (await import('../validateMuxWebhook')).default;
  });

  it('returns the parsed event for a valid signature', async () => {
    const body = JSON.stringify({
      type: 'video.asset.ready',
      data: { id: 'asset1' },
    });

    const result = await validateMuxWebhook(request(body, sign(body)));

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toMatchObject({
      type: 'video.asset.ready',
      data: { id: 'asset1' },
    });
  });

  it('rejects a forged signature with 401', async () => {
    const body = JSON.stringify({ type: 'video.asset.ready', data: {} });

    const result = await validateMuxWebhook(
      request(body, sign('{"tampered":true}'))
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});

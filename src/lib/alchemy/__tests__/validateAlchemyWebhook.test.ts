import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import validateAlchemyWebhook from '../validateAlchemyWebhook';

const KEY = 'whsec_test';

const sign = (body: string, key = KEY) =>
  createHmac('sha256', key).update(body, 'utf8').digest('hex');

const request = (body: string, signature?: string) =>
  new NextRequest('https://api.test/api/webhooks/arweave', {
    method: 'POST',
    body,
    headers: signature ? { 'x-alchemy-signature': signature } : {},
  });

describe('validateAlchemyWebhook', () => {
  it('returns the parsed payload for a valid signature', async () => {
    const body = JSON.stringify({ type: 'ADDRESS_ACTIVITY' });

    const result = await validateAlchemyWebhook(request(body, sign(body)), KEY);

    expect(result).toEqual({ type: 'ADDRESS_ACTIVITY' });
  });

  it('rejects a signature made with another key', async () => {
    const body = JSON.stringify({ type: 'ADDRESS_ACTIVITY' });

    const result = await validateAlchemyWebhook(
      request(body, sign(body, 'other')),
      KEY
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('rejects a missing signature', async () => {
    const result = await validateAlchemyWebhook(request('{}'), KEY);

    expect((result as NextResponse).status).toBe(401);
  });

  it('rejects everything when the signing key is not configured', async () => {
    const body = '{}';

    const result = await validateAlchemyWebhook(
      request(body, sign(body, '')),
      undefined
    );

    expect((result as NextResponse).status).toBe(401);
  });
});

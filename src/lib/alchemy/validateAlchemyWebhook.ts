import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const validateAlchemyWebhook = async <T>(
  req: NextRequest,
  signingKey: string | undefined
): Promise<T | NextResponse> => {
  const body = await req.text();
  const signature = req.headers.get('x-alchemy-signature') ?? '';
  const expected = createHmac('sha256', signingKey ?? '')
    .update(body, 'utf8')
    .digest('hex');

  const valid =
    !!signingKey &&
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  return JSON.parse(body) as T;
};

export default validateAlchemyWebhook;

import { NextRequest, NextResponse } from 'next/server';
import validateEmailsQuery from '@/lib/emails/validateEmailsQuery';
import getEmailsHandler from '@/lib/emails/getEmailsHandler';

export async function GET(req: NextRequest) {
  try {
    const validated = await validateEmailsQuery(req);
    if (validated instanceof NextResponse) return validated;
    const { callerAddress, artist_address, cursor, limit } = validated;
    return await getEmailsHandler(callerAddress, artist_address, cursor, limit);
  } catch (e: any) {
    const message = e?.message ?? 'Failed to fetch emails';
    return Response.json({ message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

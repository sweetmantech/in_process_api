import { NextRequest, NextResponse } from 'next/server';
import validateSearchArtistsQuery from '@/lib/artists/validateSearchArtistsQuery';
import searchArtistsHandler from '@/lib/artists/searchArtistsHandler';

export async function GET(req: NextRequest) {
  try {
    const validated = validateSearchArtistsQuery(req);
    if (validated instanceof NextResponse) return validated;
    return await searchArtistsHandler(validated);
  } catch (e: any) {
    console.error('Error searching artists:', e);
    return Response.json(
      { message: e?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

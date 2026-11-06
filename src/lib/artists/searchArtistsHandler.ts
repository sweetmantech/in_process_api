import { NextResponse } from 'next/server';
import { z } from 'zod';
import selectArtists from '@/lib/supabase/in_process_artists/selectArtists';
import searchArtistsQuerySchema from '@/lib/schema/searchArtistsQuerySchema';

type SearchArtistsInput = z.infer<typeof searchArtistsQuerySchema>;

const searchArtistsHandler = async ({
  query,
  handle,
  limit,
}: SearchArtistsInput) => {
  const { data } = await selectArtists(
    handle ? { handle } : { q: query, limit }
  );

  const artists = (data ?? []).map((a) => ({
    username: a.username,
    handle: a.handle,
    wallets: a.wallets,
  }));

  if (handle) {
    const [artist] = artists;
    if (!artist) {
      return NextResponse.json(
        { message: 'Artist not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ artist });
  }

  return NextResponse.json({ artists });
};

export default searchArtistsHandler;

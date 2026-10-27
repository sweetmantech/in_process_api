import { NextResponse } from 'next/server';
import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';
import invalidateTimelineCache from '@/lib/timeline/invalidateTimelineCache';
import type { CreateProfileInput } from './validateCreateProfileBody';

const createProfileHandler = async ({
  artist,
  username,
  bio,
  instagram,
  x,
  telegram,
}: CreateProfileInput) => {
  await upsertArtists({
    id: artist.artistId,
    username,
    bio,
    instagram,
    x,
    telegram,
  });
  await invalidateTimelineCache();
  return NextResponse.json({ success: true });
};

export default createProfileHandler;

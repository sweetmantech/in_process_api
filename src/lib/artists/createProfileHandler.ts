import { NextResponse } from 'next/server';
import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';
import invalidateTimelineCache from '@/lib/timeline/invalidateTimelineCache';
import isHandleTakenError from './isHandleTakenError';
import type { CreateProfileInput } from './validateCreateProfileBody';

const createProfileHandler = async ({
  artist,
  username,
  handle,
  bio,
  instagram,
  x,
  telegram,
}: CreateProfileInput) => {
  try {
    await upsertArtists({
      id: artist.artistId,
      username,
      handle,
      bio,
      instagram,
      x,
      telegram,
    });
  } catch (error) {
    if (isHandleTakenError(error)) {
      return NextResponse.json(
        { error: 'handle_taken', message: 'Handle is already taken' },
        { status: 409 }
      );
    }
    throw error;
  }
  await invalidateTimelineCache();
  return NextResponse.json({ success: true });
};

export default createProfileHandler;

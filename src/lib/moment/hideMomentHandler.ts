import { NextResponse } from 'next/server';
import type { z } from 'zod';
import hideMomentSchema from '@/lib/schema/hideMomentSchema';
import selectHidden from '@/lib/supabase/in_process_hidden/selectHidden';
import insertHidden from '@/lib/supabase/in_process_hidden/insertHidden';
import deleteHidden from '@/lib/supabase/in_process_hidden/deleteHidden';
import invalidateTimelineCache from '@/lib/timeline/invalidateTimelineCache';

type HideMomentHandlerInput = z.infer<typeof hideMomentSchema> & {
  artistId: string;
};

const hideMomentHandler = async ({
  artistId,
  momentId,
}: HideMomentHandlerInput) => {
  const { data: existing } = await selectHidden({
    moment: momentId,
    artist: artistId,
  });

  if (existing) {
    await deleteHidden({ moment: momentId, artist: artistId });
  } else {
    await insertHidden({ moment: momentId, artist: artistId });
  }

  await invalidateTimelineCache();

  return NextResponse.json({ success: true });
};

export default hideMomentHandler;

import { NextResponse } from 'next/server';
import type { UnwrapWebhookEvent } from '@mux/mux-node/resources/webhooks';
import getMomentIdFromMuxPassthrough from '@/lib/mux/getMomentIdFromMuxPassthrough';
import upsertVideoPlayback from '@/lib/supabase/in_process_video_playback/upsertVideoPlayback';

/**
 * Marks ingested moment videos ready/errored. Assets without a moment
 * passthrough (direct uploads) are recorded by migrateAssetToArweave instead.
 */
const muxWebhookHandler = async (event: UnwrapWebhookEvent) => {
  if (
    event.type !== 'video.asset.ready' &&
    event.type !== 'video.asset.errored'
  ) {
    return NextResponse.json({ ignored: true });
  }

  const asset = event.data;
  const momentId = getMomentIdFromMuxPassthrough(asset.passthrough);
  if (!momentId) return NextResponse.json({ ignored: true });

  const { error } = await upsertVideoPlayback({
    moment: momentId,
    provider: 'mux',
    asset_id: asset.id,
    playback_id: asset.playback_ids?.[0]?.id ?? null,
    status: event.type === 'video.asset.ready' ? 'ready' : 'errored',
  });
  if (error)
    throw new Error(`Failed to update video playback: ${error.message}`);

  return NextResponse.json({ ok: true });
};

export default muxWebhookHandler;

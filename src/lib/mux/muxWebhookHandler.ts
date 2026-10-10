import { NextResponse } from 'next/server';
import type { UnwrapWebhookEvent } from '@mux/mux-node/resources/webhooks';
import getMomentIdFromMuxPassthrough from '@/lib/mux/getMomentIdFromMuxPassthrough';
import upsertVideoPlayback from '@/lib/supabase/in_process_video_playback/upsertVideoPlayback';
import updateVideoPlaybackAspectRatio from '@/lib/supabase/in_process_video_playback/updateVideoPlaybackAspectRatio';

/**
 * Marks ingested moment videos ready/errored. Assets without a moment
 * passthrough (direct uploads) are recorded by migrateAssetToArweave instead.
 */
const muxWebhookHandler = async (event: UnwrapWebhookEvent) => {
  const dataId = (event.data as { id?: string } | undefined)?.id;

  if (
    event.type !== 'video.asset.ready' &&
    event.type !== 'video.asset.errored'
  ) {
    console.log(`[mux-webhook] ignored ${event.type} id=${dataId}`);
    return NextResponse.json({ ignored: true });
  }

  const asset = event.data;
  const aspectRatio = asset.aspect_ratio ?? null;
  const momentId = getMomentIdFromMuxPassthrough(asset.passthrough);
  if (!momentId) {
    if (event.type === 'video.asset.ready' && aspectRatio) {
      const { error } = await updateVideoPlaybackAspectRatio(
        asset.id,
        aspectRatio
      );
      if (error)
        throw new Error(
          `Failed to update video aspect ratio: ${error.message}`
        );
      console.log(
        `[mux-webhook] aspect_ratio=${aspectRatio} asset=${asset.id} (direct upload)`
      );
      return NextResponse.json({ ok: true });
    }
    console.log(
      `[mux-webhook] ignored ${event.type} asset=${asset.id} (direct upload, no moment passthrough)`
    );
    return NextResponse.json({ ignored: true });
  }

  const status = event.type === 'video.asset.ready' ? 'ready' : 'errored';
  const playbackId = asset.playback_ids?.[0]?.id ?? null;
  const { error } = await upsertVideoPlayback({
    moment: momentId,
    provider: 'mux',
    asset_id: asset.id,
    playback_id: playbackId,
    aspect_ratio: aspectRatio,
    status,
  });
  if (error)
    throw new Error(`Failed to update video playback: ${error.message}`);

  const reason =
    status === 'errored'
      ? ` reason="${asset.errors?.type ?? ''}: ${(asset.errors?.messages ?? []).join('; ')}"`
      : '';
  console.log(
    `[mux-webhook] ${status} moment=${momentId} asset=${asset.id} playback=${playbackId}${reason}`
  );

  return NextResponse.json({ ok: true });
};

export default muxWebhookHandler;

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import mux from '@/lib/mux';

const createMuxUploadHandler = async (): Promise<NextResponse> => {
  const upload = await mux.video.uploads.create({
    cors_origin: '*',
    new_asset_settings: {
      passthrough: uuidv4(),
      playback_policy: ['public'],
      video_quality: 'basic',
      static_renditions: [{ resolution: 'highest' }],
      master_access: 'temporary',
    },
  });

  return NextResponse.json({ uploadURL: upload.url, uploadId: upload.id });
};

export default createMuxUploadHandler;

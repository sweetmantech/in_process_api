import { NextResponse } from 'next/server';
import normalizeMetadata from '@/lib/metadata/normalizeMetadata';
import getMimeType from '@/lib/arweave/getMimeType';
import getMetadata from '@/lib/moment/getMetadata';
import getMomentAdmins from '@/lib/moment/getMomentAdmins';
import getMomentVideo from '@/lib/moment/getMomentVideo';
import { resolveMomentInfo } from '@/lib/moment/resolveMomentInfo';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import getZoraMediaInfo from '@/lib/viem/getZoraMediaInfo';
import { Moment } from '@/types/moment';

const getMomentHandler = async (moment: Moment) => {
  const collections = await selectCollections({
    addresses: [moment.collectionAddress],
    chainId: moment.chainId,
  });
  const collection = collections?.[0] ?? null;
  const protocol = collection?.protocol ?? null;

  const { uri, contentUri, owner, saleConfig, soldOut, id } =
    await resolveMomentInfo(moment);

  if (!uri) {
    return NextResponse.json(
      { error: 'Invalid moment URI provided' },
      { status: 404 }
    );
  }

  const [metadata, admins, video] = await Promise.all([
    getMetadata(id, uri),
    getMomentAdmins({ collection, owner, moment, protocol }),
    getMomentVideo(id),
  ]);

  let resolvedOwner = owner;
  if (protocol === 'zora_media') {
    if (admins[0]) {
      resolvedOwner = admins[0];
    } else {
      const { owner: onChainOwner } = await getZoraMediaInfo(moment);
      resolvedOwner = onChainOwner ?? owner;
    }
  }

  let normalizedMetadata = null;
  if (metadata) {
    normalizedMetadata = await normalizeMetadata(metadata);
    if (contentUri) {
      const mime = await getMimeType(contentUri);
      if (mime) normalizedMetadata.content = { mime, uri: contentUri };
      normalizedMetadata.animation_url = contentUri;
    }
  }

  const timeSoldOut = saleConfig
    ? saleConfig.saleEnd > 0 && saleConfig.saleEnd * 1000 < Date.now()
    : false;

  return NextResponse.json({
    id,
    uri,
    contentUri,
    owner: resolvedOwner,
    sale: saleConfig,
    soldOut: soldOut || timeSoldOut,
    protocol,
    admins,
    metadata: normalizedMetadata,
    video,
  });
};

export default getMomentHandler;

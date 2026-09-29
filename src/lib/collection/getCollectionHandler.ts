import { NextResponse } from 'next/server';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import selectAdmins from '@/lib/supabase/in_process_admins/selectAdmins';
import { fetchTokenMetadata } from '@/lib/protocolSdk/ipfs/token-metadata';

interface GetCollectionInput {
  collectionAddress: string;
  chainId: number;
}

const getCollectionHandler = async ({
  collectionAddress,
  chainId,
}: GetCollectionInput): Promise<NextResponse> => {
  const collections = await selectCollections({
    addresses: [collectionAddress],
    chainId,
    includeCreator: true,
  });
  const collection = collections?.[0] ?? null;

  if (!collection) throw new Error('Collection not found');

  let metadata = null;
  try {
    metadata = await fetchTokenMetadata(collection.uri);
  } catch (error) {
    console.error(error);
  }

  const admins = await selectAdmins({
    moments: [{ collectionId: collection.id, token_id: 0 }],
  });

  const uniqueAdmins = Array.from(
    new Set(admins.map((admin) => admin.artist_address))
  ).sort((b, a) => b.localeCompare(a));

  const { creator_wallet, ...collectionFields } = collection;

  return NextResponse.json({
    ...collectionFields,
    creator_username: creator_wallet?.artist?.username ?? null,
    metadata,
    admins: uniqueAdmins,
  });
};

export default getCollectionHandler;

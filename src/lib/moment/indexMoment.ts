import { getAddress, type Address } from 'viem';
import type { z } from 'zod';
import { CHAIN_ID } from '@/lib/consts';
import { createMomentSchema } from '@/lib/schema/createMomentSchema';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import findMoments from '@/lib/moment/findMoments';
import { upsertCollections } from '@/lib/supabase/in_process_collections/upsertCollections';
import { upsertMoments } from '@/lib/supabase/in_process_moments/upsertMoments';
import upsertMomentMetadataFromUri from './upsertMomentMetadataFromUri';

type CreateMomentContractInput = z.infer<typeof createMomentSchema>;

export type IndexMomentParams = {
  contractAddress: Address;
  tokenId: string;
  artistAddress: string;
  uri: string;
  chainId?: number;
  channel?: CreateMomentContractInput['channel'];
  maxSupply?: number;
};

const indexMoment = async ({
  contractAddress,
  tokenId,
  artistAddress,
  uri,
  channel,
  maxSupply,
  chainId = CHAIN_ID,
}: IndexMomentParams) => {
  const artist = getAddress(artistAddress).toLowerCase();
  const normalizedAddress = getAddress(contractAddress).toLowerCase();

  const collections = await selectCollections({
    addresses: [normalizedAddress],
    chainId,
  });

  const { data: existingMoments } = await findMoments({
    moments: [
      {
        collectionAddress: normalizedAddress as Address,
        tokenId,
        chainId,
      },
    ],
    chainId,
    limit: 1,
  });
  const existingMoment = existingMoments?.[0];

  let collectionId: string | undefined =
    collections?.[0]?.id ?? existingMoment?.collection.id;

  if (!collectionId) {
    await ensureWallets([artist]);
    const timestamp = new Date().toISOString();
    const upserted = await upsertCollections([
      {
        address: normalizedAddress,
        chain_id: chainId,
        creator: artist,
        protocol: 'in_process',
        created_at: timestamp,
        updated_at: timestamp,
        uri: '',
        name: '',
      },
    ]);
    collectionId = upserted[0]?.id;
  }

  if (!collectionId) return;

  const timestamp = new Date().toISOString();
  const upserted = await upsertMoments([
    {
      collection: collectionId,
      token_id: Number(tokenId),
      uri,
      max_supply: existingMoment ? existingMoment.max_supply : (maxSupply ?? 0),
      created_at: existingMoment ? existingMoment.created_at : timestamp,
      updated_at: timestamp,
      ...(!existingMoment && channel && { channel }),
    },
  ]);

  const momentId = existingMoment?.id ?? upserted[0]?.id;

  if (!momentId) return;

  await upsertMomentMetadataFromUri(momentId, uri);
};

export default indexMoment;

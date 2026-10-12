import { Address } from 'viem';
import { zoraCreator1155ImplABI } from '@zoralabs/protocol-deployments';
import { getPublicClient } from '@/lib/viem/publicClient';
import { Moment } from '@/types/moment';

const getCollectionOwner = async ({
  collectionAddress,
  chainId,
}: Moment): Promise<Address> => {
  const publicClient: any = getPublicClient(chainId);
  return publicClient.readContract({
    address: collectionAddress,
    abi: zoraCreator1155ImplABI,
    functionName: 'owner',
  });
};

export default getCollectionOwner;

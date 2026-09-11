import { Moment, MomentAdvancedInfo } from '@/types/moment';
import isCatalogContract from '@/lib/viem/isCatalogContract';
import isSoundContract from '@/lib/viem/isSoundContract';
import isZoraMediaContract from '@/lib/viem/isZoraMediaContract';
import getCatalogInfo from '@/lib/viem/getCatalogInfo';
import getSoundInfo from '@/lib/viem/getSoundInfo';
import getZoraMediaInfo from '@/lib/viem/getZoraMediaInfo';
import getInProcessMomentInfo from '@/lib/viem/getInProcessMomentInfo';
import { convertOnChainSaleToApi } from '@/lib/sales/convertOnChainSaleToApi';

const resolveMomentFromChain = async (
  moment: Moment
): Promise<MomentAdvancedInfo> => {
  const [isCatalog, isSound, isZoraMedia] = await Promise.all([
    isCatalogContract(moment.collectionAddress, moment.chainId),
    isSoundContract(moment.collectionAddress, moment.chainId),
    isZoraMediaContract(moment.collectionAddress, moment.chainId),
  ]);

  if (isZoraMedia) {
    const { owner, tokenUri, contentUri } = await getZoraMediaInfo(moment);
    return {
      id: null,
      uri: tokenUri,
      contentUri: contentUri ?? null,
      owner,
      saleConfig: null,
      soldOut: false,
    };
  }

  if (isCatalog) {
    const { owner, tokenUri } = await getCatalogInfo(moment);
    return {
      id: null,
      uri: tokenUri,
      contentUri: null,
      owner,
      saleConfig: null,
      soldOut: false,
    };
  }

  if (isSound) {
    const { owner, tokenUri } = await getSoundInfo(moment);
    return {
      id: null,
      uri: tokenUri,
      contentUri: null,
      owner,
      saleConfig: null,
      soldOut: false,
    };
  }

  const { saleConfig, owner, tokenUri } = await getInProcessMomentInfo(moment);
  return {
    id: null,
    uri: tokenUri,
    contentUri: null,
    owner,
    saleConfig: convertOnChainSaleToApi(saleConfig),
    // Unindexed In Process moments have no DB mint counter yet.
    soldOut: false,
  };
};

export default resolveMomentFromChain;

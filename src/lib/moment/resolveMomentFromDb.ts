import { Moment, MomentAdvancedInfo } from '@/types/moment';
import selectSale from '@/lib/supabase/in_process_sales/selectSale';
import { convertDatabaseSaleToApi } from '@/lib/sales/convertDatabaseSaleToApi';
import { convertOnChainSaleToApi } from '@/lib/sales/convertOnChainSaleToApi';
import getInProcessMomentInfo from '@/lib/viem/getInProcessMomentInfo';
import isDbMomentSoldOut from '@/lib/moment/isDbMomentSoldOut';
import selectMoments, {
  type MomentWithCollection,
} from '@/lib/supabase/in_process_moments/selectMoments';

type DbMoment = MomentWithCollection;

const resolveMomentFromDb = async (
  moment: Moment,
  dbMoment: DbMoment
): Promise<MomentAdvancedInfo> => {
  const protocol = dbMoment.collection.protocol;
  const isInProcess = protocol === 'in_process';
  const soldOut = isInProcess
    ? isDbMomentSoldOut({
        max_supply: dbMoment.max_supply,
        total_minted: dbMoment.total_minted,
      })
    : false;

  let saleConfig = null;
  if (isInProcess) {
    const sale = await selectSale(dbMoment.id);
    if (sale) {
      saleConfig = convertDatabaseSaleToApi(sale);
    } else {
      const info = await getInProcessMomentInfo(moment);
      saleConfig = convertOnChainSaleToApi(info.saleConfig);
    }
  }

  return {
    id: dbMoment.id,
    uri: dbMoment.uri,
    contentUri: null,
    owner: dbMoment.collection.creator,
    saleConfig,
    soldOut,
  };
};

export default resolveMomentFromDb;

import { Moment, MomentAdvancedInfo } from '@/types/moment';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import resolveMomentFromDb from '@/lib/moment/resolveMomentFromDb';
import resolveMomentFromChain from '@/lib/moment/resolveMomentFromChain';

export const resolveMomentInfo = async (
  moment: Moment
): Promise<MomentAdvancedInfo> => {
  const { data: moments } = await getMomentsByAddressAndTokenId({
    moments: [moment],
  });
  const dbMoment = moments?.[0] ?? null;

  if (dbMoment) return resolveMomentFromDb(moment, dbMoment);
  return resolveMomentFromChain(moment);
};

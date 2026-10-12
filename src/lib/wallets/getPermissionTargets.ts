import { Address } from 'viem';
import selectLinkedOperators from '@/lib/supabase/in_process_wallets/selectLinkedOperators';

const getPermissionTargets = async (
  adminAddress: Address
): Promise<Address[]> => {
  const { data, error } = await selectLinkedOperators(adminAddress);
  if (error) throw error;
  return [adminAddress, ...data.map((row) => row.address as Address)];
};

export default getPermissionTargets;

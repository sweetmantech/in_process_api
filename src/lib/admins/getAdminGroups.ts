import { Address } from 'viem';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import groupAdminsByArtist, { AdminGroup } from './groupAdminsByArtist';

const getAdminGroups = async (
  admins: Address[]
): Promise<AdminGroup[] | null> => {
  if (!admins.length) return [];
  try {
    const { data } = await selectWallets({ addresses: admins });
    return groupAdminsByArtist({ admins, wallets: data ?? [] });
  } catch (error) {
    console.error('❌ getAdminGroups failed:', error);
    return null;
  }
};

export default getAdminGroups;

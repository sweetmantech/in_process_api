import { supabase } from '@/lib/supabase/client';

const selectOperatorWallets = async (artistId: string) =>
  supabase
    .from('in_process_wallets')
    .select('address, eoa')
    .eq('artist', artistId)
    .eq('type', 'operator')
    .not('eoa', 'is', null);

export default selectOperatorWallets;

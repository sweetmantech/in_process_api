import { supabase } from '@/lib/supabase/client';

const selectLinkedOperators = async (eoa: string) =>
  supabase
    .from('in_process_wallets')
    .select('address')
    .eq('eoa', eoa.toLowerCase())
    .eq('type', 'operator');

export default selectLinkedOperators;

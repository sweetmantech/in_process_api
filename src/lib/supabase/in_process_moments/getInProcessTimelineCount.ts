import { supabase } from '@/lib/supabase/client';
import type { TimelineCountParams } from '@/types/moment';

const getInProcessTimelineCount = async ({
  chainId,
  hidden,
  mime,
  period,
  channel,
  curated,
  protocol,
}: TimelineCountParams) =>
  supabase.rpc('get_in_process_timeline_count', {
    p_chainid: chainId ?? undefined,
    p_hidden: hidden,
    p_mime: mime,
    p_period: period,
    p_channel: channel,
    p_curated: curated,
    p_protocol: protocol,
  });

export default getInProcessTimelineCount;

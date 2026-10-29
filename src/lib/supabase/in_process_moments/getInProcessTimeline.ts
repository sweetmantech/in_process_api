import { supabase } from '@/lib/supabase/client';
import type {
  GetInProcessTimelineParams,
  GetInProcessTimelineResponse,
} from '@/types/moment';

const getInProcessTimeline = async ({
  limit = 100,
  page = 1,
  chainId,
  hidden = false,
  mime,
  period,
  channel,
  curated = false,
  protocol,
  totalCount,
}: GetInProcessTimelineParams = {}): Promise<{
  data: GetInProcessTimelineResponse | null;
  error: Error | null;
}> => {
  const { data, error } = await supabase.rpc('get_in_process_timeline', {
    p_limit: limit,
    p_page: page,
    p_chainid: chainId as number | undefined,
    p_hidden: hidden,
    p_mime: mime,
    p_period: period,
    p_channel: channel,
    p_curated: curated,
    p_protocol: protocol,
    p_total_count: totalCount,
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: data as unknown as GetInProcessTimelineResponse,
    error: null,
  };
};

export default getInProcessTimeline;

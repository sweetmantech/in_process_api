import { supabase } from '@/lib/supabase/client';

const selectArtists = async ({
  ids,
  telegram,
  q,
  type = 'human',
  limit = 50,
  page = 1,
}: {
  ids?: string[];
  telegram?: string;
  q?: string;
  type?: 'human' | 'bot';
  limit?: number;
  page?: number;
} = {}) => {
  let query = supabase
    .from('in_process_artists')
    .select(
      'id, username, bio, x, telegram, instagram, default_collection, wallets:in_process_wallets!inner(*)',
      { count: 'exact' }
    );

  if (ids?.length) {
    query = query.in('id', ids);
  } else if (telegram) {
    query = query.eq('telegram', telegram.toLowerCase()).limit(1);
  } else if (q?.trim()) {
    query = query.ilike('username', `${q}%`).limit(limit);
  } else {
    query =
      type === 'human'
        ? query.not('username', 'is', null)
        : query.is('username', null);
    query = query.range((page - 1) * limit, page * limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    data: data ?? [],
    error: null,
    count: count ?? null,
  };
};

export default selectArtists;

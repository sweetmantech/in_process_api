import { NextResponse } from 'next/server';
import getInProcessTimeline from '@/lib/supabase/in_process_moments/getInProcessTimeline';
import getArtistTimeline from '@/lib/supabase/in_process_moments/getArtistTimeline';
import getCollectionTimeline from '@/lib/supabase/in_process_moments/getCollectionTimeline';
import { TIMELINE_CACHE_HEADERS } from '@/lib/timeline/timelineCache';

interface TimelineParams {
  limit: number;
  page: number;
  collection?: string;
  artist?: string;
  chainId: number | null;
  hidden: boolean;
  mime?: string;
  period?: string;
  channel?: string;
  type?: 'mutual' | 'default';
  protocol?: string;
  curated: boolean;
}

const getTimelineHandler = async ({
  limit,
  page,
  collection,
  artist,
  chainId,
  hidden,
  mime,
  period,
  channel,
  type,
  protocol,
  curated,
}: TimelineParams) => {
  if (collection) {
    const { data, error } = await getCollectionTimeline({
      collection,
      limit,
      page,
      chainId,
      hidden,
      mime,
      period,
      channel,
      artist,
      curated,
      protocol,
    });
    if (error)
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      );
    if (!data)
      return NextResponse.json(
        { status: 'error', message: 'No data returned' },
        { status: 500 }
      );
    return NextResponse.json(
      {
        status: 'success',
        moments: data.moments,
        pagination: data.pagination,
      },
      { headers: TIMELINE_CACHE_HEADERS }
    );
  }

  if (artist) {
    const { data, error } = await getArtistTimeline({
      artist,
      type: type || null,
      limit,
      page,
      chainId,
      hidden,
      mime,
      period,
      channel,
      curated,
      protocol,
    });
    if (error)
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      );
    if (!data)
      return NextResponse.json(
        { status: 'error', message: 'No data returned' },
        { status: 500 }
      );
    return NextResponse.json(
      {
        status: 'success',
        moments: data.moments,
        pagination: data.pagination,
      },
      { headers: TIMELINE_CACHE_HEADERS }
    );
  }

  const { data, error } = await getInProcessTimeline({
    limit,
    page,
    chainId,
    hidden,
    mime,
    period,
    channel,
    curated,
    protocol,
  });
  if (error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  if (!data)
    return NextResponse.json(
      { status: 'error', message: 'No data returned' },
      { status: 500 }
    );
  return NextResponse.json(
    {
      status: 'success',
      moments: data.moments,
      pagination: data.pagination,
    },
    { headers: TIMELINE_CACHE_HEADERS }
  );
};

export default getTimelineHandler;

import { NextResponse } from 'next/server';
import { executeIndexers } from '@/lib/indexer/executeIndexers';
import { indexers } from '@/lib/indexer/indexers';
import loadCachedTimestamps from '@/lib/redis/loadCachedTimestamps';
import saveCachedTimestamps from '@/lib/redis/saveCachedTimestamps';
import sleep from '@/lib/sleep';
import invalidateTimelineCache from '@/lib/timeline/invalidateTimelineCache';
import { INDEX_INTERVAL_MS, INDEX_INTERVAL_EMPTY_MS } from '@/lib/consts';

// Reserve a little headroom before Vercel's hard timeout so in-flight work can flush.
const SHUTDOWN_HEADROOM_MS = 2_000;

const runIndexerHandler = async (maxDurationSeconds: number) => {
  let cachedTimestamps = await loadCachedTimestamps();
  if (!cachedTimestamps) {
    console.log('⚡ No Redis cache found — fetching timestamps from Supabase');
    cachedTimestamps = {};
    const initialTimestamps = await Promise.all(
      indexers.map((i) => i.selectMaxTimestampFn())
    );
    for (let i = 0; i < indexers.length; i++) {
      cachedTimestamps[indexers[i].indexName] = initialTimestamps[i];
    }
    await saveCachedTimestamps(cachedTimestamps);
  }
  console.log(
    '🕐 Cached timestamps:',
    JSON.stringify(cachedTimestamps, null, 2)
  );

  const deadline =
    Date.now() + maxDurationSeconds * 1000 - SHUTDOWN_HEADROOM_MS;

  while (Date.now() < deadline) {
    try {
      const hasData = await executeIndexers(cachedTimestamps);
      if (hasData) {
        await saveCachedTimestamps(cachedTimestamps);
        await invalidateTimelineCache();
      }
      const sleepMs = hasData ? INDEX_INTERVAL_MS : INDEX_INTERVAL_EMPTY_MS;
      await sleep(Math.min(sleepMs, deadline - Date.now()));
    } catch (error) {
      console.warn('⚠️ Warn in indexer cycle:', error);
      await sleep(Math.min(INDEX_INTERVAL_MS, deadline - Date.now()));
    }
  }

  return NextResponse.json({ ok: true });
};

export default runIndexerHandler;

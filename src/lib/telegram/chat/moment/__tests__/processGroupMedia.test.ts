import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import processGroupMedia from '@/lib/telegram/chat/moment/processGroupMedia';

const afterCallbacks: Array<() => Promise<void> | void> = [];

vi.mock('next/server', () => ({
  after: vi.fn((cb: () => Promise<void> | void) => {
    afterCallbacks.push(cb);
  }),
}));

vi.mock('../createMomentsFromGroup', () => ({ default: vi.fn() }));
vi.mock('../postMomentPending', () => ({ default: vi.fn() }));

import createMomentsFromGroup from '@/lib/telegram/chat/moment/createMomentsFromGroup';
import postMomentPending from '@/lib/telegram/chat/moment/postMomentPending';

const MEDIA_GROUP_ID = 'group-1';
const THREAD_ID = 'thread-1';
const ACTIVITY_KEY = `${THREAD_ID}:media_group_activity:${MEDIA_GROUP_ID}`;
const PROCESSED_KEY = `${THREAD_ID}:media_group_processed:${MEDIA_GROUP_ID}`;

const ATTACHMENT = { type: 'image' as const, mimeType: 'image/jpeg' };
const ARTIST = { primaryWallet: '0xabc' };

const makeStateAdapter = () => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  setIfNotExists: vi.fn().mockResolvedValue(true),
  appendToList: vi.fn().mockResolvedValue(undefined),
});

const makeThread = (stateAdapter: ReturnType<typeof makeStateAdapter>) => ({
  post: vi.fn().mockResolvedValue(undefined),
  _stateAdapter: stateAdapter,
  id: THREAD_ID,
});

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.mocked(postMomentPending).mockResolvedValue(undefined as never);
  vi.mocked(createMomentsFromGroup).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('processGroupMedia', () => {
  it('re-arms the quiet-period deadline on every new arrival instead of firing at a fixed time', async () => {
    const stateAdapter = makeStateAdapter();
    const thread = makeThread(stateAdapter);

    // First photo lands at t=0.
    await processGroupMedia(
      thread as never,
      ATTACHMENT as never,
      'file-1',
      'title',
      ARTIST as never,
      MEDIA_GROUP_ID
    );
    expect(stateAdapter.set).toHaveBeenCalledWith(
      ACTIVITY_KEY,
      0,
      expect.any(Number)
    );

    stateAdapter.get.mockResolvedValue(0);
    const run = afterCallbacks[0]();

    // A second photo arrives at t=3000, sliding the activity key forward.
    await vi.advanceTimersByTimeAsync(3000);
    stateAdapter.get.mockResolvedValue(3000);

    // Old fixed deadline would have been 0 + 10000 = 10000. It must NOT fire there.
    await vi.advanceTimersByTimeAsync(6999); // t = 9999
    expect(createMomentsFromGroup).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1); // t = 10000: re-checks, sees activity=3000, keeps waiting
    expect(createMomentsFromGroup).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2999); // t = 12999: still before 3000 + 10000
    expect(createMomentsFromGroup).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1); // t = 13000: quiet for 10000ms since last activity
    await run;

    expect(createMomentsFromGroup).toHaveBeenCalledWith(
      thread,
      MEDIA_GROUP_ID,
      ARTIST
    );
  });

  it('only the caller that wins the media_group_processed lock triggers createMomentsFromGroup', async () => {
    const stateAdapter = makeStateAdapter();
    stateAdapter.setIfNotExists.mockImplementation(async (key: string) => {
      if (key === PROCESSED_KEY) return false;
      return true;
    });
    stateAdapter.get.mockResolvedValue(0);
    const thread = makeThread(stateAdapter);

    await processGroupMedia(
      thread as never,
      ATTACHMENT as never,
      'file-1',
      'title',
      ARTIST as never,
      MEDIA_GROUP_ID
    );

    const run = afterCallbacks[0]();
    await vi.advanceTimersByTimeAsync(10000);
    await run;

    expect(createMomentsFromGroup).not.toHaveBeenCalled();
  });

  it('posts the pending message only for the first attachment in the group', async () => {
    const stateAdapter = makeStateAdapter();
    stateAdapter.setIfNotExists.mockImplementation(async (key: string) => {
      if (key === `${THREAD_ID}:media_group:${MEDIA_GROUP_ID}`) return false;
      return true;
    });
    const thread = makeThread(stateAdapter);

    await processGroupMedia(
      thread as never,
      ATTACHMENT as never,
      'file-2',
      'title',
      ARTIST as never,
      MEDIA_GROUP_ID
    );

    expect(postMomentPending).not.toHaveBeenCalled();
  });
});

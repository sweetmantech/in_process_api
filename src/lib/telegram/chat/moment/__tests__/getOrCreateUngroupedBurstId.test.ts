import { describe, it, expect, vi, beforeEach } from 'vitest';
import getOrCreateUngroupedBurstId from '@/lib/telegram/chat/moment/getOrCreateUngroupedBurstId';

const makeThread = (stateAdapter: {
  setIfNotExists: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  set?: ReturnType<typeof vi.fn>;
}) => ({
  id: 'telegram:chat-abc',
  channelId: 'telegram:chat-abc',
  _stateAdapter: stateAdapter,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getOrCreateUngroupedBurstId', () => {
  it('returns a fresh burst id when no burst is active', async () => {
    const setIfNotExists = vi.fn().mockResolvedValue(true);
    const get = vi.fn();
    const thread = makeThread({ setIfNotExists, get });

    const burstId = await getOrCreateUngroupedBurstId(thread as never);

    expect(burstId).toContain('telegram:chat-abc');
    expect(setIfNotExists).toHaveBeenCalledWith(
      'telegram:chat-abc:ungrouped_burst:telegram:chat-abc',
      burstId,
      10_000
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('reuses the active burst id and slides its TTL forward when one already exists', async () => {
    const setIfNotExists = vi.fn().mockResolvedValue(false);
    const get = vi.fn().mockResolvedValue('telegram:chat-abc:existing-burst');
    const set = vi.fn().mockResolvedValue(undefined);
    const thread = makeThread({ setIfNotExists, get, set });

    const burstId = await getOrCreateUngroupedBurstId(thread as never);

    expect(burstId).toBe('telegram:chat-abc:existing-burst');
    expect(get).toHaveBeenCalledWith(
      'telegram:chat-abc:ungrouped_burst:telegram:chat-abc'
    );
    expect(set).toHaveBeenCalledWith(
      'telegram:chat-abc:ungrouped_burst:telegram:chat-abc',
      'telegram:chat-abc:existing-burst',
      10_000
    );
  });

  it('falls back to the candidate id if the existing value is missing/invalid, without sliding the TTL', async () => {
    const setIfNotExists = vi.fn().mockResolvedValue(false);
    const get = vi.fn().mockResolvedValue(null);
    const set = vi.fn().mockResolvedValue(undefined);
    const thread = makeThread({ setIfNotExists, get, set });

    const burstId = await getOrCreateUngroupedBurstId(thread as never);

    expect(burstId).toContain('telegram:chat-abc');
    expect(set).not.toHaveBeenCalled();
  });
});

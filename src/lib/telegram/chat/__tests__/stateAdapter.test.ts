import { describe, it, expect, vi } from 'vitest';
import getStateAdapter from '../stateAdapter';

const makeRawAdapter = () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  getList: vi.fn().mockResolvedValue([]),
  setIfNotExists: vi.fn().mockResolvedValue(true),
  appendToList: vi.fn().mockResolvedValue(undefined),
});

const makeThread = (id: string, stateAdapter: ReturnType<typeof makeRawAdapter>) => ({
  id,
  _stateAdapter: stateAdapter,
});

describe('getStateAdapter', () => {
  it('prefixes keys with the thread id so different chats never share a key', async () => {
    const raw = makeRawAdapter();
    const threadA = makeThread('chat-a', raw);
    const threadB = makeThread('chat-b', raw);

    await getStateAdapter(threadA as never).set('selected_collection_address', '0xA');
    await getStateAdapter(threadB as never).set('selected_collection_address', '0xB');

    expect(raw.set).toHaveBeenNthCalledWith(
      1,
      'chat-a:selected_collection_address',
      '0xA',
      undefined
    );
    expect(raw.set).toHaveBeenNthCalledWith(
      2,
      'chat-b:selected_collection_address',
      '0xB',
      undefined
    );
  });

  it('scopes every wrapped method the same way', async () => {
    const raw = makeRawAdapter();
    const thread = makeThread('chat-a', raw);
    const adapter = getStateAdapter(thread as never);

    await adapter.get('k');
    await adapter.delete('k');
    await adapter.getList('k');
    await adapter.setIfNotExists('k', 'v', 1000);
    await adapter.appendToList('k', 'v', { maxLength: 10 });

    expect(raw.get).toHaveBeenCalledWith('chat-a:k');
    expect(raw.delete).toHaveBeenCalledWith('chat-a:k');
    expect(raw.getList).toHaveBeenCalledWith('chat-a:k');
    expect(raw.setIfNotExists).toHaveBeenCalledWith('chat-a:k', 'v', 1000);
    expect(raw.appendToList).toHaveBeenCalledWith('chat-a:k', 'v', {
      maxLength: 10,
    });
  });
});

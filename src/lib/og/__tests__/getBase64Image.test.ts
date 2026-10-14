import { describe, it, expect, vi, beforeEach } from 'vitest';
import getBase64Image from '@/lib/og/getBase64Image';

vi.mock('@/lib/arweave/fetchUri');
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('jpeg-data')),
  }));
  return { default: mockSharp };
});

import fetchUri from '@/lib/arweave/fetchUri';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockFetchOk = () => {
  vi.mocked(fetchUri).mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as unknown as Response);
};

describe('getBase64Image', () => {
  it('returns null when imageUrl is undefined', async () => {
    const result = await getBase64Image(undefined);
    expect(result).toBeNull();
    expect(fetchUri).not.toHaveBeenCalled();
  });

  it('returns null when fetch response is not ok', async () => {
    vi.mocked(fetchUri).mockResolvedValue({ ok: false } as Response);

    const result = await getBase64Image('ar://abc123');
    expect(result).toBeNull();
  });

  it('returns a JPEG data URL on success', async () => {
    mockFetchOk();

    const result = await getBase64Image('ar://abc123');
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('returns null when an unexpected error is thrown', async () => {
    vi.mocked(fetchUri).mockRejectedValue(new Error('network error'));

    const result = await getBase64Image('ar://abc123');
    expect(result).toBeNull();
  });

  it('passes the url to fetchUri', async () => {
    mockFetchOk();

    await getBase64Image('ar://abc123');

    expect(fetchUri).toHaveBeenCalledWith('ar://abc123');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mux', () => ({
  default: { video: { assets: { retrieve: vi.fn() } } },
}));

import getMuxAssetAspectRatio from '../getMuxAssetAspectRatio';
import mux from '@/lib/mux';

const mockRetrieve = vi.mocked(mux.video.assets.retrieve);

describe('getMuxAssetAspectRatio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns the asset aspect ratio', async () => {
    mockRetrieve.mockResolvedValue({ aspect_ratio: '9:16' } as never);
    await expect(getMuxAssetAspectRatio('asset1')).resolves.toBe('9:16');
    expect(mockRetrieve).toHaveBeenCalledWith('asset1');
  });

  it('returns null when the asset has no aspect ratio yet', async () => {
    mockRetrieve.mockResolvedValue({} as never);
    await expect(getMuxAssetAspectRatio('asset1')).resolves.toBeNull();
  });

  it('returns null when the Mux request fails', async () => {
    mockRetrieve.mockRejectedValue(new Error('mux down'));
    await expect(getMuxAssetAspectRatio('asset1')).resolves.toBeNull();
  });
});

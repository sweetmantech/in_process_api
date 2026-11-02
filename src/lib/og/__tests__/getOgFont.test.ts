import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'fs/promises';
import getOgFont from '@/lib/og/getOgFont';

const mockReadFile = vi.mocked(readFile);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getOgFont', () => {
  it('reads the font file from the bundled assets folder', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('font') as never);

    const font = await getOgFont('Spectral-Italic.ttf');

    expect(mockReadFile).toHaveBeenCalledWith(
      path.join(process.cwd(), 'assets', 'fonts', 'Spectral-Italic.ttf')
    );
    expect(font.byteLength).toBe(4);
  });

  it('throws when the font file is missing', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: Missing.ttf'));

    await expect(getOgFont('Missing.ttf')).rejects.toThrow('Missing.ttf');
  });
});

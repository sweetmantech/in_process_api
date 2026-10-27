import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/in_process_hidden/selectHidden', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/supabase/in_process_hidden/insertHidden', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/supabase/in_process_hidden/deleteHidden', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/timeline/invalidateTimelineCache', () => ({
  default: vi.fn(),
}));

import invalidateTimelineCache from '@/lib/timeline/invalidateTimelineCache';
import selectHidden from '@/lib/supabase/in_process_hidden/selectHidden';
import insertHidden from '@/lib/supabase/in_process_hidden/insertHidden';
import deleteHidden from '@/lib/supabase/in_process_hidden/deleteHidden';
import hideMomentHandler from '@/lib/moment/hideMomentHandler';

const MOMENT_ID = 'a0000000-0000-4000-8000-000000000001';
const ARTIST_ID = 'b0000000-0000-4000-8000-000000000002';

const input = { momentId: MOMENT_ID, artistId: ARTIST_ID };

describe('hideMomentHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(insertHidden).mockResolvedValue({ error: null } as any);
    vi.mocked(deleteHidden).mockResolvedValue({ error: null } as any);
  });

  describe('when moment is not hidden', () => {
    beforeEach(() => {
      vi.mocked(selectHidden).mockResolvedValue({
        data: null,
        error: null,
      } as any);
    });

    it('calls insertHidden with momentId and artistId', async () => {
      await hideMomentHandler(input);
      expect(insertHidden).toHaveBeenCalledWith({
        moment: MOMENT_ID,
        artist: ARTIST_ID,
      });
    });

    it('does not call deleteHidden', async () => {
      await hideMomentHandler(input);
      expect(deleteHidden).not.toHaveBeenCalled();
    });

    it('invalidates the timeline cache', async () => {
      await hideMomentHandler(input);
      expect(invalidateTimelineCache).toHaveBeenCalledOnce();
    });

    it('returns success: true', async () => {
      const res = await hideMomentHandler(input);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ success: true });
    });
  });

  describe('when moment is already hidden', () => {
    beforeEach(() => {
      vi.mocked(selectHidden).mockResolvedValue({
        data: { id: 'c0000000-0000-0000-0000-000000000003' },
        error: null,
      } as any);
    });

    it('calls deleteHidden with momentId and artistId', async () => {
      await hideMomentHandler(input);
      expect(deleteHidden).toHaveBeenCalledWith({
        moment: MOMENT_ID,
        artist: ARTIST_ID,
      });
    });

    it('does not call insertHidden', async () => {
      await hideMomentHandler(input);
      expect(insertHidden).not.toHaveBeenCalled();
    });

    it('invalidates the timeline cache', async () => {
      await hideMomentHandler(input);
      expect(invalidateTimelineCache).toHaveBeenCalledOnce();
    });

    it('returns success: true', async () => {
      const res = await hideMomentHandler(input);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ success: true });
    });
  });

  it('calls selectHidden with momentId and artistId', async () => {
    vi.mocked(selectHidden).mockResolvedValue({
      data: null,
      error: null,
    } as any);
    await hideMomentHandler(input);
    expect(selectHidden).toHaveBeenCalledWith({
      moment: MOMENT_ID,
      artist: ARTIST_ID,
    });
  });
});

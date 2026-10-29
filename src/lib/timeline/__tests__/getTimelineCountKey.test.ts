import { describe, it, expect } from 'vitest';
import getTimelineCountKey from '@/lib/timeline/getTimelineCountKey';

describe('getTimelineCountKey', () => {
  it('builds a versioned key from all filters', () => {
    expect(
      getTimelineCountKey('3', {
        chainId: 8453,
        hidden: false,
        mime: 'image/%',
        period: 'week',
        channel: 'web',
        curated: true,
        protocol: 'in_process',
      })
    ).toBe(
      'timeline:count:v3:[8453,false,"image/%","week","web",true,"in_process"]'
    );
  });

  it('treats missing filters as null', () => {
    expect(
      getTimelineCountKey('0', { chainId: null, hidden: false, curated: true })
    ).toBe('timeline:count:v0:[null,false,null,null,null,true,null]');
  });
});

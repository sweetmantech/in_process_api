import { describe, it, expect } from 'vitest';
import handleSchema from '@/lib/schema/handleSchema';

describe('handleSchema', () => {
  it.each(['abc', 'dutchyyy', 'sofractures.eth', 'a_b-c.d', 'a'.repeat(30)])(
    'accepts %s',
    (handle) => {
      expect(handleSchema.safeParse(handle).success).toBe(true);
    }
  );

  it.each([
    'ab',
    'a'.repeat(31),
    'Abc',
    '.abc',
    'abc.',
    'abc_',
    'dúo',
    'crazzy wizard',
    '../admin',
    'a/b',
  ])('rejects invalid format %s', (handle) => {
    expect(handleSchema.safeParse(handle).success).toBe(false);
  });

  it('rejects handles starting with 0x', () => {
    const result = handleSchema.safeParse('0x80f8');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Handle cannot start with 0x');
  });

  it.each(['manage', 'admin', 'llms.txt', 'favicon.ico', 'logo.png'])(
    'rejects reserved handle %s',
    (handle) => {
      const result = handleSchema.safeParse(handle);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Handle is reserved');
    }
  );
});

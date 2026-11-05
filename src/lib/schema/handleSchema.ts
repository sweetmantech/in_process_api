import { z } from 'zod';
import RESERVED_HANDLES from '@/lib/artists/reservedHandles';

export const HANDLE_REGEX = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

const handleSchema = z.string().superRefine((handle, ctx) => {
  if (!HANDLE_REGEX.test(handle)) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Handle must be 3-30 characters of lowercase letters, numbers, ".", "_" or "-", and start and end with a letter or number',
    });
    return;
  }
  if (handle.startsWith('0x')) {
    ctx.addIssue({ code: 'custom', message: 'Handle cannot start with 0x' });
    return;
  }
  if (RESERVED_HANDLES.has(handle)) {
    ctx.addIssue({ code: 'custom', message: 'Handle is reserved' });
  }
});

export default handleSchema;

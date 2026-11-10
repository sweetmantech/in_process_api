import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/emails/validateEmailsQuery', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/emails/getEmailsHandler', () => ({
  default: vi.fn(),
}));

import validateEmailsQuery from '@/lib/emails/validateEmailsQuery';
import getEmailsHandler from '@/lib/emails/getEmailsHandler';
import { GET } from '../route';

describe('GET /api/emails', () => {
  it('returns a 500 with the message when the handler rejects', async () => {
    vi.mocked(validateEmailsQuery).mockResolvedValue({
      callerAddress: '0xadmin',
    } as any);
    vi.mocked(getEmailsHandler).mockRejectedValue(new Error('Bad Request'));

    const res = await GET(new NextRequest('http://localhost/api/emails'));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: 'Bad Request' });
  });
});

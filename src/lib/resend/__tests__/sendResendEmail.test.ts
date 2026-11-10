import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/resend/validateResendEnv', () => ({
  validateResendEnv: () => ({ apiKey: 'key', fromEmail: 'from@example.com' }),
}));

const send = vi.fn();
vi.mock('@/lib/resend/client', () => ({
  getResendClient: () => ({ emails: { send } }),
}));

import sendResendEmail from '../sendResendEmail';

const email = { to: 'to@example.com', subject: 'Hi', html: '<p>Hi</p>' };

describe('sendResendEmail', () => {
  beforeEach(() => {
    send.mockReset();
  });

  it('sends the email', async () => {
    send.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    await expect(sendResendEmail(email)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith({ from: 'from@example.com', ...email });
  });

  it('throws when Resend returns an error', async () => {
    send.mockResolvedValue({
      data: null,
      error: {
        name: 'validation_error',
        message: 'Invalid to',
        statusCode: 422,
      },
    });

    await expect(sendResendEmail(email)).rejects.toThrow(
      '[resend] validation_error: Invalid to'
    );
  });
});

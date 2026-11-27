import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/resend/sendResendEmail', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/media/buildImageProxyUrl', () => ({
  default: (uri: string) => `https://proxy.test/${uri}`,
}));

vi.mock('@/lib/consts', () => ({
  SHORT_CHAIN_NAME: { 8453: 'base' },
  SITE_ORIGINAL_URL: 'https://inprocess.world',
}));

import sendResendEmail from '@/lib/resend/sendResendEmail';
import sendAirdropEmailForTransfer from '../sendAirdropEmailForTransfer';

const moment = {
  token_id: 16,
  collection: {
    address: '0xCol',
    chain_id: 8453,
  },
  metadata: {
    name: 'Dawn',
    image: 'ar://image-hash',
  },
};

describe('sendAirdropEmailForTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendResendEmail).mockResolvedValue(undefined);
  });

  it('sends Resend email with subject, sender, moment, and collect link', async () => {
    await sendAirdropEmailForTransfer({
      to: 'recipient@example.com',
      senderAddress: '0xSender00000000000000000000000000000001',
      senderUsername: 'dúo',
      moment,
    });

    expect(sendResendEmail).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(sendResendEmail).mock.calls[0][0];
    expect(payload.to).toBe('recipient@example.com');
    expect(payload.subject).toBe(
      'In Process notification: you received an airdrop'
    );
    expect(payload.html).toContain('dúo');
    expect(payload.html).toContain(
      'https://inprocess.world/0xsender00000000000000000000000000000001'
    );
    expect(payload.html).toContain('Dawn');
    expect(payload.html).toContain(
      'https://inprocess.world/collect/base:0xcol/16'
    );
    expect(payload.html).toContain('https://proxy.test/ar://image-hash');
  });

  it('uses sender address when username is null', async () => {
    await sendAirdropEmailForTransfer({
      to: 'recipient@example.com',
      senderAddress: '0xSender00000000000000000000000000000001',
      senderUsername: null,
      moment: { ...moment, metadata: { name: null, image: null } },
    });

    const { html } = vi.mocked(sendResendEmail).mock.calls[0][0];
    expect(html).toContain('0xsender00000000000000000000000000000001');
    expect(html).not.toContain('<img');
  });

  it('logs and does not throw when Resend fails', async () => {
    const error = new Error('resend down');
    vi.mocked(sendResendEmail).mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(
      sendAirdropEmailForTransfer({
        to: 'recipient@example.com',
        senderAddress: '0xSender00000000000000000000000000000001',
        senderUsername: null,
        moment,
      })
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      '[resend] airdrop email send failed:',
      error
    );
    consoleError.mockRestore();
  });
});

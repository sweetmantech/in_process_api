import { describe, it, expect, vi, beforeEach } from 'vitest';

const getBalance = vi.fn();
const getFiatRates = vi.fn();

vi.mock('@/lib/arweave/turboClient', () => ({
  default: {
    getBalance: (...args: unknown[]) => getBalance(...args),
  },
  unauthTurboClient: {
    getFiatRates: (...args: unknown[]) => getFiatRates(...args),
  },
}));
vi.mock('@/lib/redis/redisClient', () => ({
  default: { set: vi.fn(), del: vi.fn() },
}));
vi.mock('@/lib/resend/sendResendEmail', () => ({ default: vi.fn() }));

import notifyLowTurboCredits from '@/lib/arweave/notifyLowTurboCredits';
import redisClient from '@/lib/redis/redisClient';
import sendResendEmail from '@/lib/resend/sendResendEmail';

const ALERT_KEY = 'arweave:low-credit-alerted';
const wincForCredits = (credits: number) =>
  (BigInt(credits) * BigInt(1_000_000_000_000)).toString();

beforeEach(() => {
  vi.clearAllMocks();
  getFiatRates.mockResolvedValue({
    winc: wincForCredits(2),
    fiat: { usd: 11.6 },
  });
  vi.stubEnv(
    'LOW_TURBO_CREDIT_ALERT_EMAILS',
    ' a@example.com, b@example.com ,'
  );
});

describe('notifyLowTurboCredits', () => {
  it('clears the alert key and skips the email when credits are above 10', async () => {
    getBalance.mockResolvedValue({ winc: wincForCredits(11) });

    const result = await notifyLowTurboCredits();

    expect(redisClient.del).toHaveBeenCalledWith(ALERT_KEY);
    expect(redisClient.set).not.toHaveBeenCalled();
    expect(sendResendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ credits: '11', alerted: false });
  });

  it('emails every configured recipient when credits are exactly 10', async () => {
    getBalance.mockResolvedValue({ winc: wincForCredits(10) });
    vi.mocked(redisClient.set).mockResolvedValue('OK');

    const result = await notifyLowTurboCredits();

    expect(redisClient.set).toHaveBeenCalledWith(ALERT_KEY, '10', {
      condition: 'NX',
      expiration: { type: 'EX', value: 86400 },
    });
    expect(sendResendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Arweave Turbo credits low: 10',
      })
    );
    const { html } = vi.mocked(sendResendEmail).mock.calls[0][0];
    expect(html).toContain('>10</span>');
    expect(html).toContain('&asymp; $58.00');
    expect(html).toContain('href="https://inprocess.world/arweave"');
    expect(result).toEqual({ credits: '10', alerted: true });
  });

  it('skips the email when an alert was already sent within the cooldown', async () => {
    getBalance.mockResolvedValue({ winc: wincForCredits(3) });
    vi.mocked(redisClient.set).mockResolvedValue(null);

    const result = await notifyLowTurboCredits();

    expect(sendResendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ credits: '3', alerted: false });
  });

  it('skips the email without claiming the key when no recipients are set', async () => {
    vi.stubEnv('LOW_TURBO_CREDIT_ALERT_EMAILS', '');
    getBalance.mockResolvedValue({ winc: wincForCredits(1) });

    const result = await notifyLowTurboCredits();

    expect(redisClient.set).not.toHaveBeenCalled();
    expect(sendResendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ credits: '1', alerted: false });
  });

  it('releases the alert key when the email fails so the next run retries', async () => {
    getBalance.mockResolvedValue({ winc: wincForCredits(2) });
    vi.mocked(redisClient.set).mockResolvedValue('OK');
    vi.mocked(sendResendEmail).mockRejectedValue(new Error('resend down'));

    await expect(notifyLowTurboCredits()).rejects.toThrow('resend down');
    expect(redisClient.del).toHaveBeenCalledWith(ALERT_KEY);
  });
});

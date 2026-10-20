import { formatUnits, parseUnits } from 'viem';
import turboClient, { unauthTurboClient } from './turboClient';
import redisClient from '@/lib/redis/redisClient';
import sendResendEmail from '@/lib/resend/sendResendEmail';
import getLowTurboCreditAlertEmails from './getLowTurboCreditAlertEmails';
import buildLowTurboCreditHtml from '@/lib/emails/buildLowTurboCreditHtml';
import { telegramChatBotClient } from '@/lib/telegram/client';
import getLowTurboCreditAlertTelegramChatIds from './getLowTurboCreditAlertTelegramChatIds';
import {
  LOW_TURBO_CREDIT_ALERT_KEY,
  LOW_TURBO_CREDIT_THRESHOLD,
  SITE_ORIGINAL_URL,
} from '@/lib/consts';

const WINC_DECIMALS = 12;
const ALERT_COOLDOWN_SECONDS = 24 * 60 * 60;

const notifyLowTurboCredits = async () => {
  const { winc } = await turboClient.getBalance();
  const credits = formatUnits(BigInt(winc), WINC_DECIMALS);
  const thresholdWinc = parseUnits(
    String(LOW_TURBO_CREDIT_THRESHOLD),
    WINC_DECIMALS
  );

  if (BigInt(winc) > thresholdWinc) {
    await redisClient.del(LOW_TURBO_CREDIT_ALERT_KEY);
    return { credits, alerted: false };
  }

  const claimed = await redisClient.set(LOW_TURBO_CREDIT_ALERT_KEY, credits, {
    condition: 'NX',
    expiration: { type: 'EX', value: ALERT_COOLDOWN_SECONDS },
  });
  if (!claimed) return { credits, alerted: false };

  try {
    const rates = await unauthTurboClient.getFiatRates();
    const usd = (Number(winc) / Number(rates.winc)) * rates.fiat.usd;
    const displayCredits = Number(credits).toLocaleString('en-US', {
      maximumFractionDigits: 4,
    });
    const displayUsd = usd.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const topupUrl = `${SITE_ORIGINAL_URL}/arweave`;

    const telegramText = `Arweave Turbo credits low: ${displayCredits} credits (≈ $${displayUsd} USD)\nTop up: ${topupUrl}`;
    const telegramResults = await Promise.allSettled(
      getLowTurboCreditAlertTelegramChatIds().map((chatId) =>
        telegramChatBotClient.sendMessage(chatId, telegramText)
      )
    );
    telegramResults
      .filter((r) => r.status === 'rejected')
      .forEach((r) =>
        console.error('[notifyLowTurboCredits] telegram send failed:', r.reason)
      );

    const recipients = getLowTurboCreditAlertEmails();
    if (recipients.length === 0) {
      console.error(
        '[notifyLowTurboCredits] LOW_TURBO_CREDIT_ALERT_EMAILS is not set'
      );
    } else {
      await sendResendEmail({
        to: recipients,
        subject: `Arweave Turbo credits low: ${displayCredits}`,
        html: buildLowTurboCreditHtml({
          credits: displayCredits,
          usd: displayUsd,
          topupUrl,
        }),
      });
    }
  } catch (e) {
    await redisClient.del(LOW_TURBO_CREDIT_ALERT_KEY);
    throw e;
  }

  return { credits, alerted: true };
};

export default notifyLowTurboCredits;

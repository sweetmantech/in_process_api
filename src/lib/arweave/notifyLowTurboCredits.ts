import { formatUnits, parseUnits } from 'viem';
import turboClient from './turboClient';
import redisClient from '@/lib/redis/redisClient';
import sendResendEmail from '@/lib/resend/sendResendEmail';
import getLowTurboCreditAlertEmails from './getLowTurboCreditAlertEmails';
import {
  LOW_TURBO_CREDIT_ALERT_KEY,
  LOW_TURBO_CREDIT_THRESHOLD,
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

  const recipients = getLowTurboCreditAlertEmails();
  if (recipients.length === 0) {
    console.error(
      '[notifyLowTurboCredits] LOW_TURBO_CREDIT_ALERT_EMAILS is not set'
    );
    return { credits, alerted: false };
  }

  const claimed = await redisClient.set(LOW_TURBO_CREDIT_ALERT_KEY, credits, {
    condition: 'NX',
    expiration: { type: 'EX', value: ALERT_COOLDOWN_SECONDS },
  });
  if (!claimed) return { credits, alerted: false };

  const address = await turboClient.signer.getNativeAddress();
  try {
    await sendResendEmail({
      to: recipients,
      subject: `Arweave Turbo credits low: ${credits}`,
      html: `<p>Turbo credit balance is ${credits}, at or below the threshold of ${LOW_TURBO_CREDIT_THRESHOLD}.</p><p>Arweave address: ${address}</p>`,
    });
  } catch (e) {
    await redisClient.del(LOW_TURBO_CREDIT_ALERT_KEY);
    throw e;
  }

  return { credits, alerted: true };
};

export default notifyLowTurboCredits;
